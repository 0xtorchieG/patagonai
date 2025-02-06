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
  logoUrl?: string;
  companyName?: string;
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

async function getCompanyInfo(ticker: string) {
  try {
    const response = await fetch(`/api/company/${ticker}`);
    const data = await response.json();
    return {
      logo: data.logo,
      name: data.name,
      webUrl: data.weburl
    };
  } catch (error) {
    return null;
  }
}

export default function MarketsSection() {
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'ended'>('all');
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Record<string, { logo: string; name: string }>>({});

  // Fetch market events and company data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/markets');
        const data = await response.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        setMarketEvents(data.markets || []);

        // Fetch company data for each market
        const companyInfo: Record<string, { logo: string; name: string }> = {};
        await Promise.all(
          data.markets.map(async (market: MarketEvent) => {
            const info = await getCompanyInfo(market.stockTicker);
            if (info) {
              companyInfo[market.stockTicker] = {
                logo: info.logo,
                name: info.name
              };
            }
          })
        );
        setCompanyData(companyInfo);

      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to fetch data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredMarkets = marketEvents.filter(market => {
    const isLive = new Date(Number(market.endTime) * 1000) > new Date();
    if (activeTab === 'all') return true;
    if (activeTab === 'live') return isLive;
    return !isLive; // 'ended' tab
  });

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
            className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All 📋
          </button>
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
        {!filteredMarkets || filteredMarkets.length === 0 ? (
          <div className="text-center text-lg">No markets available</div>
        ) : (
          filteredMarkets.map((market) => (
            <div key={market.marketId} className="collapse collapse-plus bg-base-200 rounded-box">
              <input type="checkbox" className="peer" /> 
              <div className="collapse-title bg-base-200 peer-checked:bg-base-300 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img 
                      src={companyData[market.stockTicker]?.logo || `https://via.placeholder.com/32?text=${market.stockTicker}`}
                      alt={`${companyData[market.stockTicker]?.name || market.stockTicker} logo`}
                      className="w-8 h-8 rounded-full bg-white p-1"
                    />
                    <div className="flex flex-col">
                      <h3 className="text-xl font-bold">${market.stockTicker}</h3>
                      {companyData[market.stockTicker]?.name && (
                        <span className="text-sm opacity-70">{companyData[market.stockTicker].name}</span>
                      )}
                    </div>
                    <div className="badge badge-primary">
                      {new Date(Number(market.endTime) * 1000) > new Date() ? 'Live' : 'Ended'}
                    </div>
                  </div>
                  <div className="text-sm opacity-70">
                    Ends: {new Date(Number(market.endTime) * 1000).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="collapse-content bg-base-300">
                <MarketDetails marketId={market.marketId} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 