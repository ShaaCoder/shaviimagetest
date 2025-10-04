'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { Minus, Plus, Trash2, ShoppingBag, Shield, Truck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/hooks/use-auth';
import { getImageUrl } from '@/lib/image-utils';

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { data: session, status } = useSession();
  const [promoCode, setPromoCode] = useState('');

  // Check authentication - either NextAuth session or existing auth store
  const isUserAuthenticated = isAuthenticated || !!session;

  const subtotal = getTotalPrice();
  // Delivery charges will be calculated at checkout
  const total = subtotal;

  if (items.length === 0) {
    return (
      <div>
        <Header />
        <main className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <ShoppingBag className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Start shopping to add items to your cart</p>
            <Link href="/">
              <Button className="bg-rose-600 hover:bg-rose-700">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-lg border p-6">
                <div className="flex gap-4">
                  <div className="relative w-24 h-24 flex-shrink-0">
                    <Image
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      fill
                      className="object-cover rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-image.svg';
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-gray-900">{item.name}</h3>
                    <p className="text-lg font-bold text-gray-900">₹{item.price}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="w-8 h-8"
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(item.productId)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal ({items.length} items)</span>
                  <span>₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <div className="text-right">
                    {subtotal > 999 ? (
                      <span className="text-green-600 text-sm font-medium">FREE</span>
                    ) : (
                      <span className="text-blue-600 text-sm">From ₹49</span>
                    )}
                    <div className="text-xs text-gray-500">
                      {subtotal > 999 ? 'Congratulations!' : `Add ₹${999 - subtotal} for FREE delivery`}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{total}</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">Delivery Information</span>
                </div>
                <ul className="space-y-1 text-xs">
                  <li>• Delivery charges calculated based on location</li>
                  <li>• FREE delivery on orders above ₹999</li>
                  <li>• Standard delivery: 3-7 business days</li>
                  <li>• Express delivery available at checkout</li>
                  <li>• Real-time tracking after order confirmation</li>
                </ul>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <Button variant="outline">Apply</Button>
                </div>
              </div>

              <Link href={isUserAuthenticated ? "/checkout" : "/auth/login"}>
                <Button className="w-full bg-rose-600 hover:bg-rose-700" size="lg">
                  {isUserAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
                </Button>
              </Link>
            </div>

            {/* Security badges */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>100% Secure Payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-500" />
                  <span>Fast & Reliable Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-purple-500" />
                  <span>Easy 30-day Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}