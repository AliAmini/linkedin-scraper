import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

function findChromeExecutable(): string | undefined {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome Beta', 'Application', 'chrome.exe'),
  ];

  for (const chromePath of possiblePaths) {
    if (fs.existsSync(chromePath)) {
      return chromePath;
    }
  }
  
  return undefined;
}

function findUserDataDir(): string {
  return path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
}

console.log('Chrome Configuration Test');
console.log('========================');
console.log();

const chromeExecutable = findChromeExecutable();
const userDataDir = findUserDataDir();

console.log(`Chrome Executable: ${chromeExecutable || 'NOT FOUND'}`);
console.log(`User Data Directory: ${userDataDir}`);
console.log(`User Data Directory exists: ${fs.existsSync(userDataDir)}`);

if (chromeExecutable) {
  console.log('✅ Chrome executable found!');
} else {
  console.log('❌ Chrome executable not found. Please check your Chrome installation.');
}

if (fs.existsSync(userDataDir)) {
  console.log('✅ User data directory found!');
  
  // List available profiles
  const profilesDir = path.join(userDataDir, 'Local State');
  if (fs.existsSync(profilesDir)) {
    console.log('✅ Local State file exists (profiles should be available)');
  }
} else {
  console.log('❌ User data directory not found. Please check your Chrome installation.');
}

console.log();
console.log('If both are found, your scraper should work with existing Chrome profile!'); 