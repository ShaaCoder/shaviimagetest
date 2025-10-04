#!/usr/bin/env node

/**
 * Test script for upload endpoint debugging
 * Run this to test your upload endpoint in production
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Configuration
const PRODUCTION_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.vercel.app';
const LOCAL_URL = 'http://localhost:3000';

async function testEndpoint(baseUrl) {
  console.log(`\n🧪 Testing upload endpoint: ${baseUrl}/api/upload/images`);
  
  try {
    // Test 1: OPTIONS request (CORS preflight)
    console.log('\n1️⃣ Testing OPTIONS request (CORS preflight)...');
    await testOptions(baseUrl);
    
    // Test 2: GET request (endpoint availability)
    console.log('\n2️⃣ Testing GET request (endpoint availability)...');
    await testGet(baseUrl);
    
    // Test 3: POST request with actual file
    console.log('\n3️⃣ Testing POST request (file upload)...');
    await testPost(baseUrl);
    
  } catch (error) {
    console.error(`❌ Error testing ${baseUrl}:`, error.message);
  }
}

function testOptions(baseUrl) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/api/upload/images`;
    const client = baseUrl.startsWith('https') ? https : http;
    
    const req = client.request(url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type'
      }
    }, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   CORS Headers:`, {
        'Access-Control-Allow-Origin': res.headers['access-control-allow-origin'],
        'Access-Control-Allow-Methods': res.headers['access-control-allow-methods'],
        'Access-Control-Allow-Headers': res.headers['access-control-allow-headers']
      });
      
      if (res.statusCode === 200) {
        console.log('   ✅ OPTIONS request successful');
        resolve();
      } else {
        reject(new Error(`OPTIONS failed with status ${res.statusCode}`));
      }
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('OPTIONS request timeout')));
    req.end();
  });
}

function testGet(baseUrl) {
  return new Promise((resolve, reject) => {
    const url = `${baseUrl}/api/upload/images`;
    const client = baseUrl.startsWith('https') ? https : http;
    
    const req = client.request(url, {
      method: 'GET'
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
          console.log('   Response:', JSON.parse(data));
          console.log('   ✅ GET request successful');
          resolve();
        } else {
          console.log('   Error response:', data);
          reject(new Error(`GET failed with status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => reject(new Error('GET request timeout')));
    req.end();
  });
}

function testPost(baseUrl) {
  return new Promise((resolve, reject) => {
    // Create a test image buffer (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
      0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x25,
      0xDB, 0x56, 0xCA, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    const form = new FormData();
    form.append('images', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    form.append('type', 'products');
    form.append('optimization', 'fast');
    
    const url = `${baseUrl}/api/upload/images`;
    const client = baseUrl.startsWith('https') ? https : http;
    
    const req = client.request(url, {
      method: 'POST',
      headers: form.getHeaders()
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log('   ✅ POST request successful');
            console.log('   Upload result:', {
              success: result.success,
              filesUploaded: result.images?.length || 0,
              message: result.message
            });
            resolve();
          } catch (e) {
            console.log('   Response (non-JSON):', data.substring(0, 200));
            resolve();
          }
        } else {
          console.log('   ❌ POST failed');
          console.log('   Error response:', data.substring(0, 500));
          
          // Special case for 405 Method Not Allowed
          if (res.statusCode === 405) {
            console.log('   🔍 405 Method Not Allowed - This is the issue!');
            console.log('   Allow header:', res.headers['allow']);
          }
          
          reject(new Error(`POST failed with status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => reject(new Error('POST request timeout')));
    
    form.pipe(req);
  });
}

// Main execution
async function main() {
  console.log('🚀 Upload Endpoint Tester');
  console.log('========================');
  
  // Test localhost if available
  if (process.env.NODE_ENV !== 'production') {
    try {
      await testEndpoint(LOCAL_URL);
    } catch (error) {
      console.log('⚠️ Localhost testing skipped (server not running)');
    }
  }
  
  // Test production
  console.log('\n🌐 Testing Production Environment');
  console.log('=================================');
  await testEndpoint(PRODUCTION_URL);
  
  console.log('\n✨ Testing complete!');
  console.log('\n💡 If you see 405 errors in production but not locally:');
  console.log('   1. Check your deployment logs');
  console.log('   2. Verify all exports in route.ts (POST, OPTIONS, GET)');
  console.log('   3. Check middleware blocking patterns');
  console.log('   4. Verify Vercel function configuration');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testEndpoint };