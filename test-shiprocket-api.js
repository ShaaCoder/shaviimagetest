/**
 * Shiprocket API Test Script
 * 
 * This script directly tests the Shiprocket API to identify connection issues
 */

require('dotenv').config();
const fetch = require('node-fetch');

// Shiprocket Configuration
const SHIPROCKET_CONFIG = {
  email: process.env.SHIPROCKET_EMAIL,
  password: process.env.SHIPROCKET_PASSWORD,
  baseUrl: process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external',
  pickupLocationId: process.env.SHIPROCKET_PICKUP_LOCATION_ID,
  pickupPincode: process.env.SHIPROCKET_PICKUP_PINCODE || '110086'
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const color = colors[type] || colors.reset;
  console.log(`${color}[${timestamp}] ${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bold}${colors.blue}${title}${colors.reset}`);
  console.log('='.repeat(60));
}

async function testShiprocketAuth() {
  logSection('1. TESTING SHIPROCKET AUTHENTICATION');
  
  try {
    log('Attempting to authenticate with Shiprocket...', 'blue');
    log(`Email: ${SHIPROCKET_CONFIG.email}`, 'blue');
    log(`Base URL: ${SHIPROCKET_CONFIG.baseUrl}`, 'blue');
    
    const authResponse = await fetch(`${SHIPROCKET_CONFIG.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: SHIPROCKET_CONFIG.email,
        password: SHIPROCKET_CONFIG.password,
      }),
    });

    const authData = await authResponse.json();
    
    if (authResponse.ok && authData.token) {
      log('✅ Authentication successful!', 'green');
      log(`Token: ${authData.token.substring(0, 20)}...`, 'green');
      return authData.token;
    } else {
      log('❌ Authentication failed!', 'red');
      log(`Status: ${authResponse.status}`, 'red');
      log(`Response: ${JSON.stringify(authData, null, 2)}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Authentication error: ${error.message}`, 'red');
    return null;
  }
}

async function testPickupLocations(token) {
  logSection('2. TESTING PICKUP LOCATIONS');
  
  try {
    log('Fetching pickup locations...', 'blue');
    
    const response = await fetch(`${SHIPROCKET_CONFIG.baseUrl}/settings/company/pickup`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      log('✅ Pickup locations fetched successfully!', 'green');
      
      if (data.data && data.data.shipping_address) {
        const locations = data.data.shipping_address;
        log(`Found ${locations.length} pickup locations:`, 'green');
        
        locations.forEach((location, index) => {
          log(`  ${index + 1}. ID: ${location.id} - ${location.pickup_location}`, 'green');
          log(`     Address: ${location.address}, ${location.city}, ${location.state} - ${location.pin_code}`, 'green');
          log(`     Status: ${location.status === 1 ? 'Active' : 'Inactive'}`, location.status === 1 ? 'green' : 'yellow');
        });
        
        // Check if our configured pickup location exists
        const configuredLocation = locations.find(loc => loc.id.toString() === SHIPROCKET_CONFIG.pickupLocationId);
        if (configuredLocation) {
          log(`✅ Configured pickup location (${SHIPROCKET_CONFIG.pickupLocationId}) found and is ${configuredLocation.status === 1 ? 'active' : 'inactive'}`, 'green');
          return configuredLocation;
        } else {
          log(`❌ Configured pickup location (${SHIPROCKET_CONFIG.pickupLocationId}) not found!`, 'red');
          log(`Available location IDs: ${locations.map(loc => loc.id).join(', ')}`, 'yellow');
        }
      }
    } else {
      log('❌ Failed to fetch pickup locations!', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Response: ${JSON.stringify(data, null, 2)}`, 'red');
    }
    
    return null;
  } catch (error) {
    log(`❌ Pickup locations error: ${error.message}`, 'red');
    return null;
  }
}

async function testOrderCreation(token) {
  logSection('3. TESTING ORDER CREATION');
  
  try {
    log('Creating test order in Shiprocket...', 'blue');
    
    // Test order data
    const testOrderData = {
      order_id: `TEST_${Date.now()}`,
      order_date: new Date().toISOString().split('T')[0],
      billing_customer_name: 'Test Customer',
      billing_last_name: '',
      billing_address: 'Test Address, Test Area',
      billing_city: 'Mumbai',
      billing_pincode: '400001',
      billing_state: 'Maharashtra',
      billing_country: 'India',
      billing_email: 'test@example.com',
      billing_phone: '9876543210',
      shipping_is_billing: true,
      order_items: [{
        name: 'Test Product',
        sku: 'TEST001',
        units: 1,
        selling_price: 100,
      }],
      payment_method: 'COD',
      sub_total: 100,
      length: 15,
      breadth: 10,
      height: 5,
      weight: 0.5, // 500g in kg
    };

    log(`Test Order Data: ${JSON.stringify(testOrderData, null, 2)}`, 'blue');

    const response = await fetch(`${SHIPROCKET_CONFIG.baseUrl}/orders/create/adhoc`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrderData),
    });

    const data = await response.json();
    
    log(`Response Status: ${response.status}`, 'blue');
    log(`Response Data: ${JSON.stringify(data, null, 2)}`, 'blue');

    if (response.ok && (data.status === 1 || data.status_code === 1 || data.order_id)) {
      log('✅ Order created successfully!', 'green');
      log(`Order ID: ${data.order_id}`, 'green');
      log(`Shipment ID: ${data.shipment_id}`, 'green');
      return data;
    } else {
      log('❌ Order creation failed!', 'red');
      log(`Status: ${response.status}`, 'red');
      log(`Error details:`, 'red');
      
      if (data.errors) {
        Object.keys(data.errors).forEach(key => {
          log(`  ${key}: ${data.errors[key]}`, 'red');
        });
      }
      
      if (data.message) {
        log(`  Message: ${data.message}`, 'red');
      }
      
      return null;
    }
  } catch (error) {
    log(`❌ Order creation error: ${error.message}`, 'red');
    return null;
  }
}

async function testServiceability(token) {
  logSection('4. TESTING SERVICEABILITY CHECK');
  
  try {
    log('Testing serviceability check...', 'blue');
    
    const fromPincode = SHIPROCKET_CONFIG.pickupPincode;
    const toPincode = '400001';
    const weight = 0.5;
    const cod = 1;
    
    const url = `${SHIPROCKET_CONFIG.baseUrl}/courier/serviceability/?pickup_postcode=${fromPincode}&delivery_postcode=${toPincode}&weight=${weight}&cod=${cod}`;
    log(`Serviceability URL: ${url}`, 'blue');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      log('✅ Serviceability check successful!', 'green');
      
      if (data.data && data.data.available_courier_companies) {
        const couriers = data.data.available_courier_companies;
        log(`Found ${couriers.length} available couriers:`, 'green');
        
        couriers.forEach((courier, index) => {
          log(`  ${index + 1}. ${courier.courier_name}`, 'green');
          log(`     Rate: ₹${courier.rate}`, 'green');
          log(`     COD: ${courier.cod === 1 ? 'Available' : 'Not Available'}`, 'green');
          log(`     ETA: ${courier.etd} days`, 'green');
        });
      }
    } else {
      log('❌ Serviceability check failed!', 'red');
      log(`Response: ${JSON.stringify(data, null, 2)}`, 'red');
    }
  } catch (error) {
    log(`❌ Serviceability error: ${error.message}`, 'red');
  }
}

async function runShiprocketTests() {
  logSection('🚀 STARTING SHIPROCKET API TESTS');
  
  // Check configuration
  if (!SHIPROCKET_CONFIG.email || !SHIPROCKET_CONFIG.password) {
    log('❌ Shiprocket credentials not configured!', 'red');
    log('Please check your .env file for SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD', 'red');
    return;
  }
  
  log('Configuration:', 'blue');
  log(`  Email: ${SHIPROCKET_CONFIG.email}`, 'blue');
  log(`  Base URL: ${SHIPROCKET_CONFIG.baseUrl}`, 'blue');
  log(`  Pickup Location ID: ${SHIPROCKET_CONFIG.pickupLocationId}`, 'blue');
  log(`  Force Mock: ${process.env.FORCE_MOCK_DELIVERY}`, 'blue');
  
  // Test authentication
  const token = await testShiprocketAuth();
  if (!token) {
    log('❌ Cannot proceed without authentication', 'red');
    return;
  }
  
  // Test pickup locations
  await testPickupLocations(token);
  
  // Test serviceability
  await testServiceability(token);
  
  // Test order creation
  await testOrderCreation(token);
  
  logSection('📋 TEST SUMMARY');
  log('Shiprocket API tests completed!', 'green');
  log('If order creation was successful, orders should now appear in your Shiprocket dashboard.', 'green');
  log('If tests failed, check the error messages above for troubleshooting.', 'yellow');
}

// Run the tests
runShiprocketTests().catch(error => {
  log(`❌ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});