#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🔧 Fixing Sharp installation for Vercel...');

try {
  // Remove node_modules and package-lock
  console.log('1. Cleaning up existing installations...');
  if (fs.existsSync('node_modules')) {
    execSync('rm -rf node_modules', { stdio: 'inherit' });
  }
  if (fs.existsSync('package-lock.json')) {
    execSync('rm package-lock.json', { stdio: 'inherit' });
  }

  // Install dependencies fresh
  console.log('2. Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Force reinstall Sharp with specific platform
  console.log('3. Installing Sharp for Linux (Vercel compatibility)...');
  execSync('npm uninstall sharp', { stdio: 'inherit' });
  execSync('npm install sharp@0.32.6 --platform=linux --arch=x64', { stdio: 'inherit' });

  console.log('✅ Sharp installation fixed!');
  console.log('🚀 You can now deploy to Vercel');
  
} catch (error) {
  console.error('❌ Error fixing Sharp:', error.message);
  console.log('\n💡 Manual fix:');
  console.log('1. Delete node_modules and package-lock.json');
  console.log('2. Run: npm install');
  console.log('3. Use the simple upload endpoint: /api/upload/simple');
}