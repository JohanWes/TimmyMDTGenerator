// Script to stop the background server
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

console.log(`=== Stopping Timtommy MDT generator Background Server ===`);

// Check if PID file exists
const pidFile = path.join(__dirname, 'server.pid');
if (!fs.existsSync(pidFile)) {
  console.log(`❌ No server.pid file found. The server might not be running in the background.`);
  console.log(`If you started the server with 'npm start', you can stop it by pressing Ctrl+C in that terminal.`);
  process.exit(1);
}

// Read the PID from the file
const pid = fs.readFileSync(pidFile, 'utf8').trim();
if (!pid) {
  console.log(`❌ Empty PID file. Cannot determine the server process ID.`);
  process.exit(1);
}

console.log(`Found server process ID: ${pid}`);

// Function to check if the process is running
function isProcessRunning(pid, callback) {
  const platform = process.platform;
  let command;
  
  if (platform === 'win32') {
    command = `tasklist /FI "PID eq ${pid}" /NH`;
  } else {
    command = `ps -p ${pid} -o pid=`;
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      callback(false);
      return;
    }
    
    // Check if the output contains the PID
    const isRunning = platform === 'win32' 
      ? stdout.includes(pid)
      : stdout.trim() !== '';
    
    callback(isRunning);
  });
}

// Check if the process is running
isProcessRunning(pid, (isRunning) => {
  if (!isRunning) {
    console.log(`❌ Process with ID ${pid} is not running.`);
    console.log(`Removing stale PID file...`);
    fs.unlinkSync(pidFile);
    console.log(`PID file removed.`);
    process.exit(0);
  }
  
  // Kill the process
  console.log(`Stopping process with ID ${pid}...`);
  
  const platform = process.platform;
  let command;
  
  if (platform === 'win32') {
    command = `taskkill /PID ${pid} /F`;
  } else {
    command = `kill -15 ${pid}`;
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log(`❌ Error stopping the server: ${error.message}`);
      console.log(`You may need to stop it manually:`);
      console.log(`- Windows: Task Manager > Details > Find node.exe with PID ${pid} > End task`);
      console.log(`- Linux/Mac: kill -9 ${pid}`);
    } else {
      console.log(`✅ Server stopped successfully.`);
      
      // Remove the PID file
      fs.unlinkSync(pidFile);
      console.log(`PID file removed.`);
    }
  });
});
