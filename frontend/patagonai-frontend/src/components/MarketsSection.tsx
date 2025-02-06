import { useState, useEffect } from "react";
import { useReadContract } from "thirdweb/react";
import { client } from "../app/client";
import { getContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { MarketDetails } from "./MarketDetails";

const contract = getContract({
  client,
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
  chain: baseSepolia,
});

type MarketEvent = {
  marketId: number;
  stockTicker: string;
  endTime: string;
};

type MarketInfo = [string, bigint, bigint, [bigint, bigint, bigint], [bigint, bigint, bigint]];

type Market = {
  marketId: number;
  stockTicker: string;
  endTime: string;
  totalPoolValue: bigint;
  shareAmounts: [bigint, bigint, bigint];
  consensusAmounts: [bigint, bigint, bigint];
};

export default function MarketsSection() {
  const [activeTab, setActiveTab] = useState<'live' | 'ended'>('live');
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch market events from API
  useEffect(() => {
    const fetchMarketEvents = async () => {
      try {
        const response = await fetch('/api/markets');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        setMarketEvents(data.markets || []);
      } catch (error) {
        console.error("Error fetching markets:", error);
        setError("Failed to fetch markets");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketEvents();
  }, []);


  if (isLoading) {
    return (
      <div className="w-1/2 h-screen bg-base-100 p-4">
        <div className="flex items-center justify-center h-[80vh]">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-1/2 h-screen bg-base-100 p-4">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="text-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-1/2 h-screen bg-base-100 p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Markets 📊</h2>
        <div className="tabs tabs-boxed">
          <button 
            className={`tab ${activeTab === 'live' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('live')}
          >
            Live 🔥
          </button>
          <button 
            className={`tab ${activeTab === 'ended' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('ended')}
          >
            Ended 📜
          </button>
        </div>
      </div>

      <div className="space-y-4 overflow-auto h-[calc(100vh-8rem)]">
        {!marketEvents || marketEvents.length === 0 ? (
          <div className="text-center text-lg">No markets available</div>
        ) : (
          marketEvents.map((market) => (
            <div key={market.marketId} className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" /> 
              <div className="collapse-title">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">
                    ${market.stockTicker}
                    <div className="badge badge-primary ml-2">
                      {new Date(Number(market.endTime) * 1000) > new Date() ? 'Live' : 'Ended'}
                    </div>
                  </h3>
                  <div className="text-sm opacity-70">
                    Ends: {new Date(Number(market.endTime) * 1000).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="collapse-content">
                <MarketDetails marketId={market.marketId} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 