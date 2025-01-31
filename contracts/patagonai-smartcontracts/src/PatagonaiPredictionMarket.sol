// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@thirdweb-dev/contracts/eip/interface/IERC20.sol";
import {Ownable} from "@thirdweb-dev/contracts/extension/Ownable.sol";
import {ReentrancyGuard} from "@thirdweb-dev/contracts/external-deps/openzeppelin/security/ReentrancyGuard.sol";
import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

contract PatagonaiPredictionMarket is Ownable, ReentrancyGuard {
    IPyth public pyth;
    IERC20 public immutable token;
    uint256 private constant MIN_PRICE = 1e16; // 0.01 in 1e18 scale

    enum MarketOutcome { UNDECIDED, BUY, HOLD, SELL }
    
    struct Market {
        string stockTicker;
        bytes32 pythPriceId;
        MarketOutcome outcome;
        int64 startPrice;
        uint256 endTime;
        uint256 totalPoolValue;
        uint256 totalShares;
        mapping(MarketOutcome => uint256) shares;
        mapping(MarketOutcome => mapping(address => uint256)) userShares;
        mapping(address => bool) hasClaimed;
    }

    Market[] public markets;
    
    event MarketCreated(uint256 indexed marketId, string stockTicker, uint256 endTime);
    event PositionTaken(uint256 indexed marketId, address indexed user, MarketOutcome position, uint256 shares);
    event MarketResolved(uint256 indexed marketId, MarketOutcome outcome);
    event RewardClaimed(uint256 indexed marketId, address indexed user, uint256 amount);

    function _canSetOwner() internal view virtual override returns (bool) {
        return msg.sender == owner();
    }

    constructor(address _pythAddress, address _tokenAddress) {
        pyth = IPyth(_pythAddress);
        token = IERC20(_tokenAddress);
    }

    modifier noActiveMarket(string memory stockTicker) {
        bool hasActiveMarket = false;
        for (uint256 i = 0; i < markets.length; i++) {
            Market storage market = markets[i];
            if (keccak256(bytes(market.stockTicker)) == keccak256(bytes(stockTicker)) && 
                block.timestamp < market.endTime &&
                market.outcome == MarketOutcome.UNDECIDED) {
                hasActiveMarket = true;
                break;
            }
        }
        require(!hasActiveMarket, "Active market exists");
        _;
    }

    function createMarket(
        string memory _stockTicker,
        bytes32 _pythPriceId,
        uint256 _endTime
    ) external onlyOwner noActiveMarket(_stockTicker) {
        require(_endTime > block.timestamp, "End time must be future");
        
        PythStructs.Price memory currentPrice = pyth.getPriceNoOlderThan(_pythPriceId, 86400);
        require(currentPrice.price != 0, "Invalid Pyth price");
        
        Market storage newMarket = markets.push();
        newMarket.stockTicker = _stockTicker;
        newMarket.pythPriceId = _pythPriceId;
        newMarket.startPrice = currentPrice.price;
        newMarket.endTime = _endTime;
        
        emit MarketCreated(markets.length - 1, _stockTicker, _endTime);
    }

    function getMarketPrices(uint256 marketId) public view returns (uint256 buyPrice, uint256 holdPrice, uint256 sellPrice) {
        Market storage market = markets[marketId];
        
        // If no shares have been purchased yet, return minimum price for all positions
        if (market.totalShares == 0) {
            return (MIN_PRICE, MIN_PRICE, MIN_PRICE);
        }

        // Calculate prices as percentages of total shares (in 1e18 scale)
        buyPrice = (market.shares[MarketOutcome.BUY] * 1e18) / market.totalShares;
        holdPrice = (market.shares[MarketOutcome.HOLD] * 1e18) / market.totalShares;
        sellPrice = (market.shares[MarketOutcome.SELL] * 1e18) / market.totalShares;

        // Ensure minimum prices
        buyPrice = buyPrice > MIN_PRICE ? buyPrice : MIN_PRICE;
        holdPrice = holdPrice > MIN_PRICE ? holdPrice : MIN_PRICE;
        sellPrice = sellPrice > MIN_PRICE ? sellPrice : MIN_PRICE;
    }

    function takePosition(uint256 marketId, MarketOutcome position, uint256 numberOfShares) external {
        Market storage market = markets[marketId];
        require(block.timestamp < market.endTime, "Market ended");
        require(position != MarketOutcome.UNDECIDED, "Invalid position");
        
        // Get current prices for all positions
        (uint256 buyPrice, uint256 holdPrice, uint256 sellPrice) = getMarketPrices(marketId);
        
        // Determine the correct price based on position
        uint256 positionPrice;
        if (position == MarketOutcome.BUY) {
            positionPrice = buyPrice;
        } else if (position == MarketOutcome.HOLD) {
            positionPrice = holdPrice;
        } else {
            positionPrice = sellPrice;
        }
        
        // Calculate amount of tokens needed based on shares and price
        uint256 amount = (numberOfShares * positionPrice) / 1e18;
        require(amount > 0, "Amount too small");
        
        market.shares[position] += numberOfShares;
        market.userShares[position][msg.sender] += numberOfShares;
        market.totalShares += numberOfShares;
        market.totalPoolValue += amount;
        
        token.transferFrom(msg.sender, address(this), amount);
        emit PositionTaken(marketId, msg.sender, position, numberOfShares);
    }

    function resolveMarket(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        require(block.timestamp >= market.endTime, "Market not ended");
        require(market.outcome == MarketOutcome.UNDECIDED, "Market already resolved");

        // Get the final price from Pyth
        PythStructs.Price memory finalPrice = pyth.getPriceNoOlderThan(market.pythPriceId, 86400);
        require(finalPrice.price != 0, "Invalid Pyth price");

        // Calculate price change percentage (multiplied by 100 to get actual percentage)
        int256 priceChange = ((finalPrice.price - market.startPrice) * 100) / market.startPrice;

        // Determine outcome based on price change
        // priceChange > 1% (100 basis points) -> BUY
        // priceChange < -1% (-100 basis points) -> SELL
        // -1% <= priceChange <= 1% -> HOLD
        if (priceChange > 100) {
            market.outcome = MarketOutcome.BUY;
        } else if (priceChange < -100) {
            market.outcome = MarketOutcome.SELL;
        } else {
            market.outcome = MarketOutcome.HOLD;
        }

        emit MarketResolved(marketId, market.outcome);
    }


    function claimPayout(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(market.outcome != MarketOutcome.UNDECIDED, "Not resolved");
        require(!market.hasClaimed[msg.sender], "Already claimed");
        
        uint256 winningShares = market.userShares[market.outcome][msg.sender];
        if (winningShares > 0) {
            uint256 payout = (winningShares * market.totalPoolValue) / market.shares[market.outcome];
            market.hasClaimed[msg.sender] = true;
            token.transfer(msg.sender, payout);
        }
    }


    function getMarketInfo(uint256 marketId) external view returns (
        string memory stockTicker,
        uint256 endTime,
        uint256 totalPoolValue,
        uint256[3] memory shareAmounts
    ) {
        Market storage market = markets[marketId];
        return (
            market.stockTicker,
            market.endTime,
            market.totalPoolValue,
            [
                market.shares[MarketOutcome.BUY],
                market.shares[MarketOutcome.HOLD],
                market.shares[MarketOutcome.SELL]
            ]
        );
    }

    // Get total number of markets
    function getMarketsCount() external view returns (uint256) {
        return markets.length;
    }

    // Get user's position details for a specific market
    function getUserPosition(uint256 marketId, address user) external view returns (
        uint256 buyShares,
        uint256 holdShares,
        uint256 sellShares,
        bool hasClaimed
    ) {
        Market storage market = markets[marketId];
        return (
            market.userShares[MarketOutcome.BUY][user],
            market.userShares[MarketOutcome.HOLD][user],
            market.userShares[MarketOutcome.SELL][user],
            market.hasClaimed[user]
        );
    }

    // Get market status and outcome
    function getMarketStatus(uint256 marketId) external view returns (
        MarketOutcome outcome,
        bool isEnded,
        int64 startPrice,
        bytes32 pythPriceId
    ) {
        Market storage market = markets[marketId];
        return (
            market.outcome,
            block.timestamp >= market.endTime,
            market.startPrice,
            market.pythPriceId
        );
    }

    // Calculate potential payout if user wins
    function calculatePotentialPayout(uint256 marketId, uint256 numberOfShares, MarketOutcome position) external view returns (uint256) {
        Market storage market = markets[marketId];
        uint256 hypotheticalWinningShares = market.shares[position] + numberOfShares;
        return (numberOfShares * market.totalPoolValue) / hypotheticalWinningShares;
    }

    // Check if an active market exists for a specific stock ticker
    function getActiveMarketId(string memory stockTicker) external view returns (uint256 marketId, bool exists) {
        for (uint256 i = 0; i < markets.length; i++) {
            Market storage market = markets[i];
            // Compare strings and check if market is still active
            if (keccak256(bytes(market.stockTicker)) == keccak256(bytes(stockTicker)) && 
                block.timestamp < market.endTime &&
                market.outcome == MarketOutcome.UNDECIDED) {
                return (i, true);
            }
        }
        return (0, false);
    }
}
