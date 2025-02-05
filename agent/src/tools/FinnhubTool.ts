import { Tool } from "@langchain/core/tools";
import axios from "axios";

export class FinnhubTool extends Tool {
  name = "finnhub_stock_data";
  description = "Get stock recommendations and earnings data. Input should be a stock symbol like 'AAPL'";
  
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async _call(symbol: string): Promise<string> {
    try {
      // Fetch recommendation trends
      const recommendationsResponse = await axios.get(
        `https://finnhub.io/api/v1/stock/recommendation`,
        {
          params: {
            symbol: symbol.toUpperCase(),
            token: this.apiKey
          }
        }
      );

      // Fetch earnings calendar
      const today = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(today.getFullYear() + 1);
      
      const earningsResponse = await axios.get(
        `https://finnhub.io/api/v1/calendar/earnings`,
        {
          params: {
            symbol: symbol.toUpperCase(),
            from: today.toISOString().split('T')[0],
            to: oneYearFromNow.toISOString().split('T')[0],
            token: this.apiKey
          }
        }
      );

      const recommendations = recommendationsResponse.data[0] || null;
      const nextEarnings = earningsResponse.data.earningsCalendar[0] || null;

      return JSON.stringify({
        recommendations: recommendations ? {
          latestRecommendations: {
            buyConsensus: recommendations.buy,
            sellConsensus: recommendations.sell,
            holdConsensus: recommendations.hold,
            period: recommendations.period
          }
        } : "No recommendation data available",
        nextEarningsCall: nextEarnings ? {
          date: nextEarnings.date,
          timestamp: Math.floor(new Date(nextEarnings.date).getTime() / 1000),
          hour: nextEarnings.hour,
          estimate: nextEarnings.epsEstimate,
          actual: nextEarnings.epsActual
        } : "No upcoming earnings data available"
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        return `Error fetching data from Finnhub: ${error.message}`;
      }
      return "An unknown error occurred while fetching data from Finnhub";
    }
  }
} 