const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${params.ticker}&token=${FINNHUB_API_KEY}`
    );
    const data = await response.json();
    
    if (!data.logo) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    return Response.json({
      logo: data.logo,
      name: data.name,
      webUrl: data.weburl
    });
  } catch (error) {
    return Response.json({ error: "Failed to fetch company data" }, { status: 500 });
  }
} 