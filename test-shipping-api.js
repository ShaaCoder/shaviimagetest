/**
 * Test Shipping Rate API
 * 
 * This script directly tests the shipping rate calculation API
 */

const fetch = require('node-fetch');

async function testShippingAPI() {
  console.log('🧪 Testing Shipping Rate API');
  console.log('='.repeat(50));
  
  const testData = {
    pincode: '122001', // Same as in your screenshot
    items: [
      {
        productId: 'test-product',
        quantity: 1,
        price: 249.57,
        weight: 0.5 // 500g
      }
    ],
    cod: 1, // COD mode
    declared_value: 249.57
  };
  
  console.log('📋 Test Data:', JSON.stringify(testData, null, 2));
  
  try {
    console.log('\n🚀 Making API call to localhost:3000/api/shipping/calculate-rate...');
    
    const response = await fetch('http://localhost:3000/api/shipping/calculate-rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    
    console.log('\n📦 API Response:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success && result.data?.available_courier_companies) {
      console.log('\n✅ Success! Available shipping options:');
      result.data.available_courier_companies.forEach((courier, index) => {
        console.log(`  ${index + 1}. ${courier.courier_name}`);
        console.log(`     Total: ₹${courier.total_charge}`);
        console.log(`     Freight: ₹${courier.freight_charge}`);
        console.log(`     COD: ₹${courier.cod_charge}`);
        console.log(`     ETA: ${courier.etd}`);
        console.log('');
      });
    } else {
      console.log('\n❌ API call failed or returned no data');
    }
    
  } catch (error) {
    console.error('\n❌ Error testing shipping API:', error.message);
  }
}

// Instructions
console.log('📚 Instructions:');
console.log('1. Make sure your development server is running: npm run dev');
console.log('2. This will test the same pincode (122001) from your checkout');
console.log('3. Check the server logs for detailed debugging info');
console.log('');

testShippingAPI();