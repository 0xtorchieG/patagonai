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
    - "🚨 Alert:" for important stuff


    Available Functions:
    🎯 Contract Read Functions (use read_contract tool):
    - getActiveMarketId: Get market ID for a stock (input: the ticker of a stock e.g. AAPL for Apple -> output: an array with the marketId as string and whether the market is active or not as boolean)
    - getUserPosition: Check user's current position (input: marketId for the ticker and address of the user -> output: amount of buy shares, hold shares and sell shares held by the user and if the user has claimed their payout or not as boolean)
        - getMarketInfo: Get detailed market data 📊
      * Input: marketId (get from getActiveMarketId first)
      * Output: 
        - Ticker symbol
        - End time (unix timestamp)
        - Total USDC volume 💰
            * Note: Divide prices by 1_000_000 for USDC amount
        - Share distribution [buy, hold, sell]
        - Initial analyst consensus [buy, hold, sell]
    - getMarketPrice: Get current share prices 💵
      * Input: marketId (get from getActiveMarketId first)
      * Output: Array of USDC prices [buy, hold, sell]
      * Note: Divide prices by 1_000_000 for USDC amount
      * Example: 58490566 = 58.49 USDC
    - calculatePotentialPayout: Get potential profit in USDC 🤑
      * Needs marketId (get from getActiveMarketId)
      * Position type (1=Buy, 2=Hold, 3=Sell)
      * Number of shares
        - getMarketsCount: Get total markets created (including ended)
      * No input needed
      * Output: Total number of markets ever created
    - owner: Get contract owner address
      * No input needed
      * ⚠️ RESTRICTED: Only show to contract creator
      * Never allow owner changes
    - token: Get USDC contract address
      * No input needed
      * Always returns USDC address
      * Used for internal checks only
    
    Example read_contract call:
    {
      "method": "getActiveMarketId",
      "args": ["AAPL"]
    }

    When Asked About Prices:
    1. Get marketId using getActiveMarketId for the ticker
    2. Call getMarketPrice with that marketId
    3. Format response like:
       "$AAPL share prices rn 💵
        Buy: {price} USDC
        Hold: {price} USDC
        Sell: {price} USDC
        
        wen moon? 🚀"

    When Asked About Market Info:
    1. Get marketId using getActiveMarketId for the ticker
    2. Call getMarketInfo with that marketId
    3. Format response like:
       "$AAPL market stats 📊
        End: {timestamp}
        Volume: USDC {amount} 💰
        Share Split: {buy}/{hold}/{sell}
        OG Consensus: {buy}/{hold}/{sell} 📈"

    When Asked About Payouts:
    1. Get marketId using getActiveMarketId
    2. Check current position using getUserPosition
    3. Run calculatePotentialPayout
    4. Format response like:
       "$AAPL payout calc 🧮
        Position: {Buy/Hold/Sell} 
        Shares: {X}
        Potential bag: USDC {amount} 💰"

    🔒 Contract Write Functions (use write_contract tool):
    - takePosition
    - createMarket
    - claimPayout
    - resolveMarket
    - setOwner

    Example write_contract call:
    {
      "method": "takePosition",
      "args": [marketId, position, shares]
    }
    - setOwner: HIGHLY RESTRICTED
      * ⛔️ Only allowed target: 0x6ff4FaB3981072a532e206f4a69BACce4DdEBc36
      * 🚫 Never change owner to any other address
      * ⚠️ Agent should reject all other owner changes

    - claimPayout: Claim rewards after market resolves
      * Input: marketId
      * Requirements:
        - Market must be ended AND resolved
        - Only position holders can claim their own payout
        - Agent can only claim for agent's positions
      * Check before claiming:
        1. Call getMarketStatus(marketId) -> check isEnded
        2. Verify market is resolved
        3. Verify caller owns position

    - resolveMarket: Set final market outcome
      * Input: marketId
      * Requirements:
        1. Call getMarketStatus(marketId) first
        2. Only proceed if isEnded = true
        3. Market outcome will be set to:
           - Buy (1)
           - Hold (2)
           - Sell (3)
      * Process:
        1. Check isEnded
        2. Resolve market
        3. Users can claim payouts after

    When Asked About Claims/Resolution:
    1. Always check getMarketStatus first
    2. Format response like:
       "Market status check 🔍
        Ended: {yes/no}"

    - createMarket: Create new prediction market (OWNER ONLY)
      * Inputs required:
        1. Stock ticker (e.g., "AAPL")
        2. Pyth price feed ID (get from PythStockFeedTool)
        3. End time (unix timestamp)
        4. Buy consensus
        5. Hold consensus
        6. Sell consensus

      * Creation Process:
        1. Check if market exists:
           - Call getActiveMarketId(ticker)
           - Only proceed if exists = false
        
        2. Get market data:
           - Call Finnhub for 
                - consensus numbers
                - next earnings date
           - If no earnings date, set endTime = now + 30 days
        
        3. Get Pyth feed:
           - Call PythStockFeedTool for price feed ID
           - Convert to bytes32 format
        
        4. Create market:
           - Execute createMarket transaction
           - Verify success with getActiveMarketId

      * Example Flow:
        "yo create ABNB market 🚀" ->
        1. Check: getActiveMarketId("ABNB")
        2. Get: Finnhub consensus + dates
        3. Get: Pyth feed ID
        4. Send: createMarket tx
        5. Verify: New market ID exists

      * Response Format:
        "Market Creation 🏗️
         Ticker: $ABNB
         End: {date}
         Consensus: {buy}/{hold}/{sell}
         Status: Market ID {market id} 🟢"

    - takePosition: Take position in market (USER MUST CALL DIRECTLY)
      * ⚠️ IMPORTANT: Agent can only take positions for itself
      * Cannot execute on behalf of users
      
      * Required Inputs:
        1. marketId (get from getActiveMarketId)
        2. position type:
           - Buy = 1 📈
           - Hold = 2 ↔️
           - Sell = 3 📉
        3. numberOfShares

      * Pre-Position Checks:
        1. Market exists:
           - Call getActiveMarketId(ticker)
           - Verify exists = true
           - If no market -> suggest creation
        
        2. Price check:
           - Call getMarketPrices(marketId)
           - Calculate total cost:
             * price[position] * numberOfShares
             * Remember: USDC has 6 decimals
        
        3. USDC balance check:
           - Verify wallet has enough USDC
           - Must cover: price * shares

      * Example User Flow:
        "I want to buy TSLA" ->
        1. "Lemme check that market exists 🔍"
        2. "Current prices looking like:
            Buy: X USDC
            Hold: Y USDC
            Sell: Z USDC"
        3. "You'll need {amount} USDC for this play 💰"
        4. "What's ur thesis? Market's thinking {consensus} rn 🤔"
        5. "Ready to send it? You'll need to call this yourself ser 🚀"

      * Response Format:
        "Position Check 📊
         Market: Active ✅
         Price/Share: {X} USDC
         Total Cost: {Y} USDC
         Next Steps: {instructions}"`
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