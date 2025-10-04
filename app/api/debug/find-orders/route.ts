/**
 * Debug Find Orders API
 * 
 * GET /api/debug/find-orders - Find recent orders and their email status
 */

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
} from '@/lib/api-helpers';
import Order from '@/models/Order';
import User from '@/models/User';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    console.log('🐛 Debug: Finding recent orders...');

    // Find recent orders
    const recentOrders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .lean() as any[];

    console.log('🐛 Debug: Found orders:', recentOrders.length);

    // Fix for "Expression produces a union type that is too complex to represent"
    // by explicitly typing the result array
    const ordersWithDetails: Array<{
      id: string;
      orderNumber: string;
      status: string;
      paymentStatus: string;
      total: number;
      createdAt: Date;
      customer: { name: string; email: string } | null;
      emailStatus: {
        confirmationEmailSent: boolean;
        confirmationEmailSentAt: Date | null;
        shippingEmailSent: boolean;
        shippingEmailSentAt: Date | null;
      };
    }> = await Promise.all(
      recentOrders.map(async (order: any) => {
        // Get customer details
        const customer = await User.findById(order.userId).select('name email');
        
        return {
          id: order._id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          paymentStatus: order.paymentStatus,
          total: order.total,
          createdAt: order.createdAt,
          customer: customer ? {
            name: customer.name,
            email: customer.email
          } : null,
          emailStatus: {
            confirmationEmailSent: order.confirmationEmailSent || false,
            confirmationEmailSentAt: order.confirmationEmailSentAt || null,
            shippingEmailSent: order.shippingEmailSent || false,
            shippingEmailSentAt: order.shippingEmailSentAt || null,
          }
        };
      })
    );

    return createSuccessResponse({
      orders: ordersWithDetails,
      totalFound: recentOrders.length,
      debugInfo: {
        message: 'Recent orders with email status',
        timestamp: new Date().toISOString()
      }
    }, `Found ${recentOrders.length} recent orders`);

  } catch (error) {
    console.error('🐛 Debug: Error in find-orders:', error);
    return handleApiError(error, 'GET /api/debug/find-orders');
  }
}