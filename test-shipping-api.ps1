# Test the shipping rate calculation API
Write-Host "🚀 Testing Real-Time Checkout Flow with Shiprocket Integration" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Yellow

$testData = @{
    pincode = "560001"
    items = @(
        @{
            productId = "1"
            quantity = 2
            price = 599
            weight = 0.3
        },
        @{
            productId = "2" 
            quantity = 1
            price = 1299
            weight = 0.5
        }
    )
    cod = 0
    declared_value = 2497
}

$jsonBody = $testData | ConvertTo-Json -Depth 3

Write-Host "🧪 Testing Shipping Rate API with test data..." -ForegroundColor Cyan
Write-Host "📍 PIN Code: 560001 (Bangalore)" -ForegroundColor White
Write-Host "📦 Items: 2 products, total value ₹2,497" -ForegroundColor White

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/shipping/calculate-rate" -Method POST -Body $jsonBody -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ API Response successful!" -ForegroundColor Green
        Write-Host "📦 Available shipping options: $($response.data.available_courier_companies.Count)" -ForegroundColor White
        
        for ($i = 0; $i -lt $response.data.available_courier_companies.Count; $i++) {
            $courier = $response.data.available_courier_companies[$i]
            Write-Host "   $($i + 1). $($courier.courier_name): ₹$($courier.total_charge) ($($courier.etd))" -ForegroundColor White
        }
        
        if ($response.data.is_mock) {
            Write-Host "🔧 Using mock data for testing" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ API Error: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "💸 Testing COD rates..." -ForegroundColor Cyan

$testDataCOD = $testData.Clone()
$testDataCOD.cod = 1
$jsonBodyCOD = $testDataCOD | ConvertTo-Json -Depth 3

try {
    $responseCOD = Invoke-RestMethod -Uri "http://localhost:3000/api/shipping/calculate-rate" -Method POST -Body $jsonBodyCOD -ContentType "application/json"
    
    if ($responseCOD.success) {
        Write-Host "✅ COD API Response successful!" -ForegroundColor Green
        Write-Host "📦 Available COD shipping options: $($responseCOD.data.available_courier_companies.Count)" -ForegroundColor White
        
        for ($i = 0; $i -lt $responseCOD.data.available_courier_companies.Count; $i++) {
            $courier = $responseCOD.data.available_courier_companies[$i]
            Write-Host "   $($i + 1). $($courier.courier_name): ₹$($courier.total_charge) (includes ₹$($courier.cod_charge) COD charge)" -ForegroundColor White
        }
    } else {
        Write-Host "❌ COD API Error: $($responseCOD.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ COD Request failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "✅ Test completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Visit http://localhost:3000/checkout" -ForegroundColor White
Write-Host "   2. Add items to cart first if needed" -ForegroundColor White  
Write-Host "   3. Enter a PIN code (try 560001, 110001, 400001)" -ForegroundColor White
Write-Host "   4. Watch shipping rates appear in real-time!" -ForegroundColor White
Write-Host "   5. Test different payment methods (COD vs Card/UPI)" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Note: Currently using mock data for development" -ForegroundColor Yellow
Write-Host "   Set FORCE_MOCK_DELIVERY=false in .env to use real Shiprocket API" -ForegroundColor Yellow