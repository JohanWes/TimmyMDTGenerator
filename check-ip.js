// Simple script to check local and public IP addresses
const os = require('os');
const https = require('https');

// Get local IP addresses
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const interfaceName in interfaces) {
    const interface = interfaces[interfaceName];
    
    for (const iface of interface) {
      // Skip internal and non-IPv4 addresses
      if (iface.internal || iface.family !== 'IPv4') {
        continue;
      }
      
      addresses.push({
        interface: interfaceName,
        address: iface.address
      });
    }
  }
  
  return addresses;
}

// Get public IP address using a third-party service
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

// Display IP information
async function displayIPInfo() {
  console.log('=== Local Network Information ===');
  console.log('These are your local IP addresses:');
  
  const localIPs = getLocalIPs();
  if (localIPs.length === 0) {
    console.log('No network interfaces found');
  } else {
    localIPs.forEach(ip => {
      console.log(`- ${ip.interface}: ${ip.address}`);
    });
    
    // Suggest which IP to use for port forwarding
    if (localIPs.length > 0) {
      console.log('\nFor port forwarding, you likely want to use:');
      // Prefer ethernet over wifi if available
      const ethernet = localIPs.find(ip => ip.interface.toLowerCase().includes('ethernet'));
      const suggested = ethernet || localIPs[0];
      console.log(`${suggested.address} (${suggested.interface})`);
    }
  }
  
  console.log('\n=== Public IP Information ===');
  try {
    const publicIP = await getPublicIP();
    console.log(`Your public IP address is: ${publicIP}`);
    
    // Check if it matches the one in .env
    try {
      require('dotenv').config();
      const envIP = process.env.PUBLIC_IP;
      
      if (envIP && envIP !== publicIP) {
        console.log(`\nNOTE: This differs from the IP in your .env file (${envIP})`);
        console.log('If your public IP has changed, update your .env file:');
        console.log('PUBLIC_IP=' + publicIP);
      }
    } catch (err) {
      // Ignore .env errors
    }
  } catch (err) {
    console.log('Could not determine public IP:', err.message);
  }
  
  console.log('\n=== Port Forwarding Instructions ===');
  console.log('To make your application accessible from the internet:');
  console.log('1. Access your router admin panel');
  console.log('2. Find the port forwarding section');
  console.log('3. Create a rule to forward external port 8005 to internal port 8005');
  console.log('4. Use your local IP address as the destination');
  console.log('5. Make sure Windows Firewall allows incoming connections on port 8005');
}

// Run the function
displayIPInfo();
