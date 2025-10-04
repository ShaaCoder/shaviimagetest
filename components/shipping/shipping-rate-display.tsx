'use client';

import React from 'react';
import { Truck, Clock, Star, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ShippingRate } from '@/hooks/use-shipping-rates';

interface ShippingRateDisplayProps {
  loading: boolean;
  error: string | null;
  shippingRates: ShippingRate[];
  selectedRate: ShippingRate | null;
  onRateSelect: (rate: ShippingRate) => void;
  onRefresh?: () => void;
  showRefresh?: boolean;
}

export function ShippingRateDisplay({
  loading,
  error,
  shippingRates,
  selectedRate,
  onRateSelect,
  onRefresh,
  showRefresh = false,
}: ShippingRateDisplayProps) {
  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
          <span className="text-blue-700 font-medium">Calculating shipping rates...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="h-4 w-4 text-red-600" />
            <span className="text-red-700 font-medium">{error}</span>
          </div>
          {showRefresh && onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (shippingRates.length === 0) {
    return null;
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Truck className="h-4 w-4 text-green-600" />
          <span className="text-green-700 font-medium">Available Shipping Options</span>
        </div>
        {showRefresh && onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="text-green-600 border-green-300 hover:bg-green-50"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        )}
      </div>

      <RadioGroup
        value={selectedRate?.courier_company_id.toString() || ''}
        onValueChange={(value) => {
          const rate = shippingRates.find(r => r.courier_company_id.toString() === value);
          if (rate) onRateSelect(rate);
        }}
        className="space-y-3"
      >
        {shippingRates.map((rate) => (
          <div key={rate.courier_company_id} className="flex items-center space-x-3">
            <RadioGroupItem
              value={rate.courier_company_id.toString()}
              id={`rate-${rate.courier_company_id}`}
            />
            <Label
              htmlFor={`rate-${rate.courier_company_id}`}
              className="flex-1 cursor-pointer"
            >
              <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-green-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{rate.courier_name}</span>
                      {rate.is_air && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Express
                        </span>
                      )}
                      {rate.is_surface && !rate.is_air && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                          Standard
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{rate.etd}</span>
                      </div>
                      {rate.rating && (
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 fill-current text-yellow-400" />
                          <span>{rate.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg text-gray-900">
                      ₹{rate.total_charge}
                    </div>
                    {(rate.freight_charge > 0 || rate.cod_charge > 0) && (
                      <div className="text-xs text-gray-500">
                        {rate.freight_charge > 0 && `Shipping: ₹${rate.freight_charge}`}
                        {rate.cod_charge > 0 && (
                          <>
                            {rate.freight_charge > 0 && ' + '}
                            COD: ₹{rate.cod_charge}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      {selectedRate && (
        <div className="mt-3 p-3 bg-white border border-green-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-green-700">Selected: {selectedRate.courier_name}</span>
              <div className="text-xs text-green-600 mt-1">
                Delivery in {selectedRate.etd}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-green-800">₹{selectedRate.total_charge}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}