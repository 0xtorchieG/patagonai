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

    constructor(address _pythAddress, address _tokenAddress) {
        pyth = IPyth(_pythAddress);
        token = IERC20(_tokenAddress);
    }
}
