// Script to start the server in the background
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Get port from environment variables with fallback
const port = process.env.PORT || 8005;
const publicIp = process.env.PUBLIC_IP || 'localhost';

console.log(`=== Starting Timtommy MDT generator in Background ===`);
console.log(`Server will run on port ${port}`);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create log file streams
const date = new Date().toISOString().replace(/:/g, '-').split('.')[0];
const outLog = fs.openSync(path.join(logsDir, `server-${date}.log`), 'a');
const errLog = fs.openSync(path.join(logsDir, `server-${date}.error.log`), 'a');

// Spawn the server process
const serverProcess = spawn('node', ['server.js'], {
  detached: true,
  stdio: ['ignore', outLog, errLog]
});

// Detach the process so it runs in the background
serverProcess.unref();

console.log(`\n✅ Server started successfully in the background!`);
console.log(`Process ID: ${serverProcess.pid}`);
console.log(`\nAccess the application at:`);
console.log(`- Local: http://localhost:${port}`);
console.log(`- Public: http://${publicIp}:${port}`);
console.log(`\nServer logs are being written to:`);
console.log(`- Standard output: ${path.join(logsDir, `server-${date}.log`)}`);
console.log(`- Error output: ${path.join(logsDir, `server-${date}.error.log`)}`);
console.log(`\nTo stop the server, you can use:`);
console.log(`- Windows: Task Manager > Details > Find node.exe with PID ${serverProcess.pid} > End task`);
console.log(`- Linux/Mac: kill ${serverProcess.pid}`);

// Add the process ID to a file for easier management
const pidFile = path.join(__dirname, 'server.pid');
fs.writeFileSync(pidFile, serverProcess.pid.toString());
console.log(`\nProcess ID has been saved to: ${pidFile}`);
