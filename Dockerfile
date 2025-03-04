FROM node:18-alpine

# Add build argument for cache busting
ARG CACHE_BUST=1
RUN echo "Cache bust: ${CACHE_BUST}"

# Install git
RUN apk add --no-cache git

# Create app directory
WORKDIR /app

# Clone the repository (this will happen at build time)
RUN git clone https://github.com/JohanWes/TimmyMDTGenerator.git /tmp/repo && \
    cp -R /tmp/repo/* /app/ && \
    rm -rf /tmp/repo

# Install dependencies
RUN npm install

# Create data directory
RUN mkdir -p /app/data

# Expose the port
EXPOSE 8005

# Start the application
CMD ["node", "server.js"]