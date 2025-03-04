// Script to install dependencies and start the server
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Timtommy MDT generator Setup and Start ===');

// Check if node_modules directory exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
const hasNodeModules = fs.existsSync(nodeModulesPath);

if (!hasNodeModules) {
  console.log('Node modules not found. Installing dependencies...');
  try {
    // Run npm install
    console.log('Running npm install...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully!');
  } catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
    console.log('\nPlease try running "npm install" manually.');
    process.exit(1);
  }
} else {
  console.log('Node modules found. Checking for dotenv...');
  
  // Check specifically for dotenv
  try {
    require.resolve('dotenv');
    console.log('✅ dotenv module found.');
  } catch (e) {
    console.log('❌ dotenv module not found. Installing...');
    try {
      execSync('npm install dotenv', { stdio: 'inherit' });
      console.log('✅ dotenv installed successfully!');
    } catch (error) {
      console.error('❌ Error installing dotenv:', error.message);
      console.log('\nPlease try running "npm install dotenv" manually.');
      process.exit(1);
    }
  }
}

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.log('Creating .env file...');
  const envContent = 'PUBLIC_IP=YOUR_PUBLIC_IP\nPORT=8005\n';
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file created.');
}

// Start the server
console.log('\nStarting the server...');
try {
  execSync('node server.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Error starting the server:', error.message);
  process.exit(1);
}
