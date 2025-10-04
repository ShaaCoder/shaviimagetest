/**
 * Create Checkout Session API
 * 
 * POST /api/payments/create-checkout - Create a Stripe checkout session
 */

import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { createCheckoutSession, stripe, formatAmountForStripe } from '@/lib/stripe';
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  rateLimit,
  getClientIP,
  withAuth
} from '@/lib/api-helpers';
import Order from '@/models/Order';
import Product from '@/models/Product';
import Offer from '@/models/Offer';
import Category from '@/models/Category';
import { getShiprocketRates, computeHybridShipping } from '@/lib/shiprocket';

export async function POST(request: NextRequest) {
  return withAuth(async (req, user) => {
    try {
      await connectDB();

      // Rate limiting
      const clientIP = getClientIP(req);
      const rateLimitResult = rateLimit(`checkout_session_${clientIP}`, 10, 60000);
      
      if (!rateLimitResult.allowed) {
        return createErrorResponse(
          'Too many requests',
          429,
          'Rate limit exceeded'
        );
      }

      const body = await req.json();
      const { items, shippingAddress, couponCode, selectedShippingRate } = body;

      // Validate required fields
      if (!items || !Array.isArray(items) || items.length === 0) {
        return createErrorResponse(
          'Items are required',
          400,
          'Validation Error'
        );
      }

      if (!shippingAddress) {
        return createErrorResponse(
          'Shipping address is required',
          400,
          'Validation Error'
        );
      }

      // Calculate total amount
      let subtotal = 0;
      const lineItems = [];

      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return createErrorResponse(
            `Product not found: ${item.productId}`,
            404,
            'Not Found'
          );
        }

        const itemTotal = product.price * item.quantity;
        subtotal += itemTotal;

        lineItems.push({
          price_data: {
            currency: 'inr',
            product_data: {
              name: product.name,
              description: product.description.substring(0, 100),
              images: [product.images[0]],
            },
            unit_amount: Math.round(product.price * 100), // Convert to paise
          },
          quantity: item.quantity,
        });
      }

      // Add shipping cost (hybrid with Shiprocket)
      let shipping = subtotal > 999 ? 0 : 99;
      try {
        const threshold = parseInt(process.env.FREE_SHIPPING_THRESHOLD || '999', 10);
        const rates = await getShiprocketRates({
          delivery_postcode: shippingAddress.pincode,
          items: items.map((i: any) => ({ quantity: i.quantity, price: i.price, weight: i.weight })),
          cod: 0,
          declared_value: subtotal,
        });
        if (rates && rates.length > 0 && selectedShippingRate) {
          const { effectiveShipping } = computeHybridShipping({
            subtotal,
            selectedRate: selectedShippingRate,
            allRates: rates,
            threshold,
          });
          shipping = effectiveShipping;
        }
      } catch (e) {
        console.warn('Shiprocket hybrid shipping failed (card flow), using fallback:', e);
      }

      // Apply coupon/offer if provided
      let discount = 0;
      if (couponCode) {
        const offer = await Offer.findOne({ code: String(couponCode).toUpperCase() });
        if (!offer) {
          return createErrorResponse('Invalid offer code', 404, 'Offer not found');
        }
        if (!(offer as any).isValid()) {
          return createErrorResponse('Offer not available', 400, 'This offer is not active or has expired');
        }
        if (subtotal < offer.minAmount) {
          return createErrorResponse('Minimum amount not met', 400, `Minimum order amount is ₹${offer.minAmount}`);
        }

        // Check applicability (category/brand/product)
        let applicable = true;
        if ((offer.categories?.length || 0) > 0 || (offer.brands?.length || 0) > 0 || (offer.products?.length || 0) > 0) {
          applicable = false;
          for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) continue;
            if (offer.brands?.length && offer.brands.includes(product.brand)) {
              applicable = true; break;
            }
            if (offer.products?.length && offer.products.includes(String(item.productId))) {
              applicable = true; break;
            }
            if (offer.categories?.length && product.category) {
              try {
                const cat = await Category.findById(product.category).select('name slug');
                if (cat && (offer.categories.includes(cat.slug) || offer.categories.includes(cat.name))) {
                  applicable = true; break;
                }
              } catch {}
            }
          }
        }
        if (!applicable) {
          return createErrorResponse('Offer not applicable', 400, 'This offer is not applicable to items in your cart');
        }

        if (offer.type === 'shipping') {
          discount = shipping;
        } else {
          discount = (offer as any).calculateDiscount(subtotal, items);
        }
      }

      const total = Math.max(0, subtotal + shipping - discount);

      // Create order in database
      const order = new Order({
        userId: user._id,
        orderNumber: `NYK${Date.now()}`,
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
        })),
        subtotal,
        shipping,
        discount,
        total,
        status: 'pending',
        paymentStatus: 'pending',
        shippingAddress,
        paymentMethod: 'card',
        couponCode,
      });

      await order.save();

      // Add shipping as a separate line item so Stripe total matches UI
      if (shipping > 0) {
        lineItems.push({
          price_data: {
            currency: 'inr',
            product_data: { name: 'Shipping', description: 'Delivery charges' },
            unit_amount: formatAmountForStripe(shipping),
          },
          quantity: 1,
        } as any);
      }

      // Create checkout session
      let discountsParam: any = undefined;
      if (discount > 0) {
        try {
          // Without full offer details, create amount_off coupon equal to discount
          const coupon = await stripe.coupons.create({ amount_off: formatAmountForStripe(discount), currency: 'inr', duration: 'once' });
          discountsParam = [{ coupon: coupon.id }];
        } catch (e) {
          console.warn('Failed to create Stripe coupon for discount:', e);
        }
      }

      const session = await createCheckoutSession(
        lineItems,
        {
          orderId: order.id,
          userId: user._id.toString(),
          orderNumber: order.orderNumber,
        },
        user.email,
        discountsParam
      );

      // Update order with session ID
      order.stripeSessionId = session.id;
      await order.save();

      return createSuccessResponse({
        sessionId: session.id,
        url: session.url,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: total,
      }, 'Checkout session created successfully');

    } catch (error) {
      return handleApiError(error, 'POST /api/payments/create-checkout');
    }
  }, ['customer', 'admin'])(request);
}
