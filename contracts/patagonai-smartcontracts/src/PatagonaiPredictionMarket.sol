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
}
