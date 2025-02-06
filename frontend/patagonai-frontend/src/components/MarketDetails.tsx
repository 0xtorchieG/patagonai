import { useReadContract } from "thirdweb/react";
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
  const { data: marketInfo, isLoading } = useReadContract({
    contract,
    method: "function getMarketInfo(uint256 marketId) view returns (string stockTicker, uint256 endTime, uint256 totalPoolValue, uint256[3] shareAmounts, uint256[3] consensusAmounts)",
    params: [BigInt(marketId)],
  }) as { data: MarketInfo | undefined, isLoading: boolean };

  if (isLoading || !marketInfo) {
    return <div className="p-4"><span className="loading loading-spinner"></span></div>;
  }

  const [_, __, totalPoolValue, shareAmounts, consensusAmounts] = marketInfo;

  return (
    <div className="p-4">
      <div className="stats stats-vertical lg:stats-horizontal shadow">
        <div className="stat">
          <div className="stat-title">Pool Value</div>
          <div className="stat-value">{Number(totalPoolValue) / 1e6} USDC</div>
        </div>
      </div>
      <div className="flex justify-between mt-4">
        <div>
          <div className="text-sm opacity-70">Consensus</div>
          <div className="stats shadow">
            <div className="stat">
              <div className="stat-title">Buy</div>
              <div className="stat-value text-success">{Number(consensusAmounts[0])}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Hold</div>
              <div className="stat-value text-warning">{Number(consensusAmounts[1])}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Sell</div>
              <div className="stat-value text-error">{Number(consensusAmounts[2])}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 