import { useState } from "react";
import { useChat } from "ai/react";
import Image from "next/image";
import { Blobbie, useActiveAccount, useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall, sendTransaction, readContract, sendAndConfirmTransaction } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";

const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;


const contract = getContract({
  client,
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
  chain: baseSepolia,
});

const usdcContract = getContract({
  client,
  address: process.env.NEXT_PUBLIC_USDC_CONTRACT!,
  chain: baseSepolia,
});



export default function ChatSection() {
  const { mutate: sendTransaction } = useSendTransaction();
  const { messages, input, handleInputChange, handleSubmit, setMessages } = useChat({
    initialMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: [
          "Hey there! 👋 I'm your PatagonAI Analyst, here to help you navigate the markets. Here's what I can do:\n\n",
          "• 📊 Create prediction markets for any stock\n",
          "• 💡 Explain current market positions and consensus\n",
          "• 💰 Check your USDC balance and positions\n",
          "• 📈 Take positions in active markets\n",
          "• 🔍 Get detailed stock analyst consensus data\n",
          "• ❓ Answer any questions about how the platform works\n\n",
          "What would you like to know about?"
        ].join('')
      }
    ]
  });

  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
  
    if (!input.trim()) return;
  
    // Save user input before sending
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user" as const,
      content: input,
    };
  
    setLoading(true);
  
    try {
      // ✅ Fix: Add user message manually so it appears instantly
      setMessages((prevMessages) => [...prevMessages, userMessage]);
  
      const res = await fetch('/api/agent', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      });
  
      if (!res.ok) throw new Error('Network response was not ok');
  
      const data = await res.json();
  
      // AI response message
      const aiResponse = {
        id: `ai-${Date.now()}`,
        role: "assistant" as const,
        content: data.response, 
      };
  
      // ✅ Fix: Append AI response while keeping user messages
      setMessages((prevMessages) => [...prevMessages, aiResponse]);

      // 🚀 **Check if response contains "ACTION_REQUIRED_TAKE_POSITION"**
      if (data.response.includes("ACTION_REQUIRED_TAKE_POSITION")) {
        const marketIdMatch = data.response.match(/marketId:\s*(\d+)/);
        const positionMatch = data.response.match(/position:\s*(\d+)/);
        const sharesMatch = data.response.match(/numberOfShares:\s*(\d+)/);

        if (marketIdMatch && positionMatch && sharesMatch) {
          const marketId = parseInt(marketIdMatch[1], 10);
          const position = parseInt(positionMatch[1], 10);
          const numberOfShares = parseInt(sharesMatch[1], 10);

          console.log(`🎯 Executing takePosition for marketId: ${marketId}, position: ${position}, shares: ${numberOfShares}`);

          // 🏦 **Check USDC Allowance**
          const allowance = await readContract({
            contract: usdcContract,
            method:
              "function allowance(address owner, address spender) view returns (uint256)",
            params: [
              account?.address || "", 
              PREDICTION_MARKET_ADDRESS || ""],
          });

          console.log('USDC Allowance:', allowance?.toString());

          // 🛑 If allowance is 0, approve spending before proceeding
          if (Number(allowance) === 0) {
            console.log("Approving USDC for spending...");

              const transaction = await prepareContractCall({
                contract: usdcContract,
                method:
                  "function approve(address spender, uint256 value) returns (bool)",
                params: [PREDICTION_MARKET_ADDRESS || "", BigInt(10000000000000000000)],
              });
              const receipt = await sendAndConfirmTransaction({
                transaction,
                account: account!,
              });
              console.log("USDC approved successfully.");
              console.log(receipt);
          }

          // ✅ **Now call takePosition()**
          console.log("Sending transaction to takePosition...");

          const transaction = await prepareContractCall({
            contract,
            method:
              "function takePosition(uint256 marketId, uint8 position, uint256 numberOfShares)",
            params: [BigInt(marketId), position, BigInt(numberOfShares)],
          });
          const receipt = await sendAndConfirmTransaction({
            transaction,
            account: account!,
          });

          console.log("🎉 Position taken!")
          console.log(receipt);

          // 📩 **Send confirmation message to chat**
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: `tx-${Date.now()}`,
              role: "assistant" as const,
              content: `✅ Position taken!\n\n🔗`,
            }
          ]);
        }
      }

      // 🚀 **Check if response contains "ACTION_REQUIRED_CLAIM_REWARDS"**
      if (data.response.includes("ACTION_REQUIRED_CLAIM_PAYOUT")) {
        console.log("Claiming rewards...");

        const marketIdMatch = data.response.match(/marketId:\s*(\d+)/);
        const marketId = parseInt(marketIdMatch[1], 10);

        const transaction = await prepareContractCall({
          contract,
          method:
            "function claimPayout(uint256 marketId)",
          params: [BigInt(marketId)],
        });
        const receipt = await sendAndConfirmTransaction({
          transaction,
          account: account!,
        });

        console.log(`🎉 Executing claimPayout for marketId: ${marketId}`);
      }
  
      // ✅ Fix: Clear input field after sending
      handleInputChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };
  
  

  return (
    <div className="w-1/2 h-screen flex flex-col bg-base-100 border-r border-base-300">
      {/* Header */}
      <div className="p-4 border-b border-base-300 bg-base-200">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 relative rounded-full overflow-hidden">
            <Image
              src="/agent-banker.png"
              alt="AI Agent"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Patagon<span className="text-primary">AI</span> Analyst 🤖
            </h2>
            <p className="text-sm opacity-70">Ask me anything about stock consensus and place your predictions!</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat ${message.role === "user" ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              {message.role === "user" ? (
                <div className="rounded-full overflow-hidden">
                  <Blobbie 
                    address={account?.address || "0x0000000000000000000000000000000000000000"} 
                    className="w-10 h-10" 
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full overflow-hidden">
                  <Image
                    src="/agent-banker.png"
                    alt="AI Agent"
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                </div>
              )}
            </div>
            <div className={`chat-bubble ${message.role === "user" ? "chat-bubble-primary" : "bg-base-200"}`}>
              {message.content}
            </div>
            <div className="chat-footer opacity-50 text-xs">
              {message.role === "user" ? "You" : "AI Assistant"}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat chat-start">
            <div className="chat-image avatar">
              <div className="w-10 h-10 rounded-full overflow-hidden">
                <Image
                  src="/agent-banker.png"
                  alt="AI Agent"
                  width={40}
                  height={40}
                  className="object-cover"
                />
              </div>
            </div>
            <div className="chat-bubble bg-base-200">Thinking...</div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-base-300 bg-base-200">
        <div className="join w-full">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about market predictions, trends, or analysis..."
            className="input input-bordered join-item w-full focus:outline-none"
          />
          <button type="submit" className="btn join-item btn-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-6 h-6"
            >
              <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
