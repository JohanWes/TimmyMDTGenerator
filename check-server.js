// Script to check if the server is running
const http = require('http');
require('dotenv').config();

// Get port from environment variables with fallback
const port = process.env.PORT || 8005;
const publicIp = process.env.PUBLIC_IP || 'localhost';

console.log(`=== Timtommy MDT generator Server Check ===`);
console.log(`Checking if the server is running on port ${port}...`);

// Function to check if the server is running locally
function checkLocalServer() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'HEAD',
      timeout: 3000
    }, (res) => {
      resolve({
        status: res.statusCode,
        running: true
      });
    });
    
    req.on('error', (err) => {
      resolve({
        status: null,
        running: false,
        error: err.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: null,
        running: false,
        error: 'Request timed out'
      });
    });
    
    req.end();
  });
}

// Function to check server process
function checkServerProcess() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      // Windows command to find node processes running server.js
      command = 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV';
    } else {
      // Linux/Mac command to find node processes running server.js
      command = 'ps aux | grep "[n]ode server.js"';
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({
          found: false,
          error: error.message
        });
        return;
      }
      
      // Check if server.js is in the output
      const isRunning = platform === 'win32'
        ? stdout.toLowerCase().includes('node.exe')
        : stdout.trim() !== '';
      
      resolve({
        found: isRunning,
        output: stdout
      });
    });
  });
}

// Function to check if the server is running as a Windows service
function checkWindowsService() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ found: false, notWindows: true });
      return;
    }
    
    const { exec } = require('child_process');
    const serviceName = 'WarcraftLogsCastAnalyzer';
    
    exec(`sc query "${serviceName}"`, (error, stdout, stderr) => {
      if (error) {
        // Service might not exist or not be running
        resolve({
          found: false,
          error: error.message
        });
        return;
      }
      
      const isRunning = stdout.includes('RUNNING');
      
      resolve({
        found: isRunning,
        output: stdout
      });
    });
  });
}

// Function to check if there's a background server
function checkBackgroundServer() {
  return new Promise((resolve) => {
    const fs = require('fs');
    const path = require('path');
    
    // Check if PID file exists
    const pidFile = path.join(__dirname, 'server.pid');
    if (!fs.existsSync(pidFile)) {
      resolve({
        found: false
      });
      return;
    }
    
    // Read the PID from the file
    const pid = fs.readFileSync(pidFile, 'utf8').trim();
    if (!pid) {
      resolve({
        found: false,
        error: 'Empty PID file'
      });
      return;
    }
    
    // Check if the process is running
    const { exec } = require('child_process');
    const platform = process.platform;
    let command;
    
    if (platform === 'win32') {
      command = `tasklist /FI "PID eq ${pid}" /NH`;
    } else {
      command = `ps -p ${pid} -o pid=`;
    }
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        resolve({
          found: false,
          error: error.message
        });
        return;
      }
      
      // Check if the output contains the PID
      const isRunning = platform === 'win32' 
        ? stdout.includes(pid)
        : stdout.trim() !== '';
      
      resolve({
        found: isRunning,
        pid: pid
      });
    });
  });
}

// Run all checks
async function runChecks() {
  // Check if the server is accessible
  console.log('\n1. Checking if the server is accessible...');
  const localServerResult = await checkLocalServer();
  
  if (localServerResult.running) {
    console.log(`✅ Server is running and accessible at http://localhost:${port}`);
    console.log(`   Status code: ${localServerResult.status}`);
  } else {
    console.log(`❌ Server is not accessible at http://localhost:${port}`);
    if (localServerResult.error) {
      console.log(`   Error: ${localServerResult.error}`);
    }
  }
  
  // Check for server processes
  console.log('\n2. Checking for server processes...');
  const processResult = await checkServerProcess();
  
  if (processResult.found) {
    console.log(`✅ Found node process running server.js`);
  } else {
    console.log(`❌ No node process found running server.js`);
  }
  
  // Check for background server
  console.log('\n3. Checking for background server...');
  const backgroundResult = await checkBackgroundServer();
  
  if (backgroundResult.found) {
    console.log(`✅ Background server is running with PID ${backgroundResult.pid}`);
  } else {
    console.log(`❌ No background server found`);
  }
  
  // Check for Windows service
  console.log('\n4. Checking for Windows service...');
  const serviceResult = await checkWindowsService();
  
  if (serviceResult.notWindows) {
    console.log(`ℹ️ Not running on Windows, skipping service check`);
  } else if (serviceResult.found) {
    console.log(`✅ Windows service is running`);
  } else {
    console.log(`❌ Windows service is not running`);
  }
  
  // Summary
  console.log('\n=== Summary ===');
  if (localServerResult.running) {
    console.log('✅ The server is running and accessible!');
    console.log(`\nYou can access the application at:`);
    console.log(`- Local: http://localhost:${port}`);
    console.log(`- Public: http://${publicIp}:${port} (if port forwarding is set up)`);
  } else {
    console.log('❌ The server is not running or not accessible.');
    console.log('\nTo start the server, try one of these commands:');
    console.log('- npm run setup-and-start (installs dependencies and starts the server)');
    console.log('- npm start (starts the server in the foreground)');
    console.log('- npm run start-background (starts the server in the background)');
  }
}

// Run the checks
try {
  runChecks();
} catch (error) {
  console.error(`Error running checks: ${error.message}`);
}
