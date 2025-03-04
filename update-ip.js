// Script to update the public IP address in the .env file
const fs = require('fs');
const https = require('https');
const path = require('path');
require('dotenv').config();

// Get current public IP address
function getPublicIP() {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(data.trim());
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Update the .env file with the new IP address
function updateEnvFile(publicIP) {
  return new Promise((resolve, reject) => {
    const envPath = path.resolve(process.cwd(), '.env');
    
    // Read the current .env file
    fs.readFile(envPath, 'utf8', (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      
      // Replace the PUBLIC_IP line or add it if it doesn't exist
      let updatedData;
      if (data.includes('PUBLIC_IP=')) {
        updatedData = data.replace(/PUBLIC_IP=.*/g, `PUBLIC_IP=${publicIP}`);
      } else {
        updatedData = data + `\nPUBLIC_IP=${publicIP}\n`;
      }
      
      // Write the updated content back to the .env file
      fs.writeFile(envPath, updatedData, 'utf8', (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  });
}

// Main function
async function updateIP() {
  console.log('=== Public IP Address Updater ===');
  console.log('Checking your current public IP address...');
  
  try {
    // Get the current public IP
    const publicIP = await getPublicIP();
    console.log(`Your current public IP address is: ${publicIP}`);
    
    // Get the IP from the .env file
    const envIP = process.env.PUBLIC_IP;
    
    if (envIP === publicIP) {
      console.log('\n✅ Your .env file already has the correct IP address.');
      console.log(`Current setting: PUBLIC_IP=${envIP}`);
      return;
    }
    
    console.log(`\nYour .env file has a different IP: ${envIP || 'Not set'}`);
    console.log('Updating .env file with your current public IP...');
    
    // Update the .env file
    await updateEnvFile(publicIP);
    
    console.log('\n✅ Successfully updated .env file!');
    console.log(`Updated setting: PUBLIC_IP=${publicIP}`);
    console.log('\nYou may need to restart your server for changes to take effect:');
    console.log('1. Stop the current server (Ctrl+C in the terminal running the server)');
    console.log('2. Start it again with "npm start"');
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    console.log('Could not update the IP address. Please check your internet connection.');
  }
}

// Run the update
updateIP();
