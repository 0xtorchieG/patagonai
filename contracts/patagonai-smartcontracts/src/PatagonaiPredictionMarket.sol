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

    constructor(address _pythAddress, address _tokenAddress) {
        pyth = IPyth(_pythAddress);
        token = IERC20(_tokenAddress);
    }

    function createMarket(
        string memory _stockTicker,
        bytes32 _pythPriceId,
        uint256 _endTime
    ) external onlyOwner {
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

    function calculateShares(uint256 amount, uint256 price) internal pure returns (uint256) {
        return (amount * 1e18) / (price > MIN_PRICE ? price : MIN_PRICE);
    }


    function takePosition(uint256 marketId, MarketOutcome position, uint256 amount) external {
        Market storage market = markets[marketId];
        require(block.timestamp < market.endTime, "Market ended");
        require(position != MarketOutcome.UNDECIDED, "Invalid position");
        
        // Get current prices for all positions
        (uint256 buyPrice, uint256 holdPrice, uint256 sellPrice) = getMarketPrices(marketId); //TODO getMarketPrices
        
        // Determine the correct price based on position
        uint256 positionPrice;
        if (position == MarketOutcome.BUY) {
            positionPrice = buyPrice;
        } else if (position == MarketOutcome.HOLD) {
            positionPrice = holdPrice;
        } else {
            positionPrice = sellPrice;
        }
        
        uint256 shares = calculateShares(amount, positionPrice);
        market.shares[position] += shares;
        market.userShares[position][msg.sender] += shares;
        market.totalShares += shares;
        market.totalPoolValue += amount;
        
        token.transferFrom(msg.sender, address(this), amount);
        emit PositionTaken(marketId, msg.sender, position, shares);
    }
}
