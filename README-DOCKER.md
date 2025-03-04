# Docker Setup for Warcraft Logs Cast Analyzer

This document provides instructions for running the Warcraft Logs Cast Analyzer in a Docker container, specifically configured for Unraid 7.0.

## Prerequisites

- Docker and Docker Compose installed on your Unraid server
- A Warcraft Logs API token (see the main README for instructions on obtaining one)
- Basic knowledge of Docker and container management

## Configuration

### Environment Variables

The application uses the following environment variables:

- `PORT`: The port the application will listen on (default: 8005)
- `PUBLIC_IP`: Your public IP address or domain name
- `WARCRAFT_LOGS_TOKEN`: Your Warcraft Logs API token
- `BASE_PATH`: The base path for the application when accessed through a reverse proxy (default: /logsanalyzer)
- `DB_MODE`: The database mode (default: shared)

### Setting Up Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file with your specific configuration:
   ```bash
   # Server Configuration
   PUBLIC_IP=your-domain.com/logsanalyzer
   PORT=8005
   WARCRAFT_LOGS_TOKEN=your_token_here
   
   # Database Configuration
   DB_MODE=shared
   ```

## Building and Running

### Using Docker Compose

1. Build and start the container:
   ```bash
   docker-compose up -d
   ```

2. Stop the container:
   ```bash
   docker-compose down
   ```

3. View logs:
   ```bash
   docker-compose logs -f
   ```

### Manual Docker Commands

If you prefer not to use Docker Compose:

1. Build the Docker image:
   ```bash
   docker build -t loganalyzer .
   ```

2. Run the container:
   ```bash
   docker run -d \
     --name loganalyzer \
     -p 8005:8005 \
     -e PORT=8005 \
     -e PUBLIC_IP=your-domain.com/logsanalyzer \
     -e WARCRAFT_LOGS_TOKEN=your_token_here \
     -e BASE_PATH=/logsanalyzer \
     -e DB_MODE=shared \
     -v /mnt/user/appdata/loganalyzer/data:/app/data \
     --network proxynet \
     --restart unless-stopped \
     loganalyzer
   ```

## Reverse Proxy Configuration

The application is designed to work behind a reverse proxy. Here's how to configure it with Nginx:

### Nginx Configuration

Create a new Nginx configuration file (e.g., `/etc/nginx/conf.d/loganalyzer.conf`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /logsanalyzer {
        proxy_pass http://loganalyzer:8005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/TLS Configuration

If you want to enable HTTPS, you can use the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

    location /logsanalyzer {
        proxy_pass http://loganalyzer:8005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Unraid Specific Configuration

If you're using Unraid's built-in reverse proxy or another solution like Swag, you'll need to:

1. Set up a new proxy configuration pointing to the `loganalyzer` container on port `8005`
2. Ensure the `BASE_PATH` environment variable in the Docker container matches the path in your proxy configuration
3. Make sure the `proxynet` network is properly configured in Unraid

## Data Persistence

The application stores data in the `/app/data` directory inside the container, which is mapped to `/mnt/user/appdata/loganalyzer/data` on the host. This ensures that your data persists even if the container is removed or recreated.

## Troubleshooting

### Container Won't Start

Check the logs for errors:
```bash
docker logs loganalyzer
```

### Can't Access the Application

1. Verify the container is running:
   ```bash
   docker ps | grep loganalyzer
   ```

2. Check if the port is accessible:
   ```bash
   curl http://localhost:8005
   ```

3. Verify your reverse proxy configuration

### API Token Issues

If you're having issues with the Warcraft Logs API token:

1. Make sure the token is correctly set in the environment variables
2. Check if the token is expired or has the correct permissions
3. Try regenerating a new token from the Warcraft Logs website

## Updating the Application

To update the application to a new version:

1. Pull the latest code
2. Rebuild the Docker image:
   ```bash
   docker-compose build
   ```

3. Restart the container:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## Security Considerations

- The Warcraft Logs API token is sensitive information. Do not share your `.env` file or expose the token in public repositories.
- Consider using HTTPS for secure connections, especially if the application is accessible from the internet.
- Regularly update the Docker image to get the latest security patches.
