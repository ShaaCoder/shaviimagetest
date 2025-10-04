import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import { createSuccessResponse, createErrorResponse, handleApiError } from '@/lib/api-helpers';

// Helper function to get Shiprocket auth token
async function getShiprocketToken(): Promise<string | null> {
  try {
    const response = await fetch(`${process.env.SHIPROCKET_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to authenticate with Shiprocket: ${response.status}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Shiprocket authentication error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get session using NextAuth
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return createErrorResponse(
        'Authentication required',
        401,
        'Unauthorized'
      );
    }

    // Get user from database using session info
    const currentUser = await User.findOne({ 
      email: session.user.email 
    }).select('-password');

    if (!currentUser) {
      return createErrorResponse(
        'User not found',
        404,
        'Not Found'
      );
    }

    if (currentUser.role !== 'admin') {
      return createErrorResponse('Insufficient permissions', 403, 'Authorization Error');
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return createErrorResponse(
        'Order ID is required',
        400,
        'Validation Error'
      );
    }

    // Get the order with shipping details
    const order = await Order.findById(orderId);
    if (!order) {
      return createErrorResponse(
        'Order not found',
        404,
        'Not Found'
      );
    }

    // Check if order is confirmed and has shipping address
    if (order.status !== 'confirmed' && order.status !== 'shipped') {
      return createErrorResponse(
        'Order must be confirmed to create shipment',
        400,
        'Invalid Order Status'
      );
    }

    if (!order.shippingAddress) {
      return createErrorResponse(
        'Order must have shipping address',
        400,
        'Missing Shipping Address'
      );
    }

    // Get Shiprocket auth token
    const token = await getShiprocketToken();
    if (!token) {
      return createErrorResponse(
        'Failed to authenticate with Shiprocket',
        500,
        'Authentication Error'
      );
    }

    // Prepare shipment data using stored shipping details
    const shipmentData: any = {
      order_id: order.orderNumber,
      order_date: order.createdAt.toISOString().split('T')[0], // YYYY-MM-DD format
      pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION_ID || '10304720',
      company_name: process.env.EMAIL_FROM_NAME || 'Your E-commerce Store',
      billing_customer_name: order.shippingAddress.name,
      billing_last_name: '',
      billing_address: order.shippingAddress.address,
      billing_city: order.shippingAddress.city,
      billing_pincode: order.shippingAddress.pincode,
      billing_state: order.shippingAddress.state,
      billing_country: 'India',
      billing_email: order.userId ? (await User.findById(order.userId))?.email || '' : '',
      billing_phone: order.shippingAddress.phone,
      shipping_is_billing: true, // Same as billing for simplicity
      order_items: order.items.map((item: any) => ({
        name: item.name,
        units: item.quantity,
        selling_price: item.price
      })),
      payment_method: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: order.subtotal,
      length: 10, // Default dimensions - you might want to add these to product model
      breadth: 10,
      height: 10,
      weight: 0.5 * order.items.reduce((sum: number, item: any) => sum + item.quantity, 0) // Estimate weight
    };

    // If we have stored shipping details, use the selected courier
    if ((order as any).shippingDetails && (order as any).shippingDetails.courierCompanyId) {
      shipmentData.courier_company = (order as any).shippingDetails.courierCompanyId;
    }

    // Create shipment in Shiprocket
    const shipmentResponse = await fetch(`${process.env.SHIPROCKET_BASE_URL}/orders/create/adhoc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(shipmentData),
    });

    if (!shipmentResponse.ok) {
      const errorData = await shipmentResponse.json();
      console.error('Shiprocket shipment creation failed:', errorData);
      return createErrorResponse(
        errorData.message || 'Failed to create shipment in Shiprocket',
        shipmentResponse.status,
        'Shiprocket API Error'
      );
    }

    const shipmentResult = await shipmentResponse.json();

    if (!shipmentResult.order_id) {
      return createErrorResponse(
        'Invalid response from Shiprocket',
        500,
        'Shipment Creation Failed'
      );
    }

    // Update order with shipment information
    const updateData: any = {
      status: 'shipped',
      shippedAt: new Date(),
      trackingNumber: shipmentResult.awb_code,
      carrier: (order as any).shippingDetails?.courierName || 'Shiprocket',
    };

    // Update shipping details with shipment info
    if ((order as any).shippingDetails) {
      updateData.shippingDetails = {
        ...(order as any).shippingDetails,
        shipmentId: shipmentResult.shipment_id,
        awbCode: shipmentResult.awb_code,
      };
    }

    await Order.findByIdAndUpdate(orderId, { $set: updateData });

    // Return success response with complete shipment details
    return createSuccessResponse({
      shipmentId: shipmentResult.shipment_id,
      orderId: shipmentResult.order_id,
      awbCode: shipmentResult.awb_code,
      courierName: (order as any).shippingDetails?.courierName || 'Shiprocket',
      courierCompanyId: (order as any).shippingDetails?.courierCompanyId,
      estimatedDelivery: (order as any).shippingDetails?.estimatedDeliveryTime,
      trackingUrl: `https://shiprocket.co/tracking/${shipmentResult.awb_code}`,
      shippingCharges: {
        freight: (order as any).shippingDetails?.freightCharge || order.shipping,
        cod: (order as any).shippingDetails?.codCharge || 0,
        total: (order as any).shippingDetails?.totalShippingCharge || order.shipping,
      }
    }, 'Shipment created successfully with selected courier and rates');

  } catch (error) {
    console.error('Enhanced shipment creation error:', error);
    return handleApiError(error, 'POST /api/delivery/create-enhanced-shipment');
  }
}