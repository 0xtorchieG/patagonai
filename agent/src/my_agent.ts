import { CdpAgentkit } from "@coinbase/cdp-agentkit-core";
import { CdpToolkit, CdpTool } from "@coinbase/cdp-langchain";
import { FinnhubTool } from "./tools/FinnhubTool";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { Coinbase, Wallet, readContract} from "@coinbase/coinbase-sdk";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as readline from "readline";
import { z } from "zod";
import { Abi, getContractAddress } from "viem";
import { PythStockFeedTool } from "./tools/PythStockFeedTool";

dotenv.config();

// Configure Coinbase SDK
Coinbase.configure({ 
  apiKeyName: process.env.CDP_API_KEY_NAME || '', 
  privateKey: process.env.CDP_API_KEY_PRIVATE_KEY || '',
  useServerSigner: true 
});

const PREDICTION_MARKET_ADDRESS = "0x4c5885D0bd88CF56072B4Ba371825b2DC09E436E";
const CONTRACT_ABI = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_pythAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_tokenAddress",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "OwnableUnauthorized",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "stockTicker",
          "type": "string"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        }
      ],
      "name": "MarketCreated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "enum PatagonaiPredictionMarket.MarketOutcome",
          "name": "outcome",
          "type": "uint8"
        }
      ],
      "name": "MarketResolved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "prevOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnerUpdated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum PatagonaiPredictionMarket.MarketOutcome",
          "name": "position",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "shares",
          "type": "uint256"
        }
      ],
      "name": "PositionTaken",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "user",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "RewardClaimed",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "numberOfShares",
          "type": "uint256"
        },
        {
          "internalType": "enum PatagonaiPredictionMarket.MarketOutcome",
          "name": "position",
          "type": "uint8"
        }
      ],
      "name": "calculatePotentialPayout",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "claimPayout",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "_stockTicker",
          "type": "string"
        },
        {
          "internalType": "bytes32",
          "name": "_pythPriceId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_endTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_buyConsensus",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_holdConsensus",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_sellConsensus",
          "type": "uint256"
        }
      ],
      "name": "createMarket",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "string",
          "name": "stockTicker",
          "type": "string"
        }
      ],
      "name": "getActiveMarketId",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "exists",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "getMarketInfo",
      "outputs": [
        {
          "internalType": "string",
          "name": "stockTicker",
          "type": "string"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalPoolValue",
          "type": "uint256"
        },
        {
          "internalType": "uint256[3]",
          "name": "shareAmounts",
          "type": "uint256[3]"
        },
        {
          "internalType": "uint256[3]",
          "name": "consensusAmounts",
          "type": "uint256[3]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "getMarketPrices",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "buyPrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "holdPrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "sellPrice",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "getMarketStatus",
      "outputs": [
        {
          "internalType": "enum PatagonaiPredictionMarket.MarketOutcome",
          "name": "outcome",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "isEnded",
          "type": "bool"
        },
        {
          "internalType": "int64",
          "name": "startPrice",
          "type": "int64"
        },
        {
          "internalType": "bytes32",
          "name": "pythPriceId",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getMarketsCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "user",
          "type": "address"
        }
      ],
      "name": "getUserPosition",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "buyShares",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "holdShares",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "sellShares",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "hasClaimed",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "markets",
      "outputs": [
        {
          "internalType": "string",
          "name": "stockTicker",
          "type": "string"
        },
        {
          "internalType": "bytes32",
          "name": "pythPriceId",
          "type": "bytes32"
        },
        {
          "internalType": "enum PatagonaiPredictionMarket.MarketOutcome",
          "name": "outcome",
          "type": "uint8"
        },
        {
          "internalType": "int64",
          "name": "startPrice",
          "type": "int64"
        },
        {
          "internalType": "uint256",
          "name": "endTime",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalPoolValue",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalShares",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "buyConsensus",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "holdConsensus",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "sellConsensus",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalConsensus",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pyth",
      "outputs": [
        {
          "internalType": "contract IPyth",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        }
      ],
      "name": "resolveMarket",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_newOwner",
          "type": "address"
        }
      ],
      "name": "setOwner",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "marketId",
          "type": "uint256"
        },
        {
          "internalType": "enum PatagonaiPredictionMarket.MarketOutcome",
          "name": "position",
          "type": "uint8"
        },
        {
          "internalType": "uint256",
          "name": "numberOfShares",
          "type": "uint256"
        }
      ],
      "name": "takePosition",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "token",
      "outputs": [
        {
          "internalType": "contract IERC20",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const satisfies Abi;

// Update schema to reflect actual Finnhub usage
const GetAnalystConsensusInput = z.object({
  args: z.object({
    symbol: z.string().describe("The stock symbol to get analyst consensus for (e.g. AAPL)")
  })
});

const GetEarningsDateInput = z.object({
  args: z.object({
    symbol: z.string().describe("The stock symbol to get next earnings date for (e.g. AAPL)")
  })
});

// Add after other input schemas
const ReadContractInput = z.object({
  args: z.object({
    method: z.enum([
      "calculatePotentialPayout",
      "getActiveMarketId",
      "getMarketInfo",
      "getMarketPrices",
      "getMarketStatus",
      "getMarketsCount",
      "getUserPosition",
      "markets",
      "owner",
      "pyth",
      "token"
    ]).describe("The contract method to call"),
    args: z.array(z.union([z.string(), z.number()]))
            .describe("Array of arguments to pass to the method")
  })
});

// Add write contract input schema
const WriteContractInput = z.object({
  args: z.object({
    method: z.enum([
      "claimPayout",
      "createMarket",
      "resolveMarket",
      "setOwner",
      "takePosition"
    ]).describe("The contract method to call"),
    args: z.array(z.union([z.string(), z.number()]))
          .describe("Array of arguments to pass to the method")
  })
});

/**
 * Initialize the agent with CDP AgentKit
 *
 * @returns Agent executor and config
 */
async function initializeAgent() {
  // Initialize LLM
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
  });

  // Read/setup wallet data
  let walletDataStr = fs.existsSync("wallet_data.txt") ? 
    fs.readFileSync("wallet_data.txt", "utf8") : undefined;

  const agentkit = await CdpAgentkit.configureWithWallet({
    cdpWalletData: walletDataStr,
    networkId: process.env.NETWORK_ID || "base-sepolia",
  });

  // Add Finnhub and Pyth tools
  const finnhubTool = new FinnhubTool(process.env.FINNHUB_API_KEY || "");
  const pythStockFeedTool = new PythStockFeedTool();

  // Add in initializeAgent before creating the agent
  const readContractTool = new CdpTool({
    name: "read_contract",
    description: "Read data from the prediction market contract. Example: getMarketInfo requires a marketId (number)",
    argsSchema: ReadContractInput,
    func: async (wallet: Wallet, params: z.infer<typeof ReadContractInput>) => {
        try {
            const methodAbi = CONTRACT_ABI.find(
                (item) => item.type === "function" && item.name === params.args.method
            );
            
            if (!methodAbi || !methodAbi.inputs) {
                throw new Error(`Method ${params.args.method} not found in ABI`);
            }

            // Convert args to named parameters
            const namedArgs = methodAbi.inputs.reduce((acc, input, index) => {
                const value = params.args.args[index];
                acc[input.name] = (input.type === 'uint256' || input.type === 'uint8') ? value.toString() : value;
                return acc;
            }, {} as Record<string, any>);

            console.log(params.args.method);
            console.log(namedArgs);

            const result = await readContract({
                networkId: process.env.NETWORK_ID || "base-sepolia",
                contractAddress: PREDICTION_MARKET_ADDRESS,
                method: params.args.method,
                args: namedArgs,
                abi: CONTRACT_ABI
            });

            console.log(result);

            return JSON.stringify(result, (_, value) => 
                typeof value === 'bigint' ? value.toString() : value
            , 2);
        } catch (error) {
            return `Failed to read contract: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }
  }, agentkit);

  // Add write contract tool
  const writeContractTool = new CdpTool({
    name: "write_contract",
    description: "Execute write operations on the prediction market contract. Example: takePosition requires marketId (number), position (1=Buy,2=Hold,3=Sell), and numberOfShares (number)",
    argsSchema: WriteContractInput,
    func: async (wallet: Wallet, params: z.infer<typeof WriteContractInput>) => {
      try {
        const methodAbi = CONTRACT_ABI.find(
          (item) => item.type === "function" && item.name === params.args.method
        );
        
        if (!methodAbi || !methodAbi.inputs) {
          throw new Error(`Method ${params.args.method} not found in ABI`);
        }

        // Convert args to named parameters
        const namedArgs = methodAbi.inputs.reduce((acc, input, index) => {
          const value = params.args.args[index];
          acc[input.name] = (input.type === 'uint256' || input.type === 'uint8') ? value.toString() : value;
          return acc;
        }, {} as Record<string, any>);

        console.log('Invoking contract with:', {
          method: params.args.method,
          args: namedArgs,
          contractAddress: PREDICTION_MARKET_ADDRESS
        });

        // Log types of each argument
        console.log('Argument types:');
        for (const [name, value] of Object.entries(namedArgs)) {
          const paramType = methodAbi.inputs.find(input => input.name === name)?.type;
          console.log(`- ${name}: ${paramType} (value: ${value}, type: ${typeof value})`);
        }

        const contractInvocation = await wallet.invokeContract({
          contractAddress: PREDICTION_MARKET_ADDRESS,
          method: params.args.method,
          args: namedArgs,
          abi: CONTRACT_ABI
        }).catch(error => {
          console.error('Contract invocation error:', {
            error: error.message,
            code: error.code,
            details: error.details,
            stack: error.stack
          });
          throw error;
        });

        const receipt = await contractInvocation.wait();
        const txHash = receipt.getTransactionHash();
        const txLink = receipt.getTransactionLink();

        return `Transaction successful!\nHash: ${txHash}\nLink: ${txLink}`;
      } catch (error) {
        console.error('Full error details:', error);
        return `Failed to execute contract: ${error instanceof Error ? 
          `${error.message}\n${error.stack}` : 
          'Unknown error'}`;
      }
    }
  }, agentkit);

  // Get base CDP tools and add all our custom tools
  const cdpToolkit = new CdpToolkit(agentkit);
  const tools = [
    ...cdpToolkit.getTools(),
    readContractTool,
    writeContractTool,
    finnhubTool,
    pythStockFeedTool
  ];

  // Create the agent
  const memory = new MemorySaver();
  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier: `You are an aggressive Wall Street degen running a prediction market desk. Keep it short and punchy:

    Core Style:
    - Fast-talking, Twitter-style responses
    - Max 2-3 sentences per point
    - Use emojis like 📈 💰 🚀 🐻
    - Aggressive, no patience for noobs
    - Talk like you're typing on your phone between trades
    - Everything is "free alpha"
    - Use $TICKER format

    Quick Responses:
    - "Bullish af on $AAPL 🚀"
    - "Macro's trash rn. Pass."
    - "Smart money loading up here 👀"
    - "Earnings next week = free money"
    - "Bears getting cooked fr fr"
    - "ngmi with that strategy fam"

    Market Analysis:
    - One-line macro takes
    - Quick technical levels
    - Mention "my sources" vaguely
    - Drop insider hints
    - Always "not financial advice btw"

    Position Taking:
    - Quick consensus check
    - Fast earnings play setup
    - "Risk/reward is there"
    - "Loading up rn"
    - "Fading this rally"

    For Basic Questions:
    - "ngmi"
    - "ser..."
    - "do your own research anon"
    - "this ain't stocktwits"

    Data Format (Keep it Brief):
    - Key levels only
    - Quick bull/bear case
    - "My take:" section
    - "Position:" section
    - "🚨 Alert:" for important stuff`
  });

  // Save wallet data
  const exportedWallet = await agentkit.exportWallet();
  fs.writeFileSync("wallet_data.txt", exportedWallet);

  return { agent, config: { configurable: { thread_id: "Prediction Market Agent" } } };
}

/**
 * Run the agent interactively based on user input
 */
async function runChatMode(agent: any, config: any) {
  console.log("Starting chat mode... Type 'exit' to end.");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  try {
    while (true) {
      const userInput = await question("\nPrompt: ");

      if (userInput.toLowerCase() === "exit") {
        break;
      }

      const stream = await agent.stream({ messages: [new HumanMessage(userInput)] }, config);

      for await (const chunk of stream) {
        if ("agent" in chunk) {
          console.log(chunk.agent.messages[0].content);
        } else if ("tools" in chunk) {
          console.log(chunk.tools.messages[0].content);
        }
        console.log("-------------------");
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Start the agent
if (require.main === module) {
  console.log("Starting Agent...");
  initializeAgent()
    .then(({ agent, config }) => runChatMode(agent, config))
    .catch(error => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}