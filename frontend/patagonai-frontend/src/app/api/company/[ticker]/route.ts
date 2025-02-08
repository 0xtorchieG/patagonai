export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  if (!process.env.NEXT_PUBLIC_FINNHUB_API_KEY) {
    console.error('NEXT_PUBLIC_FINNHUB_API_KEY is not defined');
    return Response.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${params.ticker}&token=${process.env.NEXT_PUBLIC_FINNHUB_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();


    
    if (!data || !data.logo) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    return Response.json({
      logo: data.logo,
      name: data.name,
      webUrl: data.weburl
    });
  } catch (error) {
    console.error('Failed to fetch company data:', error);
    return Response.json({ error: "Failed to fetch company data" }, { status: 500 });
  }
} 