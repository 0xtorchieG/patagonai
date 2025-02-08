import { useState, useEffect } from "react";
import { getContract, readContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { client } from "../app/client";
import { MarketDetails } from "./MarketDetails";

const contract = getContract({
  client,
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
  chain: baseSepolia,
});

// Get USDC contract instance
const usdcContract = getContract({
  client,
  address: process.env.NEXT_PUBLIC_USDC_CONTRACT!,
  chain: baseSepolia,
});

type MarketInfo = {
  marketId: number;
  stockTicker: string;
  endTime: string;
  totalPoolValue: bigint;
  shareAmounts: readonly [bigint, bigint, bigint];
  consensusAmounts: readonly [bigint, bigint, bigint];
  isResolved: boolean;
  outcome: number;
};

async function getCompanyInfo(ticker: string) {
  try {
    const response = await fetch(`/api/company/${ticker}`);
    const data = await response.json();
    console.log('Company info for', ticker, ':', data); // Debug log
    
    if (!data.logo) {
      console.log('No logo found for', ticker); // Debug log
      return null;
    }

    return {
      logo: data.logo,
      name: data.name,
      webUrl: data.weburl
    };
  } catch (error) {
    console.error('Error fetching company info for', ticker, ':', error);
    return null;
  }
}

export default function MarketsSection() {
  const [activeTab, setActiveTab] = useState<'all' | 'live' | 'ended'>('all');
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<Record<string, { logo: string; name: string }>>({});

  const fetchMarkets = async () => {
    setIsLoading(true);
    try {
      // Get total number of markets
      const marketsCount = await readContract({
        contract,
        method: "function getMarketsCount() view returns (uint256)",
        params: [],
      });


      // Fetch info for each market
      const markets = [];
      for (let i = 0; i < Number(marketsCount); i++) {
        try {
          const [marketInfo, marketStatus] = await Promise.all([
            readContract({
              contract,
              method: "function getMarketInfo(uint256 marketId) view returns (string stockTicker, uint256 endTime, uint256 totalPoolValue, uint256[3] shareAmounts, uint256[3] consensusAmounts)",
              params: [BigInt(i)],
            }),
            readContract({
              contract,
              method: "function getMarketStatus(uint256 marketId) view returns (uint8 outcome, bool isEnded, int64 startPrice, bytes32 pythPriceId)",
              params: [BigInt(i)],
            })
          ]);

          markets.push({
            marketId: i,
            stockTicker: marketInfo[0],
            endTime: marketInfo[1].toString(),
            totalPoolValue: marketInfo[2],
            shareAmounts: marketInfo[3],
            consensusAmounts: marketInfo[4],
            isResolved: marketStatus[0] > 0,
            outcome: Number(marketStatus[0])
          });
        } catch (error) {
          console.error(`Error fetching market ${i}:`, error);
        }
      }

      // Sort markets by end date (newest first)
      const sortedMarkets = markets.sort((a, b) => 
        Number(b.endTime) - Number(a.endTime)
      );

      setMarkets(sortedMarkets);

      // Update company info fetching
      const companyInfo: Record<string, { logo: string; name: string }> = {};
      await Promise.all(
        markets.map(async (market) => {
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
      console.error("Error fetching markets:", error);
      setError("Failed to fetch markets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  const filteredMarkets = markets.filter(market => {
    const isLive = new Date(Number(market.endTime) * 1000) > new Date();
    if (activeTab === 'all') return true;
    if (activeTab === 'live') return isLive;
    return !isLive;
  });

  if (isLoading) {
    return (
      <div className="p-4 h-full">
        <div className="flex items-center justify-center h-full flex-col gap-4">
          <h1 className="text-2xl font-bold">Loading Prediction Markets 📊...</h1>
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-error">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Consensus Prediction Markets 📊</h2>
          <button 
            onClick={fetchMarkets} 
            className="btn btn-sm btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
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

      <div className="space-y-4 overflow-auto max-h-[calc(100vh-16rem)]">
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
                    <div className="flex gap-2">
                      <div className={`badge ${new Date(Number(market.endTime) * 1000) > new Date() 
                        ? 'bg-primary text-primary-content' 
                        : 'badge-ghost'}`}
                      >
                        {new Date(Number(market.endTime) * 1000) > new Date() ? 'Live' : 'Ended'}
                      </div>
                      {market.isResolved && (
                        <div className="badge bg-secondary text-secondary-content">
                          Resolved (Outcome: {market.outcome})
                        </div>
                      )}
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