import { Tool } from "@langchain/core/tools";
import { ContractInvocation, readContract } from "@coinbase/coinbase-sdk";
import { Abi, Address } from "viem";
import contractABI from "../contracts/predictionMarket.json";

export class PredictionMarketTool extends Tool {
  name = "prediction_market";
  description = `Interact with prediction market contract. Available commands:
    - getMarketInfo <marketId>
    - getActiveMarketId <stockTicker>
    - getMarketStatus <marketId>
    - takePosition <marketId> <position> <shares>
    - claimPayout <marketId>`;

  private wallet: any;
  private networkId: string;  // Using any for now since we're getting it from AgentKit
  private contractAddress: Address;
  private contractAbi: Abi;

  constructor(wallet: any) {
    super();
    this.wallet = wallet;
    this.contractAddress = "0x4c5885D0bd88CF56072B4Ba371825b2DC09E436E" as Address;
    this.contractAbi = contractABI as Abi;
    this.networkId = "base-sepolia"
  }

  private serializeBigInt(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return obj.toString();
    if (Array.isArray(obj)) return obj.map(item => this.serializeBigInt(item));
    if (typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, this.serializeBigInt(value)])
      );
    }
    return obj;
  }

  async _call(input: string): Promise<string> {
    try {
      const [command, ...args] = input.split(" ");

      switch (command.toLowerCase()) {
        case "takeposition": {
          const [marketId, position, shares] = args;
          const invocation = await this.wallet.invokeContract({
            contractAddress: this.contractAddress,
            method: "takePosition",
            args: { 
              marketId: BigInt(marketId), 
              position, 
              shares 
            },
            abi: this.contractAbi
          }) as ContractInvocation;

          const result = await invocation.wait({
            intervalSeconds: 1,
            timeoutSeconds: 30
          });

          return `Position taken successfully.\nTransaction hash: ${result.getTransactionHash()}\nTransaction link: ${result.getTransactionLink()}`;
        }

        case "getmarketinfo": {
          const marketId = BigInt(args[0]);
          const result = await readContract({
            networkId: this.networkId,
            contractAddress: this.contractAddress,
            method: "getMarketInfo",
            args: [marketId],
            abi: this.contractAbi
          });
          
          const serialized = this.serializeBigInt(result);
          return JSON.stringify(serialized, null, 2);
        }

        case "getactivemarketid": {
          const stockTicker = args[0].toUpperCase();
          const result = await readContract({
            networkId: this.networkId,
            contractAddress: this.contractAddress,
            method: "getActiveMarketId",
            args: [stockTicker],
            abi: this.contractAbi
          });
          
          const serialized = this.serializeBigInt(result);
          if (!serialized) {
            return `No active market found for ${stockTicker}`;
          }
          return JSON.stringify(serialized, null, 2);
        }

        case "getmarketstatus": {
          const marketId = BigInt(args[0]);
          const result = await readContract({
            networkId: this.networkId,
            contractAddress: this.contractAddress,
            method: "getMarketStatus",
            args: [marketId],
            abi: this.contractAbi
          });
          
          const serialized = this.serializeBigInt(result);
          return JSON.stringify(serialized, null, 2);
        }

        case "claimpayout": {
          const marketId = args[0];
          const invocation = await this.wallet.invokeContract({
            contractAddress: this.contractAddress,
            method: "claimPayout",
            args: { marketId },
            abi: this.contractAbi
          }) as ContractInvocation;

          const result = await invocation.wait({
            intervalSeconds: 1,
            timeoutSeconds: 30
          });

          return `Payout claimed successfully.\nTransaction hash: ${result.getTransactionHash()}\nTransaction link: ${result.getTransactionLink()}`;
        }

        default:
          return `Unknown command. ${this.description}`;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Contract error:", error);
        return `Error interacting with contract: ${error.message}`;
      }
      return "An unknown error occurred";
    }
  }
} 