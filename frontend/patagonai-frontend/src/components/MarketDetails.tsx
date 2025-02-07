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
    <div className="p-4 space-y-6">
      {/* Main Stats: Community and Consensus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Community Positions */}
        <div>
          <div className="font-medium mb-2">Community Positions 🦍</div>
          <div className="stats bg-base-200">
            <div className="stat">
              <div className="stat-title"><span className="text-success font-medium">Buy</span> 📈</div>
              <div className="stat-value">{Number(shareAmounts[0])}</div>
              <div className="stat-desc">Votes</div>
            </div>
            <div className="stat">
              <div className="stat-title"><span className="text-warning font-medium">Hold</span> 🔄</div>
              <div className="stat-value">{Number(shareAmounts[1])}</div>
              <div className="stat-desc">Votes</div>
            </div>
            <div className="stat">
              <div className="stat-title"><span className="text-error font-medium">Sell</span> 📉</div>
              <div className="stat-value">{Number(shareAmounts[2])}</div>
              <div className="stat-desc">Votes</div>
            </div>
          </div>
        </div>

        {/* Stock Analyst Consensus */}
        <div>
          <div className="font-medium mb-2">Stock Analyst Consensus 📊</div>
          <div className="stats bg-base-200">
            <div className="stat">
              <div className="stat-title"><span className="text-success font-medium">Buy</span> 📈</div>
              <div className="stat-value">{Number(consensusAmounts[0])}</div>
              <div className="stat-desc">Votes</div>
            </div>
            <div className="stat">
              <div className="stat-title"><span className="text-warning font-medium">Hold</span> 🔄</div>
              <div className="stat-value">{Number(consensusAmounts[1])}</div>
              <div className="stat-desc">Votes</div>
            </div>
            <div className="stat">
              <div className="stat-title"><span className="text-error font-medium">Sell</span> 📉</div>
              <div className="stat-value">{Number(consensusAmounts[2])}</div>
              <div className="stat-desc">Votes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats: User Position and Pool Value */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Position */}
        <div>
          <div className="font-medium mb-2">Your Position 👤</div>
          {userPosition && (Number(userPosition[0]) > 0 || Number(userPosition[1]) > 0 || Number(userPosition[2]) > 0) ? (
            <div className="stats bg-base-200">
              <div className="stat">
                <div className="stat-title"><span className="text-success font-medium">Buy</span> 📈</div>
                <div className="stat-value text-lg">{Number(userPosition[0])}</div>
                <div className="stat-desc">Votes</div>
              </div>
              <div className="stat">
                <div className="stat-title"><span className="text-warning font-medium">Hold</span> 🔄</div>
                <div className="stat-value text-lg">{Number(userPosition[1])}</div>
                <div className="stat-desc">Votes</div>
              </div>
              <div className="stat">
                <div className="stat-title"><span className="text-error font-medium">Sell</span> 📉</div>
                <div className="stat-value text-lg">{Number(userPosition[2])}</div>
                <div className="stat-desc">Votes</div>
              </div>
            </div>
          ) : (
            <div className="stats bg-base-200">
              <div className="stat">
                <div className="stat-value text-base opacity-50">No position yet 🤝</div>
              </div>
            </div>
          )}
        </div>

        {/* Pool Value and Resolution Status */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="font-medium mb-2">Pool Value 💰</div>
            <div className="stats bg-base-200">
              <div className="stat">
                <div className="stat-value text-lg">{Number(totalPoolValue) / 1e6} USDC</div>
              </div>
            </div>
          </div>
          {resolutionData && (
            <div className="badge badge-neutral mt-2">✅ Resolved</div>
          )}
        </div>
      </div>
    </div>
  );
} 