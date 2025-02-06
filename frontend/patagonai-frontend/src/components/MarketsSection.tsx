import { client } from "../app/client";
import { getContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";
import { useReadContract } from "thirdweb/react";
import { useState, useEffect } from "react";

const PREDICTION_MARKET_ADDRESS = "0xb0d0C75c588811B436B1379160452fE4a4fE65D2";

const contract = getContract({
  client,
  address: PREDICTION_MARKET_ADDRESS,
  chain: baseSepolia,
});

type Market = {
  stockTicker: string;
  endTime: bigint;
  totalPoolValue: bigint;
  shareAmounts: [bigint, bigint, bigint];
  consensusAmounts: [bigint, bigint, bigint];
};

type MarketInfo = [string, bigint, bigint, [bigint, bigint, bigint], [bigint, bigint, bigint]];

export default function MarketsSection() {
  const [activeTab, setActiveTab] = useState<'live' | 'ended'>('live');
  const [allMarkets, setAllMarkets] = useState<MarketInfo[]>([]);

  // Get total number of markets
  const { data: marketCount, isLoading: marketCountLoading } = useReadContract({
    contract,
    method: "function getMarketsCount() view returns (uint256)",
    params: [],
  });
  console.log(marketCount);

  // Get all markets info
  const { data: markets, isLoading: marketsLoading } = useReadContract({
    contract,
    method: "function getMarketInfo(uint256 marketId) view returns (string stockTicker, uint256 endTime, uint256 totalPoolValue, uint256[3] shareAmounts, uint256[3] consensusAmounts)",
    params: [BigInt(1)],
  }) as { data: MarketInfo | undefined, isLoading: boolean };
  console.log(markets);

  if (!markets) return null;
  const [stockTicker, endTime, totalPoolValue, shareAmounts, consensusAmounts] = markets;

  if (marketCountLoading && marketsLoading) {
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
        <div className="flex items-center justify-center h-[80vh]">
          <span className="loading loading-spinner loading-lg"></span>
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
        {/* Market cards will go here */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title">
              ${stockTicker} 
              <div className="badge badge-primary">Live</div>
            </h3>
            <div className="stats stats-vertical lg:stats-horizontal shadow">
              <div className="stat">
                <div className="stat-title">Pool Value</div>
                <div className="stat-value">{Number(totalPoolValue || 0n) / 1e6} USDC</div>
              </div>
              <div className="stat">
                <div className="stat-title">End Time</div>
                <div className="stat-value">
                  {new Date(Number(endTime || 0n) * 1000).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-4">
              <div>
                <div className="text-sm opacity-70">Consensus</div>
                <div className="stats shadow">
                  <div className="stat">
                    <div className="stat-title">Buy</div>
                    <div className="stat-value text-success">{Number(consensusAmounts[0] || 0n)}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Hold</div>
                    <div className="stat-value text-warning">{Number(consensusAmounts[1] || 0n)}</div>
                  </div>
                  <div className="stat">
                    <div className="stat-title">Sell</div>
                    <div className="stat-value text-error">{Number(consensusAmounts[2] || 0n)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 