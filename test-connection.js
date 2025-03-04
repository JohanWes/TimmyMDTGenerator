// Script to test if the port is accessible from the internet
const http = require('http');
const https = require('https');
require('dotenv').config();

// Get port and IP from environment variables with fallbacks
const port = process.env.PORT || 8005;
const publicIp = process.env.PUBLIC_IP || 'localhost';

console.log(`=== Connection Test for Timtommy MDT generator ===`);
console.log(`Testing if port ${port} is accessible from the internet...`);

// Function to test local connection
function testLocalConnection() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'HEAD',
      timeout: 3000
    }, (res) => {
      resolve(res.statusCode);
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    
    req.end();
  });
}

// Function to test if a port is open using an external service
function testExternalConnection() {
  return new Promise((resolve, reject) => {
    const url = `https://portchecker.co/check?port=${port}&ip=${publicIp}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // This is a simple check - the actual service might change its response format
        if (data.includes('Port is open') || data.includes('Success')) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Run the tests
async function runTests() {
  console.log('\n1. Testing local connection...');
  try {
    const statusCode = await testLocalConnection();
    console.log(`✅ Local connection successful (Status code: ${statusCode})`);
    console.log(`   The server is running correctly on http://localhost:${port}`);
  } catch (err) {
    console.log(`❌ Local connection failed: ${err.message}`);
    console.log('   Make sure the server is running with "npm start" in another terminal');
    console.log('   If the server is running, check for any errors in the server console');
    return;
  }
  
  console.log('\n2. Testing external connection...');
  console.log(`   This will check if port ${port} on ${publicIp} is accessible from the internet`);
  console.log('   Using an external service to verify port accessibility...');
  
  try {
    const isOpen = await testExternalConnection();
    if (isOpen) {
      console.log(`✅ External connection successful!`);
      console.log(`   Your application should be accessible at http://${publicIp}:${port}`);
    } else {
      console.log(`❌ External connection failed`);
      console.log('   Your port does not appear to be accessible from the internet');
      console.log('\nPossible issues:');
      console.log('1. Port forwarding is not set up correctly on your router');
      console.log('2. Your firewall is blocking incoming connections');
      console.log('3. Your ISP is blocking incoming connections on this port');
      console.log('4. The public IP address in your .env file is incorrect');
    }
  } catch (err) {
    console.log(`❌ Error testing external connection: ${err.message}`);
  }
  
  console.log('\nManual verification:');
  console.log('1. Use your phone with Wi-Fi turned OFF (using mobile data)');
  console.log(`2. Try to access http://${publicIp}:${port} in your phone's browser`);
  console.log('3. If the page loads, your port forwarding is working correctly');
}

// Run the tests
runTests();
