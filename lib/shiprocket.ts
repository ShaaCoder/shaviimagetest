/*
 * Shiprocket helper utilities
 */

export interface ShiprocketRate {
  courier_company_id: number;
  courier_name: string;
  freight_charge: number;
  cod_charge: number;
  other_charges: number;
  total_charge: number;
  etd: string;
  rating?: number;
  is_surface?: boolean;
  is_air?: boolean;
}

export interface GetRatesInputItem {
  quantity: number;
  weight?: number;
  price?: number;
}

export interface GetRatesInput {
  delivery_postcode: string;
  items: GetRatesInputItem[];
  cod: number; // 0 = prepaid, 1 = COD
  declared_value?: number;
}

export async function getShiprocketToken(): Promise<string | null> {
  try {
    const response = await fetch(`${process.env.SHIPROCKET_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }),
    });
    if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
    const data = await response.json();
    return data.token as string;
  } catch (err) {
    console.error('Shiprocket auth error:', err);
    return null;
  }
}

export function calculateCartWeight(items: GetRatesInputItem[]): number {
  return items.reduce((sum, it) => sum + (it.quantity * (it.weight ?? 0.5)), 0);
}

export async function getShiprocketRates(input: GetRatesInput): Promise<ShiprocketRate[] | null> {
  const token = await getShiprocketToken();
  if (!token) return null;

  const pickup_postcode = process.env.SHIPROCKET_PICKUP_PINCODE || '560001';

  const totalWeight = Math.max(0.5, calculateCartWeight(input.items));
  const declared = input.declared_value ?? input.items.reduce((s, it) => s + (it.price ?? 0) * it.quantity, 0);

  const params = new URLSearchParams();
  params.append('pickup_postcode', pickup_postcode);
  params.append('delivery_postcode', input.delivery_postcode);
  params.append('weight', String(totalWeight));
  params.append('cod', String(input.cod));
  params.append('declared_value', String(declared));

  const apiUrl = `${process.env.SHIPROCKET_BASE_URL}/courier/serviceability/?${params.toString()}`;
  const res = await fetch(apiUrl, { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Shiprocket API error: ${res.status}`);
  const data = await res.json();
  if (data.status !== 200 || !data.data?.available_courier_companies) return [];
  const rates: ShiprocketRate[] = data.data.available_courier_companies.map((c: any) => ({
    courier_company_id: c.courier_company_id,
    courier_name: c.courier_name,
    freight_charge: c.freight_charge,
    cod_charge: c.cod_charge,
    other_charges: c.other_charges,
    total_charge: c.total_charge,
    etd: c.etd,
    rating: c.rating,
    is_surface: c.is_surface,
    is_air: c.is_air,
  }));
  return rates;
}

export function getCheapestRate(rates: ShiprocketRate[] = []): ShiprocketRate | null {
  if (!rates || rates.length === 0) return null;
  return rates.reduce((prev, cur) => (prev.total_charge <= cur.total_charge ? prev : cur));
}

export function computeHybridShipping(opts: {
  subtotal: number;
  selectedRate: ShiprocketRate | null | undefined;
  allRates: ShiprocketRate[] | null | undefined;
  threshold?: number; // default 999
}): { effectiveShipping: number; coveredAmount: number; cheapestRate: ShiprocketRate | null } {
  const threshold = Number.isFinite(opts.threshold as number) ? (opts.threshold as number) : 999;
  const rates = opts.allRates ?? [];
  const cheapest = getCheapestRate(rates as ShiprocketRate[]);
  const qualifiesForFree = opts.subtotal >= threshold && !!cheapest;
  const covered = qualifiesForFree ? (cheapest?.total_charge ?? 0) : 0;
  const base = opts.selectedRate?.total_charge ?? (opts.subtotal >= threshold ? 0 : 99);
  const effective = Math.max(0, base - covered);
  return {
    effectiveShipping: Number.isFinite(effective) ? effective : 0,
    coveredAmount: covered,
    cheapestRate: cheapest,
  };
}