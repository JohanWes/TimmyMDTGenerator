FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Expose the port
EXPOSE 8005

# Start the application
CMD ["node", "server.js"]
