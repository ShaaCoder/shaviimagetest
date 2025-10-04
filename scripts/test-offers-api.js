// Test script to verify offers API works
const https = require('https');
const http = require('http');

async function testOffersAPI(baseUrl) {
  const url = `${baseUrl}/api/offers?active=true&limit=50`;
  console.log(`🧪 Testing: ${url}`);
  
  return new Promise((resolve, reject) => {
    const client = baseUrl.startsWith('https://') ? https : http;
    
    const req = client.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Script'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (parseError) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            rawData: data,
            parseError: parseError.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runTests() {
  const testUrls = [
    'http://localhost:3000',
    'https://shavistore-g1c2.vercel.app'  // Replace with your actual Vercel URL
  ];
  
  for (const baseUrl of testUrls) {
    try {
      console.log(`\n📍 Testing ${baseUrl}...`);
      const result = await testOffersAPI(baseUrl);
      
      console.log(`✅ Status: ${result.status}`);
      
      if (result.data) {
        console.log(`📊 Success: ${result.data.success}`);
        console.log(`📝 Message: ${result.data.message}`);
        if (result.data.data) {
          console.log(`🎯 Offers found: ${result.data.data.offers?.length || 0}`);
          console.log(`📈 Stats: Active=${result.data.data.stats?.active}, Total=${result.data.data.stats?.total}`);
        }
      } else if (result.rawData) {
        console.log(`📄 Raw response: ${result.rawData.substring(0, 200)}...`);
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${baseUrl}:`, error.message);
    }
  }
}

runTests();