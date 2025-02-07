# Use Node.js base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose the port
EXPOSE 3000

# Start the agent server
CMD ["npx", "ts-node", "src/my_agent.ts"] 