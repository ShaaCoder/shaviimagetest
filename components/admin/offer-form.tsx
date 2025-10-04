"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export type OfferFormValues = {
  id?: string;
  title: string;
  description: string;
  code: string;
  type: 'percentage' | 'fixed' | 'shipping' | 'bogo';
  value: number;
  minAmount: number;
  maxDiscount?: number;
  isActive: boolean;
  startDate?: string; // yyyy-mm-dd
  endDate?: string;   // yyyy-mm-dd
  categories: string[];
  brands: string[];
  products: string[];
  usageLimit?: number;
  userUsageLimit: number;
  newCustomerOnly: boolean;
  applicableUserRoles: ('customer' | 'admin')[];
};

export function normalizeInitialValues(values: any): OfferFormValues {
  const toISODate = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  return {
    id: values?.id || '',
    title: values?.title || '',
    description: values?.description || '',
    code: (values?.code || '').toString().toUpperCase(),
    type: values?.type || 'percentage',
    value: Number(values?.value ?? 0),
    minAmount: Number(values?.minAmount ?? 0),
    maxDiscount: values?.maxDiscount !== undefined && values?.maxDiscount !== null ? Number(values?.maxDiscount) : undefined,
    isActive: values?.isActive ?? true,
    startDate: toISODate(values?.startDate) || new Date().toISOString().slice(0, 10),
    endDate: toISODate(values?.endDate) || '',
    categories: Array.isArray(values?.categories) ? values.categories : [],
    brands: Array.isArray(values?.brands) ? values.brands : [],
    products: Array.isArray(values?.products) ? values.products : [],
    usageLimit: values?.usageLimit !== undefined && values?.usageLimit !== null ? Number(values?.usageLimit) : undefined,
    userUsageLimit: Number(values?.userUsageLimit ?? 1),
    newCustomerOnly: values?.newCustomerOnly ?? false,
    applicableUserRoles: Array.isArray(values?.applicableUserRoles) && values.applicableUserRoles.length > 0 ? values.applicableUserRoles : ['customer'],
  } as OfferFormValues;
}

export default function OfferForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
}: {
  initialValues: any;
  onSubmit: (values: OfferFormValues) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
}) {
  const init = useMemo(() => normalizeInitialValues(initialValues), [initialValues]);
  const [values, setValues] = useState<OfferFormValues>(init);
  const [saving, setSaving] = useState(false);

  // Category picker state
  const [categoryQuery, setCategoryQuery] = useState('');
  const [categoriesCatalog, setCategoriesCatalog] = useState<Array<{ id: string; slug: string; name: string }>>([]);
  const [selectedCategories, setSelectedCategories] = useState<Array<{ id: string; name: string }>>(
    (init.categories || []).map((slug) => ({ id: slug, name: slug }))
  );

  // Brand picker state
  const [brandQuery, setBrandQuery] = useState('');
  const [brandsCatalog, setBrandsCatalog] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedBrands, setSelectedBrands] = useState<Array<{ id: string; name: string }>>(
    (init.brands || []).map((name) => ({ id: name, name }))
  );

  // Product picker state
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedProducts, setSelectedProducts] = useState<Array<{ id: string; name: string }>>(
    (init.products || []).map((id) => ({ id, name: id }))
  );

  // Keep values.products/brands/categories in sync with selections
  useEffect(() => {
    setValues((v) => ({ ...v, products: selectedProducts.map((p) => p.id) }));
  }, [selectedProducts]);

  useEffect(() => {
    setValues((v) => ({ ...v, brands: selectedBrands.map((b) => b.id) }));
  }, [selectedBrands]);

  useEffect(() => {
    setValues((v) => ({ ...v, categories: selectedCategories.map((c) => c.id) }));
  }, [selectedCategories]);

  // Load catalogs (categories and brands) once
  useEffect(() => {
    (async () => {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch('/api/categories?all=true'),
          fetch('/api/brands?limit=1000&productCount=false'),
        ]);
        const [catData, brandData] = await Promise.all([catRes.json(), brandRes.json()]);
        if (catData?.success && Array.isArray(catData.data)) {
          const cats = catData.data.map((c: any) => ({ id: c.id, slug: c.slug, name: c.name }));
          setCategoriesCatalog(cats);
          // Resolve initial category names for existing slugs
          setSelectedCategories((prev) => prev.map((p) => {
            const match = cats.find((c: any) => c.slug === p.id || c.id === p.id);
            return match ? { id: match.slug, name: match.name } : p;
          }));
        }
        if (brandData?.success) {
          const brandsArray = brandData.data?.brands || brandData.data || [];
          const b = brandsArray.map((br: any) => ({ id: br.name, name: br.name }));
          setBrandsCatalog(b);
          // Resolve initial names (already names)
        }
      } catch (_) {
        // ignore
      }
    })();
  }, []);

  // Search products with debounce
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(async () => {
      const q = productQuery.trim();
      if (!q) {
        setProductResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(q)}&limit=10`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          const items = data.data.map((p: any) => ({ id: p.id, name: p.name }));
          setProductResults(items);
        } else {
          setProductResults([]);
        }
      } catch (_) {
        // ignore
      }
    }, 300);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [productQuery]);

  const set = (patch: Partial<OfferFormValues>) => setValues(v => ({ ...v, ...patch }));

  const handleChange = (field: keyof OfferFormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (field === 'code') {
      set({ code: val.toUpperCase().replace(/[^A-Z0-9]/g, '') });
    } else if (['value', 'minAmount', 'maxDiscount', 'usageLimit', 'userUsageLimit'].includes(field as string)) {
      const num = val === '' ? (undefined as any) : Number(val);
      set({ [field]: (isNaN(num) ? (field === 'maxDiscount' || field === 'usageLimit' ? undefined : 0) : num) } as any);
    } else {
      set({ [field]: val } as any);
    }
  };

  const handleCSVChange = (field: 'categories' | 'brands' | 'products') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    set({ [field]: list } as any);
  };

  const csvValue = (arr: string[]) => (Array.isArray(arr) ? arr.join(', ') : '');

  const canShowMaxDiscount = values.type === 'percentage';
  const isShipping = values.type === 'shipping';

  const toISODateTime = (d?: string) => (d ? new Date(d).toISOString() : undefined);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();

    // Basic client validations
    if (!values.title || values.title.length < 3) return alert('Title must be at least 3 characters');
    if (!values.description || values.description.length < 10) return alert('Description must be at least 10 characters');
    if (!values.code || !/^[A-Z0-9]{3,20}$/.test(values.code)) return alert('Code must be 3-20 uppercase letters/numbers');
    if (!values.startDate) return alert('Start date is required');
    if (values.endDate && values.endDate <= values.startDate) return alert('End date must be after start date');

    const payload: OfferFormValues = {
      ...values,
      code: values.code.toUpperCase(),
      value: isShipping ? 0 : Number(values.value || 0),
      maxDiscount: canShowMaxDiscount && values.maxDiscount ? Number(values.maxDiscount) : undefined,
      usageLimit: values.usageLimit !== undefined ? Number(values.usageLimit) : undefined,
      userUsageLimit: Number(values.userUsageLimit || 1),
      // Convert to RFC3339 for Zod .datetime()
      startDate: toISODateTime(values.startDate) as any,
      endDate: values.endDate ? (toISODateTime(values.endDate) as any) : undefined,
    };

    try {
      setSaving(true);
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={values.title} onChange={handleChange('title')} required />
        </div>
        <div>
          <Label htmlFor="code">Code</Label>
          <Input id="code" value={values.code} onChange={handleChange('code')} required placeholder="SAVE10" />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={values.description} onChange={handleChange('description')} required rows={3} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Type</Label>
          <Select value={values.type} onValueChange={(val: any) => set({ type: val })}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="shipping">Free Shipping</SelectItem>
              <SelectItem value="bogo">BOGO</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="value">Value {values.type === 'percentage' ? '(%)' : values.type === 'fixed' ? '(₹)' : ''}</Label>
          <Input id="value" type="number" value={isShipping ? 0 : values.value}
                 onChange={handleChange('value')} disabled={isShipping} min={0} />
        </div>
        <div>
          <Label htmlFor="minAmount">Min Order Amount (₹)</Label>
          <Input id="minAmount" type="number" value={values.minAmount} onChange={handleChange('minAmount')} min={0} />
        </div>
      </div>

      {canShowMaxDiscount && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="maxDiscount">Max Discount (₹)</Label>
            <Input id="maxDiscount" type="number" value={values.maxDiscount ?? ''} onChange={handleChange('maxDiscount')} min={1} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="startDate">Start Date</Label>
          <Input id="startDate" type="date" value={values.startDate || ''} onChange={handleChange('startDate')} />
        </div>
        <div>
          <Label htmlFor="endDate">End Date</Label>
          <Input id="endDate" type="date" value={values.endDate || ''} onChange={handleChange('endDate')} />
        </div>
      </div>

      {/* Category & Brand pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Categories (search and select)</Label>
          <Input
            placeholder="Search categories by name..."
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
          />
          <div className="border rounded-md divide-y bg-white max-h-40 overflow-auto">
            {categoriesCatalog
              .filter((c) => c.name.toLowerCase().includes(categoryQuery.toLowerCase()))
              .slice(0, 10)
              .map((c) => {
                const already = selectedCategories.some((sc) => sc.id === c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    disabled={already}
                    onClick={() => {
                      if (!already) setSelectedCategories((prev) => [...prev, { id: c.slug, name: c.name }]);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between ${
                      already ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="truncate mr-3">{c.name}</span>
                    <span className="text-xs text-gray-400">{c.slug}</span>
                  </button>
                );
              })}
          </div>
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedCategories.map((c) => (
                <span key={c.id} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  <span className="text-sm truncate max-w-[200px]">{c.name}</span>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-800"
                    onClick={() => setSelectedCategories((prev) => prev.filter((x) => x.id !== c.id))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Brands (search and select)</Label>
          <Input
            placeholder="Search brands by name..."
            value={brandQuery}
            onChange={(e) => setBrandQuery(e.target.value)}
          />
          <div className="border rounded-md divide-y bg-white max-h-40 overflow-auto">
            {brandsCatalog
              .filter((b) => b.name.toLowerCase().includes(brandQuery.toLowerCase()))
              .slice(0, 10)
              .map((b) => {
                const already = selectedBrands.some((sb) => sb.id === b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={already}
                    onClick={() => {
                      if (!already) setSelectedBrands((prev) => [...prev, b]);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between ${
                      already ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <span className="truncate mr-3">{b.name}</span>
                  </button>
                );
              })}
          </div>
          {selectedBrands.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {selectedBrands.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  <span className="text-sm truncate max-w-[200px]">{b.name}</span>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-800"
                    onClick={() => setSelectedBrands((prev) => prev.filter((x) => x.id !== b.id))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product picker */}
      <div className="space-y-2">
        <Label>Products (search and select)</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Search products by name..."
            value={productQuery}
            onChange={(e) => setProductQuery(e.target.value)}
          />
        </div>
        {productResults.length > 0 && (
          <div className="border rounded-md divide-y bg-white max-h-56 overflow-auto">
            {productResults.map((p) => {
              const already = selectedProducts.some((sp) => sp.id === p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={already}
                  onClick={() => {
                    if (!already) setSelectedProducts((prev) => [...prev, p]);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center justify-between ${
                    already ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="truncate mr-3">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.id}</span>
                </button>
              );
            })}
          </div>
        )}
        {selectedProducts.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {selectedProducts.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-2 bg-gray-100 text-gray-800 px-2 py-1 rounded">
                <span className="text-sm truncate max-w-[200px]">{p.name}</span>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-800"
                  onClick={() => setSelectedProducts((prev) => prev.filter((x) => x.id !== p.id))}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="usageLimit">Usage Limit (optional)</Label>
          <Input id="usageLimit" type="number" value={values.usageLimit ?? ''} onChange={handleChange('usageLimit')} min={1} />
        </div>
        <div>
          <Label htmlFor="userUsageLimit">Per-User Limit</Label>
          <Input id="userUsageLimit" type="number" value={values.userUsageLimit} onChange={handleChange('userUsageLimit')} min={1} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center justify-between border p-3 rounded">
          <div>
            <Label htmlFor="isActive">Active</Label>
            <p className="text-xs text-gray-500">Disable to hide this offer</p>
          </div>
          <Switch id="isActive" checked={values.isActive} onCheckedChange={(v) => set({ isActive: !!v })} />
        </div>
        <div className="flex items-center justify-between border p-3 rounded">
          <div>
            <Label htmlFor="newCustomerOnly">New Customers Only</Label>
            <p className="text-xs text-gray-500">Limit to first-time buyers</p>
          </div>
          <Switch id="newCustomerOnly" checked={values.newCustomerOnly} onCheckedChange={(v) => set({ newCustomerOnly: !!v })} />
        </div>
      </div>

      <div>
        <Label>Applicable Roles</Label>
        <div className="mt-2 flex gap-4">
          {['customer', 'admin'].map((role) => (
            <label key={role} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={values.applicableUserRoles.includes(role as any)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  set({
                    applicableUserRoles: checked
                      ? Array.from(new Set([...values.applicableUserRoles, role as any]))
                      : values.applicableUserRoles.filter((r) => r !== role),
                  });
                }}
              />
              <span className="capitalize">{role}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={submitting || saving}>
          {submitting || saving ? 'Saving...' : 'Save Offer'}
        </Button>
      </div>
    </form>
  );
}
