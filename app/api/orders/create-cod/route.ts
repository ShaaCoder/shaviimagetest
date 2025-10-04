/**
 * Create COD Order API
 * 
 * POST /api/orders/create-cod - Create a Cash on Delivery order
 */

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import connectDB from '@/lib/mongodb';
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  rateLimit,
  getClientIP,
} from '@/lib/api-helpers';
import Order from '@/models/Order';
import Product from '@/models/Product';
import User from '@/models/User';
import Offer from '@/models/Offer';
import Category from '@/models/Category';
import { getShiprocketRates, computeHybridShipping } from '@/lib/shiprocket';

// Email sending function for COD orders (similar to webhook but for COD)
async function sendCODOrderConfirmationEmail(order: any) {
  try {
    console.log('📧 COD: Sending order confirmation email for:', order.orderNumber);
    
    // Get customer details
    const customer = await User.findById(order.userId).select('name email');
    
    if (!customer || !customer.email) {
      console.log('⚠️  COD: No customer email found for order:', order.orderNumber);
      return false;
    }
    
    if (order.confirmationEmailSent) {
      console.log('⚠️  COD: Email already sent for order:', order.orderNumber);
      return false;
    }
    
    const nodemailer = (await import('nodemailer')).default;
    const fs = await import('fs');
    const path = await import('path');
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    
    // Load and process template
    const templatePath = path.join(process.cwd(), 'lib', 'email-templates', 'order-confirmation.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf-8');
    
    // Simple template replacement
    htmlTemplate = htmlTemplate
      .replace(/{{orderNumber}}/g, order.orderNumber)
      .replace(/{{orderDate}}/g, new Date(order.createdAt).toLocaleDateString())
      .replace(/{{customerName}}/g, customer.name)
      .replace(/{{customerEmail}}/g, customer.email)
      .replace(/{{subtotal}}/g, order.subtotal.toFixed(2))
      .replace(/{{shipping}}/g, order.shipping.toFixed(2))
      .replace(/{{total}}/g, order.total.toFixed(2))
      .replace(/{{shippingAddress\.name}}/g, order.shippingAddress.name)
      .replace(/{{shippingAddress\.address}}/g, order.shippingAddress.address)
      .replace(/{{shippingAddress\.city}}/g, order.shippingAddress.city)
      .replace(/{{shippingAddress\.state}}/g, order.shippingAddress.state)
      .replace(/{{shippingAddress\.pincode}}/g, order.shippingAddress.pincode)
      .replace(/{{shippingAddress\.phone}}/g, order.shippingAddress.phone)
      .replace(/{{trackingUrl}}/g, `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/orders/${order._id}`)
      .replace(/{{companyName}}/g, process.env.EMAIL_FROM_NAME || 'Your E-commerce Store')
      .replace(/{{companyAddress}}/g, 'Your Store Address')
      .replace(/{{supportUrl}}/g, `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/support`)
      .replace(/{{returnUrl}}/g, `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/returns`)
      .replace(/{{unsubscribeUrl}}/g, `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/unsubscribe`);
    
    // Handle items
    const itemsHtml = order.items.map((item: any) => `
      <div class="order-item">
        <img src="${item.image}" alt="${item.name}" class="item-image">
        <div class="item-details">
          <div class="item-name">${item.name}</div>
          ${item.variant ? `<div class="item-variant">${item.variant}</div>` : ''}
          <div class="item-quantity">Quantity: ${item.quantity}</div>
        </div>
        <div class="item-price">₹${item.price.toFixed(2)}</div>
      </div>
    `).join('');
    
    htmlTemplate = htmlTemplate.replace(/{{#each items}}[\s\S]*?{{\/each}}/g, itemsHtml);
    htmlTemplate = htmlTemplate.replace(/{{#if discount}}[\s\S]*?{{\/if}}/g, order.discount > 0 ? `<div class="total-row"><span>Discount:</span><span>-₹${order.discount.toFixed(2)}</span></div>` : '');
    
    // Add COD-specific content
    htmlTemplate = htmlTemplate.replace(/Pay with Stripe/g, 'Cash on Delivery');
    htmlTemplate = htmlTemplate.replace(/payment.*processed/gi, 'payment will be collected on delivery');
    
    // Send email
    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || 'E-commerce Store',
        address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER || 'noreply@example.com',
      },
      to: customer.email,
      subject: `Order Confirmation - ${order.orderNumber} (Cash on Delivery)`,
      html: htmlTemplate,
      text: `Your COD order ${order.orderNumber} has been confirmed. Total: ₹${order.total.toFixed(2)} (to be paid on delivery)`,
    };
    
    const result = await transporter.sendMail(mailOptions);
    
    // Update order to mark email as sent
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        confirmationEmailSent: true,
        confirmationEmailSentAt: new Date()
      }
    });
    
    console.log('✅ COD: Confirmation email sent successfully for order:', order.orderNumber);
    console.log('📨 COD: Message ID:', (result as any).messageId);
    
    return true;
  } catch (error) {
    console.error('❌ COD: Failed to send confirmation email:', error);
    return false;
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

    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`cod_order_${clientIP}`, 5, 60000); // More restrictive for COD
    
    if (!rateLimitResult.allowed) {
      return createErrorResponse(
        'Too many requests',
        429,
        'Rate limit exceeded'
      );
    }

    const body = await request.json();
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

    // Get user from database using session info
    const user = await User.findOne({ 
      email: session.user.email 
    }).select('-password');

    if (!user) {
      return createErrorResponse(
        'User not found',
        404,
        'Not Found'
      );
    }

    // Calculate total amount and validate products
    let subtotal = 0;
    const invalidProducts = [];
    const validItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        console.warn(`Product not found during COD checkout: ${item.productId}`);
        invalidProducts.push({
          productId: item.productId,
          name: item.name || 'Unknown Product',
          reason: 'Product no longer exists'
        });
        continue;
      }

      if (!product.isActive) {
        console.warn(`Inactive product in COD checkout: ${item.productId}`);
        invalidProducts.push({
          productId: item.productId,
          name: product.name,
          reason: 'Product is no longer available'
        });
        continue;
      }

      if (product.stock < item.quantity) {
        console.warn(`Insufficient stock for product: ${item.productId}`);
        invalidProducts.push({
          productId: item.productId,
          name: product.name,
          reason: `Only ${product.stock} items available, but ${item.quantity} requested`
        });
        continue;
      }

      validItems.push(item);
      subtotal += product.price * item.quantity;
    }

    // If there are invalid products, return an error with details
    if (invalidProducts.length > 0) {
      const errorDetails: Record<string, string[]> = {};
      invalidProducts.forEach((product, index) => {
        errorDetails[`product_${index}`] = [`${product.name}: ${product.reason}`];
      });
      
      return createErrorResponse(
        `Some products in your cart are no longer available: ${invalidProducts.map(p => p.name).join(', ')}. Please update your cart and try again.`,
        400,
        'Cart Validation Failed',
        errorDetails
      );
    }

    // If no valid items remain, return an error
    if (validItems.length === 0) {
      return createErrorResponse(
        'No valid products found in cart. Please add products and try again.',
        400,
        'Empty Cart'
      );
    }

    // Use shipping rate from Shiprocket with hybrid free coverage
    const threshold = parseInt(process.env.FREE_SHIPPING_THRESHOLD || '999', 10);
    let shipping = subtotal >= threshold ? 0 : 99;
    let codCharge = 49; // Default COD handling charge
    let shippingDetails: any = null;

    try {
      // Recalculate available rates server-side to derive cheapest coverage
      const rates = await getShiprocketRates({
        delivery_postcode: shippingAddress.pincode,
        items: validItems.map((i: any) => ({ quantity: i.quantity, price: i.price, weight: i.weight })),
        cod: 1,
        declared_value: subtotal,
      });

      if (rates && rates.length > 0 && selectedShippingRate) {
        const { effectiveShipping, coveredAmount } = computeHybridShipping({
          subtotal,
          selectedRate: selectedShippingRate,
          allRates: rates,
          threshold,
        });
        shipping = effectiveShipping;
        codCharge = selectedShippingRate.cod_charge || 0;
        shippingDetails = {
          courierCompanyId: selectedShippingRate.courier_company_id,
          courierName: selectedShippingRate.courier_name,
          freightCharge: selectedShippingRate.freight_charge || 0,
          codCharge: selectedShippingRate.cod_charge || 0,
          otherCharges: selectedShippingRate.other_charges || 0,
          totalShippingCharge: selectedShippingRate.total_charge,
          coveredAmount,
          effectiveShipping,
          estimatedDeliveryTime: selectedShippingRate.etd,
          courierRating: selectedShippingRate.rating,
          isSurface: selectedShippingRate.is_surface,
          isAir: selectedShippingRate.is_air,
          pickupPincode: process.env.SHIPROCKET_PICKUP_PINCODE || '560001',
          deliveryPincode: shippingAddress.pincode,
        };
      }
    } catch (e) {
      console.warn('Shiprocket hybrid shipping calculation failed, using fallback:', e);
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
        for (const item of validItems) {
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
        discount = shipping; // free shipping for COD too
      } else {
        discount = (offer as any).calculateDiscount(subtotal, validItems);
      }
    }

    // Total already includes COD charges in shipping if from Shiprocket
    const total = Math.max(0, subtotal + shipping - discount);

    // Create order in database
    const order = new Order({
      userId: user._id,
      orderNumber: `COD${Date.now()}`,
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
      status: 'confirmed', // COD orders are confirmed immediately
      paymentStatus: 'pending', // Payment will be collected on delivery
      shippingAddress,
      paymentMethod: 'cod',
      couponCode,
      confirmedAt: new Date(),
      shippingDetails, // Add Shiprocket shipping details
      carrier: shippingDetails?.courierName, // Set carrier name
    });

    await order.save();

    // Update product stock immediately for COD orders
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } }
      );
    }

    console.log(`COD Order ${order.orderNumber} created and stock updated`);
    
    // Send order confirmation email
    await sendCODOrderConfirmationEmail(order);

    return createSuccessResponse({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: total,
      paymentMethod: 'cod',
      status: 'confirmed',
      message: 'Your Cash on Delivery order has been confirmed! Please have the exact amount ready for delivery.',
      codCharge,
      estimatedDelivery: '3-5 business days'
    }, 'COD order created successfully');

  } catch (error) {
    return handleApiError(error, 'POST /api/orders/create-cod');
  }
}