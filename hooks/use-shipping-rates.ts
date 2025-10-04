import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from './use-debounce';

export interface ShippingRate {
  courier_company_id: number;
  courier_name: string;
  freight_charge: number;
  cod_charge: number;
  other_charges: number;
  total_charge: number;
  etd: string;
  rating: number;
  is_surface: boolean;
  is_air: boolean;
}

export interface ShippingRateResponse {
  success: boolean;
  data?: {
    available_courier_companies: ShippingRate[];
    pickup_postcode?: string;
    delivery_postcode?: string;
    total_weight?: number;
    declared_value?: number;
    is_mock?: boolean;
  };
  message?: string;
}

interface UseShippingRatesProps {
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    weight?: number;
  }>;
  paymentMethod?: string;
}

export function useShippingRates({ items, paymentMethod }: UseShippingRatesProps) {
  const [pincode, setPincode] = useState('');
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculatedPincode, setLastCalculatedPincode] = useState('');
  
  // Debounce the pincode input to avoid too many API calls
  const debouncedPincode = useDebounce(pincode, 1500);

  // Memoize items to prevent unnecessary calculations
  const memoizedItems = useCallback(() => items, [JSON.stringify(items)]);
  const stableItems = memoizedItems();

  const calculateShippingRates = useCallback(async (targetPincode: string) => {
    if (!targetPincode || targetPincode.length !== 6 || !stableItems.length) {
      setShippingRates([]);
      setSelectedRate(null);
      setError(null);
      setLastCalculatedPincode('');
      return;
    }

    // Validate pincode format (6 digits)
    if (!/^\d{6}$/.test(targetPincode)) {
      setError('Please enter a valid 6-digit PIN code');
      return;
    }

    // Prevent duplicate API calls for the same pincode and payment method
    const currentParams = `${targetPincode}-${paymentMethod}-${JSON.stringify(stableItems)}`;
    if (lastCalculatedPincode === currentParams && shippingRates.length > 0) {
      return; // Skip if already calculated for same parameters
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/shipping/calculate-rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pincode: targetPincode,
          items: stableItems,
          cod: paymentMethod === 'cod' ? 1 : 0,
          declared_value: stableItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        }),
      });

      const data: ShippingRateResponse = await response.json();

      if (data.success && data.data?.available_courier_companies) {
        const rates = data.data.available_courier_companies;
        setShippingRates(rates);
        setLastCalculatedPincode(currentParams);
        
        // Auto-select the cheapest rate
        if (rates.length > 0) {
          const cheapestRate = rates.reduce((prev, current) => 
            prev.total_charge < current.total_charge ? prev : current
          );
          setSelectedRate(cheapestRate);
        }
      } else {
        setShippingRates([]);
        setSelectedRate(null);
        setError(data.message || 'No shipping options available for this PIN code');
      }
    } catch (err) {
      console.error('Error calculating shipping rates:', err);
      setError('Failed to calculate shipping rates. Please try again.');
      setShippingRates([]);
      setSelectedRate(null);
    } finally {
      setLoading(false);
    }
  }, [stableItems, paymentMethod, lastCalculatedPincode, shippingRates.length]);

  // Effect to trigger rate calculation when debounced pincode changes
  useEffect(() => {
    if (debouncedPincode) {
      calculateShippingRates(debouncedPincode);
    }
  }, [debouncedPincode, calculateShippingRates]);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      setShippingRates([]);
      setSelectedRate(null);
      setError(null);
      setLoading(false);
    };
  }, []);

  const updatePincode = useCallback((newPincode: string) => {
    // Only allow numeric input and limit to 6 characters
    const cleanPincode = newPincode.replace(/\D/g, '').slice(0, 6);
    setPincode(cleanPincode);
  }, []);

  const refreshRates = useCallback(() => {
    if (debouncedPincode) {
      calculateShippingRates(debouncedPincode);
    }
  }, [debouncedPincode, calculateShippingRates]);

  const selectRate = useCallback((rate: ShippingRate) => {
    setSelectedRate(rate);
  }, []);

  const getShippingCost = useCallback(() => {
    return selectedRate?.total_charge || 0;
  }, [selectedRate]);

  const getDeliveryTime = useCallback(() => {
    return selectedRate?.etd || '';
  }, [selectedRate]);

  const getCourierName = useCallback(() => {
    return selectedRate?.courier_name || '';
  }, [selectedRate]);

  return {
    pincode,
    updatePincode,
    shippingRates,
    selectedRate,
    loading,
    error,
    refreshRates,
    selectRate,
    getShippingCost,
    getDeliveryTime,
    getCourierName,
    hasValidPincode: debouncedPincode.length === 6,
  };
}