import { useReadContract, useActiveAccount } from "thirdweb/react";
import { client } from "../app/client";
import { getContract } from "thirdweb";
import { baseSepolia } from "thirdweb/chains";

const contract = getContract({
  client,
  address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!,
  chain: baseSepolia,
});

type MarketInfo = [string, bigint, bigint, [bigint, bigint, bigint], [bigint, bigint, bigint]];

export function MarketDetails({ marketId }: { marketId: number }) {
  const account = useActiveAccount();
  const address = account?.address || "0x0000000000000000000000000000000000000000";

  const { data: marketInfo, isLoading } = useReadContract({
    contract,
    method: "function getMarketInfo(uint256 marketId) view returns (string stockTicker, uint256 endTime, uint256 totalPoolValue, uint256[3] shareAmounts, uint256[3] consensusAmounts)",
    params: [BigInt(marketId)],
  }) as { data: MarketInfo | undefined, isLoading: boolean };

  // Fetch resolution status
  const { data: resolutionData } = useReadContract({
    contract,
    method: "function isMarketResolved(uint256 marketId) view returns (bool)",
    params: [BigInt(marketId)],
  }) as { data: boolean | undefined };

  const { data: userPosition } = useReadContract({
    contract,
    method: "function getUserPosition(uint256 marketId, address user) view returns (uint256[3])",
    params: [BigInt(marketId), address],
  }) as { data: [bigint, bigint, bigint] | undefined };

  if (isLoading || !marketInfo) {
    return <div className="p-4"><span className="loading loading-spinner"></span></div>;
  }

  const [_, __, totalPoolValue, shareAmounts, consensusAmounts] = marketInfo;

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div className="stats stats-vertical lg:stats-horizontal shadow">
          <div className="stat">
            <div className="stat-title">Pool Value</div>
            <div className="stat-value">{Number(totalPoolValue) / 1e6} USDC</div>
          </div>
        </div>
        {resolutionData && (
          <div className="badge badge-lg badge-secondary">Resolved</div>
        )}
      </div>

      {/* User Position */}
      <div>
        <div className="text-sm opacity-70 mb-2">Your Position</div>
        {userPosition && (Number(userPosition[0]) > 0 || Number(userPosition[1]) > 0 || Number(userPosition[2]) > 0) ? (
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Buy</div>
              <div className="stat-value text-success">{Number(userPosition[0])}</div>
              <div className="stat-desc">Shares</div>
            </div>
            <div className="stat">
              <div className="stat-title">Hold</div>
              <div className="stat-value text-warning">{Number(userPosition[1])}</div>
              <div className="stat-desc">Shares</div>
            </div>
            <div className="stat">
              <div className="stat-title">Sell</div>
              <div className="stat-value text-error">{Number(userPosition[2])}</div>
              <div className="stat-desc">Shares</div>
            </div>
          </div>
        ) : (
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-value text-base opacity-50">No position in this market</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Community Positions */}
        <div>
          <div className="text-sm opacity-70 mb-2">Community Positions</div>
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Buy</div>
              <div className="stat-value text-success">{Number(shareAmounts[0])}</div>
              <div className="stat-desc">Shares</div>
            </div>
            <div className="stat">
              <div className="stat-title">Hold</div>
              <div className="stat-value text-warning">{Number(shareAmounts[1])}</div>
              <div className="stat-desc">Shares</div>
            </div>
            <div className="stat">
              <div className="stat-title">Sell</div>
              <div className="stat-value text-error">{Number(shareAmounts[2])}</div>
              <div className="stat-desc">Shares</div>
            </div>
          </div>
        </div>

        {/* Stock Analyst Consensus */}
        <div>
          <div className="text-sm opacity-70 mb-2">Stock Analyst Consensus</div>
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Buy</div>
              <div className="stat-value text-success">{Number(consensusAmounts[0])}</div>
              <div className="stat-desc">Votes</div>
            </div>
            <div className="stat">
              <div className="stat-title">Hold</div>
              <div className="stat-value text-warning">{Number(consensusAmounts[1])}</div>
              <div className="stat-desc">Votes</div>
            </div>
            <div className="stat">
              <div className="stat-title">Sell</div>
              <div className="stat-value text-error">{Number(consensusAmounts[2])}</div>
              <div className="stat-desc">Votes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 