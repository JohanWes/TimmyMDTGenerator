// Script to help set up Windows Firewall rule for the application
const { exec } = require('child_process');
require('dotenv').config();

// Get port from environment variables with fallback
const port = process.env.PORT || 8005;
const appName = 'WarcraftLogsCastAnalyzer';

console.log(`=== Windows Firewall Setup for ${appName} ===`);
console.log(`This script will create a Windows Firewall rule to allow incoming connections on port ${port}.`);
console.log('You may be prompted for administrator permissions.\n');

// Command to create firewall rule
const command = `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-Command New-NetFirewallRule -DisplayName \\\"${appName}\\\" -Direction Inbound -Action Allow -Protocol TCP -LocalPort ${port} -Program \\\"$process:FullPath\\\"'"`;

console.log('Executing command to create firewall rule...');
console.log('If a UAC prompt appears, click "Yes" to allow the operation.\n');

// Execute the command
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    console.log('\nManual setup instructions:');
    console.log('1. Open Windows Defender Firewall with Advanced Security (search for "firewall" in Start menu)');
    console.log('2. Click on "Inbound Rules" in the left panel');
    console.log('3. Click on "New Rule..." in the right panel');
    console.log('4. Select "Port" and click Next');
    console.log('5. Select "TCP" and enter "8005" for the port, then click Next');
    console.log('6. Select "Allow the connection" and click Next');
    console.log('7. Select when the rule applies (Domain, Private, Public) and click Next');
    console.log(`8. Enter a name for the rule (e.g., "${appName}") and click Finish`);
    return;
  }
  
  if (stderr) {
    console.error(`Error: ${stderr}`);
    return;
  }
  
  console.log('Firewall rule creation initiated.');
  console.log(`A rule named "${appName}" should now be created to allow incoming connections on port ${port}.`);
  console.log('\nTo verify the rule was created:');
  console.log('1. Open Windows Defender Firewall with Advanced Security');
  console.log('2. Click on "Inbound Rules" in the left panel');
  console.log(`3. Look for a rule named "${appName}" in the list`);
});
