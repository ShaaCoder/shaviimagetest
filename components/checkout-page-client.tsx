"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CreditCard, MapPin, Truck, Package, CheckCircle, Clock, Star, Shield, Zap, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/hooks/use-auth';
import { Address, ShippingRate } from '@/types';
import { toast } from 'sonner';
import { StripeCheckout } from '@/components/payment/stripe-checkout';
import { apiClient } from '@/lib/api';
// Removed old shipping hooks - now using direct Shiprocket integration

export function CheckoutPageClient() {
  'use client';

  const router = useRouter();
  const { items, getTotalPrice, clearCart, validateCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [cartValidated, setCartValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Check authentication - either NextAuth session or existing auth store
  const isUserAuthenticated = isAuthenticated || !!session;
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [appliedOfferCode, setAppliedOfferCode] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState<Partial<Address>>({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: ''
  });

  const indianStates = [
    'Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Gujarat',
    'Rajasthan', 'West Bengal', 'Madhya Pradesh', 'Uttar Pradesh', 'Delhi'
  ];

  // Memoize cart items to prevent unnecessary re-renders
  const cartItems = React.useMemo(() => items.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    price: item.price,
    weight: item.weight || 0.5 // Default weight if not provided
  })), [items]);

  // Shiprocket shipping state
  const [shiprocketRates, setShiprocketRates] = useState<ShippingRate[]>([]);
  const [selectedShiprocketRate, setSelectedShiprocketRate] = useState<ShippingRate | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const FREE_THRESHOLD = parseInt(process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD || '999');
  const subtotal = getTotalPrice();

  // Compute hybrid shipping: free coverage equals the cheapest Shiprocket rate when threshold met
  const cheapestRate = React.useMemo(() => {
    if (!shiprocketRates || shiprocketRates.length === 0) return null;
    return shiprocketRates.reduce((p, c) => (p.total_charge <= c.total_charge ? p : c));
  }, [shiprocketRates]);

  const coveredAmount = React.useMemo(() => {
    if (!cheapestRate) return 0;
    return subtotal >= FREE_THRESHOLD ? (cheapestRate?.total_charge || 0) : 0;
  }, [cheapestRate, subtotal]);

  const shipping = React.useMemo(() => {
    if (selectedShiprocketRate && selectedShiprocketRate.total_charge >= 0) {
      return Math.max(0, selectedShiprocketRate.total_charge - coveredAmount);
    }
    // If no rate selected yet, fall back to banner logic
    if (subtotal >= FREE_THRESHOLD) return 0;
    return 99;
  }, [selectedShiprocketRate, subtotal, coveredAmount]);
  
  const totalBeforeDiscount = subtotal + shipping;
  const total = Math.max(0, totalBeforeDiscount - appliedDiscount);
  const totalWithCOD = Math.max(0, total);

  useEffect(() => {
    if (status !== 'loading' && !isUserAuthenticated) {
      router.push('/auth/login');
    }
  }, [isUserAuthenticated, status, router]);

  // Validate cart when component mounts
  useEffect(() => {
    const performCartValidation = async () => {
      if (items.length > 0 && !cartValidated) {
        try {
          const validation = await validateCart();
          
          if (validation.hasChanges && validation.invalidItems.length > 0) {
            const invalidProductNames = validation.invalidItems.map(item => item.name).join(', ');
            toast.error(`Some items were removed from your cart: ${invalidProductNames}`);
            setValidationError(`The following items are no longer available: ${invalidProductNames}`);
          }
          
          setCartValidated(true);
        } catch (error) {
          console.error('Error validating cart:', error);
          toast.error('Unable to validate cart items. Please refresh the page.');
        }
      }
    };

    if (items.length > 0) {
      performCartValidation();
    } else {
      setCartValidated(true);
    }
  }, [items.length, cartValidated, validateCart]);

  // Direct Shiprocket rate calculation
  const calculateShiprocketRates = async (pincode: string) => {
    if (!pincode || pincode.length !== 6) {
      setShiprocketRates([]);
      setSelectedShiprocketRate(null);
      return;
    }

    setShippingLoading(true);
    setShippingError(null);

    try {
      const response = await fetch('/api/shipping/calculate-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pincode: pincode,
          items: cartItems,
          cod: paymentMethod === 'cod' ? 1 : 0,
          declared_value: subtotal,
        }),
      });

      const data = await response.json();
      console.log('🚢 Shiprocket API response:', data);

      if (data.success && data.data?.available_courier_companies) {
        // Normalize on client too (defensive)
        const rates = data.data.available_courier_companies.map((r: any) => {
          const freight = Number(r.freight_charge ?? 0);
          const codc = Number(r.cod_charge ?? 0);
          const other = Number(r.other_charges ?? 0);
          const total = Number(r.total_charge ?? freight + codc + other);
          return { ...r, freight_charge: freight, cod_charge: codc, other_charges: other, total_charge: total };
        });
        setShiprocketRates(rates);
        
        // Auto-select the cheapest rate
        if (rates.length > 0) {
          const cheapestRate = rates.reduce((prev: any, current: any) => 
            prev.total_charge <= current.total_charge ? prev : current
          );
          setSelectedShiprocketRate(cheapestRate);
          console.log('✅ Selected cheapest rate:', cheapestRate.courier_name, '₹' + cheapestRate.total_charge);
        }
      } else {
        setShiprocketRates([]);
        setSelectedShiprocketRate(null);
        setShippingError(data.message || 'No shipping options available for this PIN code');
      }
    } catch (error) {
      console.error('❌ Error calculating Shiprocket rates:', error);
      setShippingError('Failed to calculate shipping rates. Please try again.');
      setShiprocketRates([]);
      setSelectedShiprocketRate(null);
    } finally {
      setShippingLoading(false);
    }
  };

  // Effect to calculate Shiprocket rates when pincode changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (shippingAddress.pincode && shippingAddress.pincode.length === 6) {
        calculateShiprocketRates(shippingAddress.pincode);
      }
    }, 1500); // 1.5 second debounce

    return () => clearTimeout(timeoutId);
  }, [shippingAddress.pincode, paymentMethod, cartItems]);

  if (status === 'loading' || !cartValidated) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mb-4"></div>
          <p className="text-gray-600">
            {status === 'loading' ? 'Loading...' : 'Validating cart items...'}
          </p>
        </div>
      </main>
    );
  }

  if (!isUserAuthenticated) {
    return null;
  }

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const applyCoupon = async () => {
    if (!couponCode) {
      toast.error('Please enter a coupon code');
      return;
    }

    try {
      const response = await fetch('/api/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode,
          cartTotal: subtotal,
          cartItems: items.map(item => ({ 
            productId: item.productId, 
            quantity: item.quantity,
            price: item.price
          }))
        })
      });
      const data = await response.json();
      if (data.success) {
        setAppliedDiscount(data.data.discount || 0);
        setAppliedOfferCode(data.data.offer?.code || couponCode.toUpperCase());
        toast.success('Offer applied successfully');
      } else {
        setAppliedDiscount(0);
        setAppliedOfferCode(null);
        toast.error(data.message || 'Failed to apply offer');
      }
    } catch (error) {
      setAppliedDiscount(0);
      setAppliedOfferCode(null);
      toast.error('Failed to apply offer');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      // Only COD uses this handler; card/upi are handled by StripeCheckout component
      if (paymentMethod !== 'cod') {
        toast.error('Invalid payment method for this flow');
        return;
      }

      const response = await apiClient.createCODOrder({
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity,
        })),
        shippingAddress: shippingAddress as Address,
        couponCode: appliedOfferCode || undefined,
        selectedShippingRate: selectedShiprocketRate, // Include selected Shiprocket rate
      });

      if (response.success) {
        clearCart();
        toast.success('Order placed successfully!');
        const orderNumber = response.data?.orderNumber;
        if (orderNumber) {
          router.push(`/orders/success?order_number=${encodeURIComponent(orderNumber)}`);
        } else {
          router.push('/orders/success');
        }
      } else {
        toast.error(response.message || 'Failed to place order');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to place order');
    } finally {
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Secure Checkout
            </h1>
            <p className="text-gray-600 text-lg">Complete your purchase with confidence</p>
          </div>
          
          {validationError && (
            <Card className="mb-8 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-amber-100">
                    <svg className="h-6 w-6 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-800 mb-1">Cart Updated</h3>
                    <p className="text-amber-700">{validationError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Enhanced Progress Indicator */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardContent className="p-8">
              <div className="flex items-center justify-between max-w-md mx-auto">
                {/* Step 1 */}
                <div className="flex items-center flex-col group">
                  <div className={`relative w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                    step >= 1 
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-transparent text-white shadow-lg scale-105' 
                      : 'border-gray-300 text-gray-400 group-hover:border-gray-400'
                  }`}>
                    {step > 1 ? (
                      <CheckCircle className="w-7 h-7" />
                    ) : (
                      <MapPin className="w-7 h-7" />
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <p className={`font-semibold ${step >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
                      Shipping
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Delivery details</p>
                  </div>
                </div>
                
                {/* Progress Line */}
                <div className="flex-1 mx-4">
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out ${
                        step >= 2 ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                </div>
                
                {/* Step 2 */}
                <div className="flex items-center flex-col group">
                  <div className={`relative w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 ${
                    step >= 2 
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-transparent text-white shadow-lg scale-105' 
                      : 'border-gray-300 text-gray-400 group-hover:border-gray-400'
                  }`}>
                    <CreditCard className="w-7 h-7" />
                  </div>
                  <div className="mt-3 text-center">
                    <p className={`font-semibold ${step >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
                      Payment
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Secure payment</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            {step === 1 ? (
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      <MapPin className="w-6 h-6" />
                    </div>
                    Shipping Address
                  </CardTitle>
                  <p className="text-gray-600">Where should we deliver your order?</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddressSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-semibold text-gray-700">Full Name</Label>
                        <Input 
                          id="name" 
                          required 
                          value={shippingAddress.name || ''} 
                          onChange={(e) => setShippingAddress({ ...shippingAddress, name: e.target.value })}
                          className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number</Label>
                        <Input 
                          id="phone" 
                          type="tel" 
                          required 
                          value={shippingAddress.phone || ''} 
                          onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                          className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                          placeholder="Enter your phone number"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-semibold text-gray-700">Address</Label>
                      <Input 
                        id="address" 
                        required 
                        value={shippingAddress.address || ''} 
                        onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                        className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        placeholder="Enter your complete address"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-semibold text-gray-700">City</Label>
                        <Input 
                          id="city" 
                          required 
                          value={shippingAddress.city || ''} 
                          onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                          placeholder="Enter your city"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-sm font-semibold text-gray-700">State</Label>
                        <Select value={shippingAddress.state || ''} onValueChange={(value) => setShippingAddress({ ...shippingAddress, state: value })}>
                          <SelectTrigger className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {indianStates.map((state) => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="pincode" className="text-sm font-semibold text-gray-700">PIN Code</Label>
                        <Input 
                          id="pincode" 
                          required 
                          value={shippingAddress.pincode || ''} 
                          onChange={(e) => {
                            const newPincode = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setShippingAddress({ ...shippingAddress, pincode: newPincode });
                          }}
                          placeholder="6-digit PIN"
                          maxLength={6}
                          className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl"
                        />
                      </div>
                    </div>
                    
                    {/* Enhanced Shipping Options */}
                    {(shippingAddress.pincode?.length === 6 || shippingLoading || shippingError) && (
                      <div className="space-y-4">
                        <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50">
                          <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 rounded-full bg-emerald-100">
                                <Truck className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-emerald-800">Available Shipping Options</h3>
                                <p className="text-sm text-emerald-600">Choose your preferred delivery method</p>
                              </div>
                              {shippingLoading && (
                                <div className="ml-auto">
                                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-300 border-t-emerald-600"></div>
                                </div>
                              )}
                            </div>
                            
                            {shippingLoading && (
                              <div className="text-center py-8">
                                <div className="inline-flex items-center gap-3 text-gray-600">
                                  <Clock className="w-5 h-5 animate-pulse" />
                                  <span>Calculating shipping rates for PIN {shippingAddress.pincode}...</span>
                                </div>
                              </div>
                            )}
                            
                            {shippingError && (
                              <div className="text-center py-8">
                                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                  <p className="text-red-600 font-medium">{shippingError}</p>
                                </div>
                              </div>
                            )}
                            
                            {shiprocketRates.length > 0 && (
                              <div className="grid gap-3">
                                {shiprocketRates.map((rate, index) => (
                                  <div 
                                    key={rate.courier_company_id} 
                                    className={`relative p-4 border-2 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02] ${
                                      selectedShiprocketRate?.courier_company_id === rate.courier_company_id 
                                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100 ring-2 ring-blue-200' 
                                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                                    }`}
                                    onClick={() => setSelectedShiprocketRate(rate)}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-xl ${
                                          selectedShiprocketRate?.courier_company_id === rate.courier_company_id
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          <Package className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <div className="font-semibold text-gray-900">{rate.courier_name}</div>
                                          <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                            <Clock className="w-3 h-3" />
                                            Delivery by {rate.etd}
                                          </div>
                                          {rate.rating && (
                                            <div className="flex items-center gap-1 mt-1">
                                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                              <span className="text-xs font-medium text-yellow-600">{rate.rating}</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xl font-bold text-green-600">₹{rate.total_charge}</div>
                                        {rate.cod_charge > 0 && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            +₹{rate.cod_charge} COD fee
                                          </div>
                                        )}
                                        {selectedShiprocketRate?.courier_company_id === rate.courier_company_id && (
                                          <Badge className="mt-2 bg-blue-100 text-blue-700 border-blue-200">
                                            Selected
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {selectedShiprocketRate?.courier_company_id === rate.courier_company_id && (
                                      <div className="absolute top-3 right-3">
                                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                          <CheckCircle className="w-4 h-4 text-white" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    <div className="pt-6">
                      <Button 
                        type="submit" 
                        className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transition-all duration-200 transform hover:scale-[1.02] rounded-2xl" 
                        disabled={!shippingAddress.pincode || shippingAddress.pincode.length !== 6 || shippingLoading}
                      >
                        {shippingLoading ? (
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 animate-spin" />
                            <span>Calculating shipping rates...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5" />
                            <span>Continue to Payment</span>
                            <Zap className="w-5 h-5" />
                          </div>
                        )}
                      </Button>
                      
                      <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
                        <Shield className="w-4 h-4" />
                        <span>Your information is secure and encrypted</span>
                      </div>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Payment Method Selection */}
                <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      Payment Method
                    </CardTitle>
                    <p className="text-gray-600">Choose your preferred payment option</p>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                      <div className="flex items-center space-x-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
                        <RadioGroupItem value="card" id="card" className="text-blue-600" />
                        <Label htmlFor="card" className="flex items-center gap-3 font-medium cursor-pointer flex-1">
                          <CreditCard className="w-5 h-5 text-gray-600" />
                          <span>Credit/Debit Card</span>
                          <Badge variant="outline" className="ml-auto">Stripe</Badge>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
                        <RadioGroupItem value="upi" id="upi" className="text-blue-600" />
                        <Label htmlFor="upi" className="flex items-center gap-3 font-medium cursor-pointer flex-1">
                          <Zap className="w-5 h-5 text-gray-600" />
                          <span>UPI Payment</span>
                          <Badge variant="outline" className="ml-auto">Instant</Badge>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-blue-300 transition-colors">
                        <RadioGroupItem value="cod" id="cod" className="text-blue-600" />
                        <Label htmlFor="cod" className="flex items-center gap-3 font-medium cursor-pointer flex-1">
                          <Package className="w-5 h-5 text-gray-600" />
                          <span>Cash on Delivery</span>
                          <Badge variant="outline" className="ml-auto text-amber-600 border-amber-300">COD Fee</Badge>
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>

                {/* Payment Content */}
                {paymentMethod === 'card' || paymentMethod === 'upi' ? (
                  <StripeCheckout
                    items={items.map(item => ({ productId: item.productId, name: item.name, price: item.price, image: item.image, quantity: item.quantity }))}
                    shippingAddress={shippingAddress as Address}
                    total={total}
                    couponCode={appliedOfferCode || undefined}
                    selectedShippingRate={selectedShiprocketRate}
                    onSuccess={() => {
                      clearCart();
                      toast.success('Order placed successfully!');
                      router.push('/orders/success');
                    }}
                    onError={(error) => { toast.error(error); }}
                  />
                ) : (
                  <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
                    <CardContent className="p-8">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-amber-100">
                          <Package className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold">Cash on Delivery</h3>
                          <p className="text-gray-600">Pay when your order arrives at your door</p>
                        </div>
                      </div>
                      
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <div className="text-sm text-amber-800">
                          ⚠️ An additional COD handling charge applies as per courier partner rates.
                        </div>
                      </div>
                      
                      <form onSubmit={handlePayment} className="space-y-6">
                        <div className="flex gap-4">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setStep(1)} 
                            className="flex-1 h-12 rounded-xl" 
                            disabled={isProcessing}
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            Back to Shipping
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] rounded-xl" 
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 animate-spin" />
                                <span>Processing...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                <span>Place Order - ₹{total}</span>
                              </div>
                            )}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
          
          {/* Enhanced Order Summary Sidebar */}
          <div className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm sticky top-8">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white">
                    <Package className="w-5 h-5" />
                  </div>
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Order Items */}
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Coupon Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-gray-600" />
                    <Label htmlFor="coupon" className="font-medium">Have a coupon?</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input 
                      id="coupon" 
                      value={couponCode} 
                      onChange={(e) => setCouponCode(e.target.value)} 
                      placeholder="Enter coupon code" 
                      className="rounded-xl"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={applyCoupon}
                      className="whitespace-nowrap rounded-xl"
                    >
                      Apply
                    </Button>
                  </div>
                  {appliedOfferCode && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <p className="text-sm text-green-700 font-medium">
                        {appliedOfferCode} applied (−₹{appliedDiscount})
                      </p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Price Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <div className="text-right">
                      <span className={shipping === 0 ? 'text-green-600 font-medium' : 'text-gray-900'}>
                        {shipping === 0 ? 'Free' : `₹${shipping.toFixed(2)}`}
                      </span>
                      {selectedShiprocketRate && (
                        <div className="text-xs text-gray-500 mt-1">
                          via {selectedShiprocketRate.courier_name}
                          {selectedShiprocketRate.etd && (
                            <div>Delivery: {selectedShiprocketRate.etd}</div>
                          )}
                        </div>
                      )}
                      {coveredAmount > 0 && (
                        <div className="text-xs text-green-600 mt-1">
                          Free shipping (₹{coveredAmount} covered)
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {appliedDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>−₹{appliedDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 p-3 bg-gray-50 rounded-xl">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">100% Secure Checkout</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
