#!/usr/bin/env node

/**
 * Test Cloudinary configuration and upload functionality
 */

const https = require('https');

// Test configuration
const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testCloudinaryConfig() {
  console.log('🧪 Testing Cloudinary Configuration');
  console.log('================================');
  
  try {
    // Test the GET endpoint to check configuration
    const response = await fetch(`${DOMAIN}/api/upload/simple`);
    const data = await response.json();
    
    console.log('📊 Upload Endpoint Status:');
    console.log(`   Environment: ${data.environment}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Storage Enabled: ${data.storage?.enabled}`);
    console.log('');
    
    if (data.storage?.cloudinary) {
      console.log('☁️  Cloudinary Configuration:');
      console.log(`   Configured: ${data.storage.cloudinary.configured}`);
      console.log(`   Cloud Name: ${data.storage.cloudinary.cloudName}`);
      console.log(`   API Key: ${data.storage.cloudinary.apiKey}`);
      console.log(`   API Secret: ${data.storage.cloudinary.apiSecret}`);
      console.log('');
    }
    
    if (data.status === 'ready') {
      console.log('✅ Cloudinary is properly configured!');
      console.log('🚀 You can now upload images and they will be stored in Cloudinary');
    } else {
      console.log('❌ Cloudinary configuration needed');
      console.log('');
      console.log('🔧 To fix this:');
      console.log('1. Get your Cloudinary credentials from: https://cloudinary.com/console');
      console.log('2. Add these environment variables in Vercel:');
      console.log('   CLOUDINARY_CLOUD_NAME=your_cloud_name');
      console.log('   CLOUDINARY_API_KEY=your_api_key');
      console.log('   CLOUDINARY_API_SECRET=your_api_secret');
      console.log('');
      console.log('3. Redeploy your application');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('');
      console.log('💡 Make sure your development server is running:');
      console.log('   npm run dev');
    }
  }
}

async function testImageUpload() {
  console.log('');
  console.log('🖼️  Testing Image Upload');
  console.log('========================');
  
  try {
    // Create a simple test image (1x1 pixel PNG)
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
    
    // Create FormData
    const FormData = require('form-data');
    const form = new FormData();
    form.append('images', testImageBuffer, {
      filename: 'test.png',
      contentType: 'image/png'
    });
    form.append('type', 'products');
    
    console.log('📤 Uploading test image...');
    
    // Make upload request
    const response = await new Promise((resolve, reject) => {
      const req = https.request(`${DOMAIN}/api/upload/simple`, {
        method: 'POST',
        headers: form.getHeaders()
      }, resolve);
      
      req.on('error', reject);
      form.pipe(req);
    });
    
    let data = '';
    response.on('data', chunk => data += chunk);
    response.on('end', () => {
      try {
        const result = JSON.parse(data);
        
        if (response.statusCode === 200) {
          console.log('✅ Upload successful!');
          console.log(`📋 Response: ${result.message}`);
          
          if (result.images && result.images.length > 0) {
            console.log('🖼️  Uploaded images:');
            result.images.forEach((img, index) => {
              console.log(`   ${index + 1}. ${img}`);
              
              if (img.includes('cloudinary.com')) {
                console.log('      ✅ Stored in Cloudinary');
              } else if (img.includes('placeholder')) {
                console.log('      ⚠️  Using placeholder (Cloudinary not working)');
              }
            });
          }
        } else {
          console.log('❌ Upload failed:', result.message || result.error);
        }
      } catch (e) {
        console.log('❌ Failed to parse response:', data.substring(0, 200));
      }
    });
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message);
  }
}

// Main execution
async function main() {
  await testCloudinaryConfig();
  
  // Ask user if they want to test upload
  console.log('');
  console.log('Would you like to test image upload? (This will create a test upload)');
  
  // For automated testing, always run upload test
  await testImageUpload();
  
  console.log('');
  console.log('🎉 Testing complete!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testCloudinaryConfig, testImageUpload };