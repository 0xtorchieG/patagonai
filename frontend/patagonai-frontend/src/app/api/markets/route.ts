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
    const response = await fetch(
      `${INSIGHTS_API}/${CONTRACT_ADDRESS}/MarketCreated(uint256 indexed marketId, string stockTicker, uint256 endTime)?chain=84532&limit=20&clientId=${CLIENT_ID}`
    );
    const data = await response.json();

    return Response.json({
      markets: data.data.map((event: any) => ({
        marketId: event.decoded.indexedParams.marketId,
        stockTicker: event.decoded.nonIndexedParams.stockTicker,
        endTime: event.decoded.nonIndexedParams.endTime,
      }))
    });
  } catch (error) {
    return Response.json({ error: "Failed to fetch markets" }, { status: 500 });
  }
} 