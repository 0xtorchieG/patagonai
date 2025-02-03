import { Tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from "axios";

export class PythStockFeedTool extends Tool {
  name = "get_stock_feed_id";
  description = "Get the Pyth price feed ID for a stock symbol. Required for creating new prediction markets.";

  constructor() {
    super();
  }

  async _call(input: string) {
    try {
      const url = `https://hermes.pyth.network/v2/price_feeds?query=${input}&asset_type=equity`;
      const response = await axios.get(url);
      
      const feeds = response.data;
      console.log(feeds);
      const stockFeed = feeds.find((feed: any) => 
        feed.attributes.asset_type === "Equity" && 
        feed.attributes.base === input
      );


      if (!stockFeed) {
        return `No price feed found for ${input}`;
      }

      // Convert hex string to bytes32
      const bytes32 = `0x${stockFeed.id}`;
      console.log('Bytes32 format:', bytes32);

      console.log(typeof bytes32);
      console.log(bytes32);

      return bytes32;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return `Failed to get price feed ID: ${error.response?.data || error.message}`;
      }
      return `Failed to get price feed ID: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
} 