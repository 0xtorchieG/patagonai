import { useState } from "react";
import { useChat } from "ai/react";
import Image from "next/image";
import { Blobbie, useActiveAccount } from "thirdweb/react";

export default function ChatSection() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
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
            className={`chat ${
              message.role === "user" ? "chat-end" : "chat-start"
            }`}
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
            <div className={`chat-bubble ${
              message.role === "user" 
                ? "chat-bubble-primary" 
                : "bg-base-200"
            }`}>
              {message.content}
            </div>
            <div className="chat-footer opacity-50 text-xs">
              {message.role === "user" ? "You" : "AI Assistant"}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-base-300 bg-base-200">
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