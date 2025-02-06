import { useState, useEffect } from "react";

type MarketCreatedEvent = {
  marketId: string;
  stockTicker: string;
  endTime: string;
};

export default function MarketsSection() {
  const [activeTab, setActiveTab] = useState<'live' | 'ended'>('live');
  const [markets, setMarkets] = useState<MarketCreatedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await fetch('/api/markets');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        setMarkets(data.markets || []);
      } catch (error) {
        console.error("Error fetching markets:", error);
        setError("Failed to fetch markets");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkets();
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
        {!markets || markets.length === 0 ? (
          <div className="text-center text-lg">No markets available</div>
        ) : (
          markets.map((market) => (
            <div key={market.marketId} className="card bg-base-200 shadow-xl">
              <div className="card-body">
                <h3 className="card-title">
                  ${market.stockTicker}
                  <div className="badge badge-primary">
                    {new Date(Number(market.endTime) * 1000) > new Date() ? 'Live' : 'Ended'}
                  </div>
                </h3>
                <div className="stats stats-vertical lg:stats-horizontal shadow">
                  <div className="stat">
                    <div className="stat-title">Market ID</div>
                    <div className="stat-value text-sm">{market.marketId}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">End Time</div>
                    <div className="stat-value text-sm">
                      {new Date(Number(market.endTime) * 1000).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 