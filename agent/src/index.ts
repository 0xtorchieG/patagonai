import * as dotenv from 'dotenv';
import { createPredictionMarketAgent } from './agent';

dotenv.config();

async function main() {
  const agent = await createPredictionMarketAgent();
  
  // Example: Query stock price
  const result = await agent.invoke({
    input: "What's the current price of AAPL stock?"
  });

  console.log('Agent Response:', result);
}

main().catch(console.error); 