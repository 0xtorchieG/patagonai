if (!process.env.NEXT_PUBLIC_INSIGHTS_API || 
    !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || 
    !process.env.NEXT_PUBLIC_CLIENT_ID) {
  throw new Error('Missing environment variables');
}

const INSIGHTS_API = process.env.NEXT_PUBLIC_INSIGHTS_API;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID;

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET() {
  try {
    // First request with retry logic
    let createdResponse;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      createdResponse = await fetch(
        `${INSIGHTS_API}/${CONTRACT_ADDRESS}/MarketCreated(uint256 indexed marketId, string stockTicker, uint256 endTime)?chain=84532&limit=20&clientId=${CLIENT_ID}`,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      const createdData = await createdResponse.json();

      if (!createdData.error) {
        console.log('Successfully fetched markets on attempt:', retryCount + 1);
        
        // Wait before making the second request
        await delay(1000);

        const resolvedResponse = await fetch(
          `${INSIGHTS_API}/transactions/${CONTRACT_ADDRESS}/resolveMarket(uint256 marketId)?chain=84532&limit=20&clientId=${CLIENT_ID}`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );
        const resolvedData = await resolvedResponse.json();

        if (!createdData.data || !Array.isArray(createdData.data)) {
          throw new Error('Invalid data format received from API');
        }

        const resolvedMarketIds = new Set(
          resolvedData.data?.filter((tx: any) => tx.status === 1)
            .map((tx: any) => tx.decoded.inputs.marketId.toString()) || []
        );

        console.log('Number of markets found:', createdData.data.length);

        return Response.json({
          markets: createdData.data.map((event: any) => {
            const marketId = event.decoded.indexedParams.marketId;
            const stockTicker = event.decoded.nonIndexedParams.stockTicker;
            return {
              marketId,
              stockTicker,
              endTime: event.decoded.nonIndexedParams.endTime,
              isResolved: resolvedMarketIds.has(marketId.toString()),
              resolvedAt: resolvedData.data?.find(
                (tx: any) => 
                  tx.status === 1 && 
                  tx.decoded.inputs.marketId.toString() === marketId.toString()
              )?.block_timestamp || null
            };
          }).sort((a: any, b: any) => b.marketId - a.marketId)
        });
      }

      console.log(`Retry ${retryCount + 1}: Failed to fetch markets, waiting before retry...`);
      await delay(2000 * (retryCount + 1)); // Exponential backoff
      retryCount++;
    }

    throw new Error(`Failed to fetch markets after ${maxRetries} attempts`);
  } catch (error) {
    console.error('Error fetching markets:', error);
    return Response.json({ 
      error: "Failed to fetch markets", 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 