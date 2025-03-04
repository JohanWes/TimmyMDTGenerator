// Script to set up the application as a Windows service
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Get port from environment variables with fallback
const port = process.env.PORT || 8005;
const serviceName = 'WarcraftLogsCastAnalyzer';

console.log(`=== Setting up ${serviceName} as a Windows Service ===`);
console.log('This script will install the application as a Windows service that starts automatically on boot.');
console.log('You may be prompted for administrator permissions.\n');

// Check if node-windows is installed
console.log('Checking if node-windows is installed...');
try {
  require.resolve('node-windows');
  console.log('✅ node-windows is already installed.');
} catch (e) {
  console.log('❌ node-windows is not installed. Installing it now...');
  console.log('This may take a moment...\n');
  
  // Install node-windows
  exec('npm install node-windows --save', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error installing node-windows: ${error.message}`);
      console.log('Please install it manually with: npm install node-windows --save');
      process.exit(1);
    }
    
    console.log('✅ node-windows installed successfully.');
    console.log('Please run this script again to continue with the service installation.');
    process.exit(0);
  });
  
  // Exit early - user needs to run the script again after installation
  return;
}

// Create the service installation script
const serviceScriptPath = path.join(__dirname, 'install-service.js');
const serviceScript = `
// Windows Service installation script
const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: '${serviceName}',
  description: 'Timtommy MDT generator Web Server',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [],
  workingDirectory: __dirname,
  allowServiceLogon: true
});

// Listen for service install events
svc.on('install', function() {
  console.log('Service installed successfully!');
  svc.start();
});

svc.on('start', function() {
  console.log('Service started successfully!');
  console.log('The application will now start automatically when Windows boots up.');
  console.log('You can access it at:');
  console.log('- Local: http://localhost:${port}');
  console.log('- Public: http://<your-public-ip>:${port}');
  process.exit(0);
});

svc.on('error', function(err) {
  console.error('Error:', err);
  process.exit(1);
});

// Install the service
console.log('Installing service...');
console.log('If prompted, allow the application to make changes to your device.');
svc.install();
`;

// Create the service uninstallation script
const uninstallScriptPath = path.join(__dirname, 'uninstall-service.js');
const uninstallScript = `
// Windows Service uninstallation script
const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: '${serviceName}',
  script: path.join(__dirname, 'server.js')
});

// Listen for uninstall events
svc.on('uninstall', function() {
  console.log('Service uninstalled successfully!');
  console.log('The application will no longer start automatically when Windows boots up.');
  process.exit(0);
});

svc.on('error', function(err) {
  console.error('Error:', err);
  process.exit(1);
});

// Uninstall the service
console.log('Uninstalling service...');
console.log('If prompted, allow the application to make changes to your device.');
svc.uninstall();
`;

// Write the service installation script
fs.writeFileSync(serviceScriptPath, serviceScript);
console.log(`Created service installation script: ${serviceScriptPath}`);

// Write the service uninstallation script
fs.writeFileSync(uninstallScriptPath, uninstallScript);
console.log(`Created service uninstallation script: ${uninstallScriptPath}`);

// Update package.json to add service scripts
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = require(packageJsonPath);
  
  // Add service scripts if they don't exist
  if (!packageJson.scripts['install-service']) {
    packageJson.scripts['install-service'] = 'node install-service.js';
  }
  
  if (!packageJson.scripts['uninstall-service']) {
    packageJson.scripts['uninstall-service'] = 'node uninstall-service.js';
  }
  
  // Write the updated package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('Updated package.json with service scripts.');
} catch (error) {
  console.error(`Error updating package.json: ${error.message}`);
  console.log('You can manually add these scripts to your package.json:');
  console.log('"install-service": "node install-service.js",');
  console.log('"uninstall-service": "node uninstall-service.js"');
}

console.log('\n✅ Setup completed successfully!');
console.log('\nTo install the service, run:');
console.log('npm run install-service');
console.log('\nTo uninstall the service, run:');
console.log('npm run uninstall-service');
