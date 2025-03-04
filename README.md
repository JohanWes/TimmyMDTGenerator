# Warcraft Logs Cast Analyzer

A web application that analyzes Warcraft Logs and outputs a MDT cooldown string, and also a string that can be used as input for Viserio-cooldowns. Great for copying "better" guilds

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (comes with Node.js)
- A Warcraft Logs API token

### Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

### Configuration

The application uses environment variables for configuration. These are stored in the `.env` file:

```
PUBLIC_IP=YOUR_PUBLIC_IP
PORT=8005
```

You can modify these values as needed:
- `PUBLIC_IP`: Your public IP address or domain name
- `PORT`: The port number the server will listen on

If you have a dynamic IP address that changes frequently, you can update it with:

```bash
npm run update-ip
```

This will automatically detect your current public IP and update the .env file.

### Running the Application

#### First-Time Setup and Start

For first-time setup that automatically installs dependencies and starts the server:

```bash
npm run setup-and-start
```

This script will:
1. Check and install any missing dependencies
2. Create the .env file if it doesn't exist
3. Start the server

#### Standard Mode

Start the server in the foreground (keeps running as long as the terminal is open):

```bash
npm start
```

Note: Make sure you've installed dependencies with `npm install` before using this command.

#### Background Mode

Start the server in the background (keeps running even if you close the terminal):

```bash
npm run start-background
```

To stop the background server:

```bash
npm run stop-background
```

The application will be available at:
- Local access: http://localhost:8005
- Public access: http://YOUR_PUBLIC_IP:8005

When running in background mode, logs are saved to the `logs` directory.

#### Windows Service Mode

For a more permanent solution on Windows, you can install the application as a Windows service that starts automatically when the computer boots:

1. Set up the Windows service:

```bash
npm run setup-windows-service
```

2. Install the service:

```bash
npm run install-service
```

3. To uninstall the service:

```bash
npm run uninstall-service
```

When running as a Windows service, the application will automatically start when Windows boots up, and will continue running in the background even when no user is logged in.

### External Access Setup

For the application to be accessible from outside your network:

1. **Check Your IP Addresses**: Run the included IP checking tool:

```bash
npm run check-ip
```

This will display:
- Your local IP address (needed for port forwarding)
- Your public IP address (to verify it matches what's in your .env file)
- Basic port forwarding instructions

2. **Port Forwarding**: Configure your router to forward port 8005 to your computer's local IP address
   - Access your router's admin panel (typically http://192.168.1.1 or http://192.168.0.1)
   - Find the port forwarding section
   - Create a new rule forwarding external port 8005 to internal port 8005 on your computer's local IP

3. **Firewall Configuration**: Ensure your firewall allows incoming connections on port 8005
   - Windows: Use the included firewall setup script:
     ```bash
     npm run setup-firewall
     ```
   - Linux: Use `ufw allow 8005` or equivalent for your firewall

4. **Static IP**: Consider setting a static local IP for your computer to ensure port forwarding remains valid

5. **Check Server Status**: Verify that your server is running:
   ```bash
   npm run check-server
   ```
   This will check if:
   - The server is running and accessible locally
   - Any server processes are running
   - The server is running in background mode
   - The server is running as a Windows service

6. **Test External Connection**: Verify that your application is accessible from the internet:
   ```bash
   # Start the server in one terminal
   npm start
   
   # In another terminal, run the connection test
   npm run test-connection
   ```
   This will check if:
   - The server is running locally
   - The port is accessible from the internet
   - Your configuration is working correctly

## Usage

1. Access the application in a web browser
2. Enter your Warcraft Logs API token when prompted
3. Enter a Warcraft Logs URL to analyze
4. Use the filter options to focus on specific spell IDs
5. View the results and optionally convert to MRT notes format

## Database Information

The application uses client-side storage:
- IndexedDB for storing spell IDs and class mappings
- localStorage as a backup mechanism
- All data is stored in the user's browser, not on the server

## Security Considerations

- The application uses client-side storage for user data
- API tokens are stored in the user's browser
- Consider implementing HTTPS for secure connections if sensitive data is involved
