const fetch = require('node-fetch');

// Test the shipping rate calculation API
async function testShippingRateAPI() {
  console.log('🧪 Testing Shipping Rate Calculation API...\n');

  const testPincodes = [
    { code: '560001', area: 'Bangalore (4 prefix)' },
    { code: '110001', area: 'Delhi (1 prefix)' },
    { code: '400001', area: 'Mumbai (4 prefix)' },
    { code: '600001', area: 'Chennai (6 prefix)' }
  ];

  const testItems = [
    { productId: '1', quantity: 2, price: 599, weight: 0.3 },
    { productId: '2', quantity: 1, price: 1299, weight: 0.5 }
  ];

  for (const location of testPincodes) {
    try {
      console.log(`📍 Testing ${location.area} - PIN: ${location.code}`);
      
      const response = await fetch('http://localhost:3000/api/shipping/calculate-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pincode: location.code,
          items: testItems,
          cod: 0, // Test with regular payment first
          declared_value: testItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ API Response successful`);
        console.log(`📦 Available shipping options: ${data.data.available_courier_companies.length}`);
        
        data.data.available_courier_companies.forEach((courier, index) => {
          console.log(`   ${index + 1}. ${courier.courier_name}: ₹${courier.total_charge} (${courier.etd})`);
        });
        
        if (data.data.is_mock) {
          console.log(`🔧 Using mock data for testing`);
        }
      } else {
        console.log(`❌ API Error: ${data.message}`);
      }
      
      console.log(''); // Empty line for spacing
      
    } catch (error) {
      console.log(`❌ Request failed for ${location.code}: ${error.message}\n`);
    }
  }

  // Test COD scenario
  console.log('💸 Testing Cash on Delivery (COD) rates...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/shipping/calculate-rate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pincode: '560001',
        items: testItems,
        cod: 1, // Enable COD
        declared_value: testItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ COD API Response successful`);
      console.log(`📦 Available COD shipping options: ${data.data.available_courier_companies.length}`);
      
      data.data.available_courier_companies.forEach((courier, index) => {
        console.log(`   ${index + 1}. ${courier.courier_name}: ₹${courier.total_charge} (includes ₹${courier.cod_charge} COD charge)`);
      });
    } else {
      console.log(`❌ COD API Error: ${data.message}`);
    }
    
  } catch (error) {
    console.log(`❌ COD Request failed: ${error.message}`);
  }
}

// Test with invalid data
async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...\n');
  
  const errorTests = [
    { name: 'Invalid PIN code', data: { pincode: '12345', items: [{ productId: '1', quantity: 1, price: 100 }] } },
    { name: 'Empty items array', data: { pincode: '560001', items: [] } },
    { name: 'Missing pincode', data: { items: [{ productId: '1', quantity: 1, price: 100 }] } }
  ];

  for (const test of errorTests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      
      const response = await fetch('http://localhost:3000/api/shipping/calculate-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(test.data)
      });

      const data = await response.json();
      
      if (!data.success) {
        console.log(`✅ Correctly handled error: ${data.message}`);
      } else {
        console.log(`⚠️ Expected error but got success`);
      }
      
    } catch (error) {
      console.log(`✅ Correctly caught error: ${error.message}`);
    }
    
    console.log(''); // Empty line for spacing
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Testing Real-Time Checkout Flow with Shiprocket Integration\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    await testShippingRateAPI();
    await testErrorHandling();
    
    console.log('=' .repeat(60));
    console.log('✅ All tests completed! \n');
    console.log('📝 Next steps:');
    console.log('   1. Visit http://localhost:3000/checkout');
    console.log('   2. Add items to cart first if needed');
    console.log('   3. Enter a PIN code (try 560001, 110001, 400001)');
    console.log('   4. Watch shipping rates appear in real-time!');
    console.log('   5. Test different payment methods (COD vs Card/UPI)');
    console.log('\n🔧 Note: Currently using mock data for development');
    console.log('   Set FORCE_MOCK_DELIVERY=false in .env to use real Shiprocket API');
    
  } catch (error) {
    console.log(`❌ Test suite failed: ${error.message}`);
  }
}

// Run the tests
runTests();