import { Tool } from "@langchain/core/tools";
import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { readContract } from "@coinbase/coinbase-sdk";
import { Abi, Address } from "viem";
import rawContractABI from "../contracts/predictionMarket.json";
const contractABI = rawContractABI as Abi;

export class PredictionMarketTool extends Tool {
  name = "prediction_market";
  description = `Interact with prediction market contract. Available commands:
    - getMarketInfo <marketId>
    - getActiveMarketId <stockTicker>
    - getMarketStatus <marketId>
    - getMarketPrices <marketId>
    - getUserPosition <marketId> <userAddress>
    - getMarketsCount
    - takePosition <marketId> <position> <shares>
    - claimPayout <marketId>
    - calculatePotentialPayout <marketId> <shares> <position>`;
  
  private agentkit: CdpAgentkit;
  private contractAddress = "0x4c5885D0bd88CF56072B4Ba371825b2DC09E436E" as Address;

  constructor(agentkit: CdpAgentkit) {
    super();
    this.agentkit = agentkit;
  }

  async _call(input: string): Promise<string> {
    try {
      const [command, ...args] = input.split(" ");
      const wallet = await this.agentkit.getWallet();
      const networkId = process.env.NETWORK_ID || "base-sepolia";

      switch (command.toLowerCase()) {
        case "getmarketinfo": {
          const marketId = args[0];
          const result = await readContract({
            networkId: networkId,
            abi: contractABI,
            contractAddress: this.contractAddress,
            method: "getMarketInfo",
            args: { marketId }
          });
          return JSON.stringify(result);
        }

        case "getactivemarketid": {
          const stockTicker = args[0];
          const result = await wallet.contract.read(
            this.contractAddress,
            contractABI,
            "getActiveMarketId",
            [stockTicker]
          );
          return JSON.stringify({
            marketId: result[0].toString(),
            exists: result[1]
          });
        }

        case "getmarketstatus": {
          const marketId = args[0];
          const result = await wallet.contract.read(
            this.contractAddress,
            contractABI,
            "getMarketStatus",
            [marketId]
          );
          return JSON.stringify({
            outcome: result[0],
            isEnded: result[1],
            startPrice: result[2].toString(),
            pythPriceId: result[3]
          });
        }

        case "getmarketprices": {
          const marketId = args[0];
          const result = await wallet.contract.read(
            this.contractAddress,
            contractABI,
            "getMarketPrices",
            [marketId]
          );
          return JSON.stringify({
            buyPrice: result[0].toString(),
            holdPrice: result[1].toString(),
            sellPrice: result[2].toString()
          });
        }

        case "getuserposition": {
          const [marketId, userAddress] = args;
          const result = await wallet.contract.read(
            this.contractAddress,
            contractABI,
            "getUserPosition",
            [marketId, userAddress]
          );
          return JSON.stringify({
            buyShares: result[0].toString(),
            holdShares: result[1].toString(),
            sellShares: result[2].toString(),
            hasClaimed: result[3]
          });
        }

        case "getmarketscount": {
          const result = await wallet.contract.read(
            this.contractAddress,
            contractABI,
            "getMarketsCount",
            []
          );
          return result.toString();
        }

        case "takeposition": {
          const [marketId, position, shares] = args;
          const contractInvocation = await wallet.invokeContract({
            contractAddress: this.contractAddress,
            method: "takePosition",
            args: { marketId, position, shares },
            abi: contractABI
          });
          await contractInvocation.wait();
          return "Position taken successfully";
        }

        case "claimpayout": {
          const marketId = args[0];
          await wallet.contract.write(
            this.contractAddress,
            contractABI,
            "claimPayout",
            [marketId]
          );
          return "Payout claimed successfully";
        }

        case "calculatepotentialpayout": {
          const [marketId, shares, position] = args;
          const result = await wallet.contract.read(
            this.contractAddress,
            contractABI,
            "calculatePotentialPayout",
            [marketId, shares, position]
          );
          return `Potential payout: ${result.toString()}`;
        }

        default:
          return `Unknown command. ${this.description}`;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        return `Error: ${error.message}`;
      }
      return "An unknown error occurred";
    }
  }
} 