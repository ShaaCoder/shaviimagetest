import { NextRequest, NextResponse } from 'next/server';
import { getShiprocketRates, computeHybridShipping } from '@/lib/shiprocket';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pincode, items, cod = 0, declared_value } = body;

    // Validate required fields
    if (!pincode) {
      return NextResponse.json(
        { success: false, message: 'Pincode is required' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Cart items are required' },
        { status: 400 }
      );
    }

    // Check if we're in mock mode
    const forceMock = process.env.FORCE_MOCK_DELIVERY === 'true';
    
    console.log('🚢 Shipping Rate API called with:');
    console.log('  - Pincode:', pincode);
    console.log('  - Items count:', items.length);
    console.log('  - COD mode:', cod);
    console.log('  - Declared value:', declared_value);
    console.log('  - Force mock:', forceMock);
    
    if (forceMock) {
      // Return mock shipping rates for development
      const mockRates = [
        {
          courier_company_id: 1,
          courier_name: 'Standard Delivery',
          freight_charge: pincode.startsWith('4') ? 99 : 149,
          cod_charge: cod > 0 ? 49 : 0,
          other_charges: 0,
          total_charge: (pincode.startsWith('4') ? 99 : 149) + (cod > 0 ? 49 : 0),
          etd: '3-5 business days',
          rating: 4.2,
          is_surface: true,
          is_air: false,
        },
        {
          courier_company_id: 2,
          courier_name: 'Express Delivery',
          freight_charge: pincode.startsWith('4') ? 199 : 249,
          cod_charge: cod > 0 ? 49 : 0,
          other_charges: 0,
          total_charge: (pincode.startsWith('4') ? 199 : 249) + (cod > 0 ? 49 : 0),
          etd: '1-2 business days',
          rating: 4.5,
          is_surface: false,
          is_air: true,
        }
      ];

      return NextResponse.json({
        success: true,
        data: {
          available_courier_companies: mockRates,
          is_mock: true
        }
      });
    }

    // Use helper to fetch rates
    const rates = await getShiprocketRates({
      delivery_postcode: pincode,
      items,
      cod,
      declared_value,
    });

    if (!rates) {
      return NextResponse.json({ success: false, message: 'Failed to authenticate with Shiprocket' }, { status: 500 });
    }

    const threshold = parseInt(process.env.FREE_SHIPPING_THRESHOLD || '999', 10);
    const { coveredAmount, cheapestRate } = computeHybridShipping({
      subtotal: items.reduce((s: number, it: any) => s + (it.price * it.quantity), 0),
      selectedRate: null,
      allRates: rates,
      threshold,
    });

    // Normalize charges to ensure total_charge is present and numeric
    const normalized = (rates || []).map((r: any) => {
      const freight = Number(r.freight_charge ?? 0);
      const codc = Number(r.cod_charge ?? 0);
      const other = Number(r.other_charges ?? 0);
      const total = Number(r.total_charge ?? freight + codc + other);
      return {
        ...r,
        freight_charge: freight,
        cod_charge: codc,
        other_charges: other,
        total_charge: total,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        available_courier_companies: normalized,
        covered_amount: coveredAmount,
        cheapest_rate: cheapestRate,
        threshold,
      },
    });

  } catch (error) {
    console.error('Shipping rate calculation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to calculate shipping rates'
      },
      { status: 500 }
    );
  }
}