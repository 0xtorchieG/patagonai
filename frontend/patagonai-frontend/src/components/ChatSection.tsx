import { useState } from 'react';
import Image from 'next/image';
export default function ChatSection() {
  const [messages, setMessages] = useState<Array<{role: 'user' | 'agent', content: string}>>([
    {
      role: 'agent',
      content: "Yo fam! 👋 Ready to make some alpha moves? I've got the hottest prediction markets data fresh off the chain! What ticker you wanna ape into? 🚀"
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: input }]);
    setInput('');
    // TODO: Add agent interaction logic
  };

  return (
    <div className="w-1/2 h-screen bg-base-200 p-4 flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12">
          <Image
            src="/agent-banker.png"
            alt="Agent"
            width={48}
            height={48}
            className="rounded-full"
          />
        </div>
        <div>
          <h2 className="text-xl font-bold">Wall Street Alpha Bot 📈</h2>
          <p className="text-sm opacity-70">Always Bullish, Never Bearish 🐂</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto mb-4 rounded-xl bg-base-100 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat ${msg.role === 'user' ? 'chat-end' : 'chat-start'}`}
            >
              <div className="chat-bubble bg-primary text-primary-content">
                {msg.content}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 bg-base-100 p-2 rounded-xl">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about $TICKER or market stats..."
          className="input input-bordered flex-1"
        />
        <button 
          onClick={handleSend}
          className="btn btn-primary"
        >
          Send 🚀
        </button>
      </div>
    </div>
  );
} 