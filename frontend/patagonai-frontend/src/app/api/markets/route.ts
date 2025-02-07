if (!process.env.NEXT_PUBLIC_INSIGHTS_API || 
    !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 
    !process.env.NEXT_PUBLIC_CLIENT_ID) {
  throw new Error('Missing environment variables');
}

const INSIGHTS_API = process.env.NEXT_PUBLIC_INSIGHTS_API;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID;

export async function GET() {
  try {
    // Fetch created markets
    const createdResponse = await fetch(
      `${INSIGHTS_API}/${CONTRACT_ADDRESS}/MarketCreated(uint256 indexed marketId, string stockTicker, uint256 endTime)?chain=84532&limit=20&clientId=${CLIENT_ID}`
    );
    const createdData = await createdResponse.json();

    // Fetch resolved market transactions
    const resolvedResponse = await fetch(
      `${INSIGHTS_API}/transactions/${CONTRACT_ADDRESS}/resolveMarket(uint256 marketId)?chain=84532&limit=20&clientId=${CLIENT_ID}`
    );
    const resolvedData = await resolvedResponse.json();

    // Create a set of resolved market IDs from successful transactions only
    const resolvedMarketIds = new Set(
      resolvedData.data?.filter((tx: any) => tx.status === 1) // Only include successful transactions
        .map((tx: any) => tx.decoded.inputs.marketId.toString()) || []
    );

    // Combine the data
    return Response.json({
      markets: createdData.data.map((event: any) => {
        const marketId = event.decoded.indexedParams.marketId;
        console.log(event.decoded.nonIndexedParams);
        return {
          marketId,
          stockTicker: event.decoded.nonIndexedParams.stockTicker,
          endTime: event.decoded.nonIndexedParams.endTime,
          isResolved: resolvedMarketIds.has(marketId.toString()),
          // Add transaction details for resolved markets
          resolvedAt: resolvedData.data?.find(
            (tx: any) => 
              tx.status === 1 && 
              tx.decoded.inputs.marketId.toString() === marketId.toString()
          )?.block_timestamp || null
        };
      })
    });
  } catch (error) {
    console.error('Error fetching markets:', error);
    return Response.json({ error: "Failed to fetch markets" }, { status: 500 });
  }
} 