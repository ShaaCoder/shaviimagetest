'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useOrder } from '@/hooks/use-orders';
import { apiClient } from '@/lib/api';
import { Plus, Minus, Save, Search, Package, PencilLine } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminOrderEditPage() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const { order } = useOrder(selectedId);
  const router = useRouter();

  const [draft, setDraft] = useState<any | null>(null);
  const [reason, setReason] = useState('');

  const loadOrder = () => {
    if (!query.trim()) {
      toast.error('Enter an order ID or order number');
      return;
    }
    setSelectedId(query.trim());
  };

  const startEdit = () => {
    if (!order) return;
    setDraft({
      items: order.items.map((it: any) => ({ ...it })),
      shippingAddress: { ...order.shippingAddress },
      shipping: order.shipping,
      discount: order.discount,
    });
  };

  const updateItemQty = (idx: number, delta: number) => {
    setDraft((prev: any) => {
      const next = { ...prev };
      next.items = prev.items.map((it: any, i: number) => i === idx ? { ...it, quantity: Math.max(1, Number(it.quantity) + delta) } : it);
      return next;
    });
  };

  const removeItem = (idx: number) => {
    setDraft((prev: any) => ({ ...prev, items: prev.items.filter((_: any, i: number) => i !== idx) }));
  };

  const addItem = () => {
    setDraft((prev: any) => ({
      ...prev,
      items: [...prev.items, { productId: '', name: '', price: 0, image: '', quantity: 1, variant: '' }]
    }));
  };

  const saveChanges = async () => {
    if (!selectedId || !draft) return;
    try {
      const payload: any = {
        items: draft.items,
        shippingAddress: draft.shippingAddress,
        shipping: Number(draft.shipping),
        discount: Number(draft.discount),
        reason: reason || 'Admin edit before shipment'
      };
      const res = await apiClient.updateOrderDetails(selectedId, payload);
      if (res.success) {
        toast.success('Order updated');
        setDraft(null);
        setReason('');
        router.refresh();
      } else {
        toast.error(res.message || 'Failed to update');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-rose-600" />
          <h1 className="text-2xl font-bold">Edit Order (Pre-shipment)</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Find Order</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Input placeholder="Order ID or Order Number" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadOrder()} />
            <Button onClick={loadOrder}><Search className="w-4 h-4 mr-2"/>Search</Button>
          </CardContent>
        </Card>

        {order && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Order {order.orderNumber}</span>
                {!draft ? (
                  <Button onClick={startEdit}><PencilLine className="w-4 h-4 mr-2"/>Edit</Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => { setDraft(null); setReason(''); }}>Cancel</Button>
                    <Button onClick={saveChanges}><Save className="w-4 h-4 mr-2"/>Save</Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Shipping Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['name','phone','address','city','state','pincode'].map((field) => (
                  <div key={field}>
                    <Label className="capitalize">{field}</Label>
                    <Input
                      value={draft ? draft.shippingAddress[field] : (order as any).shippingAddress[field]}
                      onChange={(e) => draft && setDraft((prev: any) => ({ ...prev, shippingAddress: { ...prev.shippingAddress, [field]: e.target.value }}))}
                      disabled={!draft}
                    />
                  </div>
                ))}
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Items</h3>
                  {draft && <Button size="sm" onClick={addItem}><Plus className="w-4 h-4 mr-1"/>Add Item</Button>}
                </div>
                <div className="space-y-2">
                  {(draft ? draft.items : order.items).map((it: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Label>Product ID</Label>
                        <Input value={it.productId} disabled={!draft} onChange={(e) => draft && setDraft((prev: any) => ({ ...prev, items: prev.items.map((x: any, i: number) => i===idx? { ...x, productId: e.target.value }: x) }))} />
                      </div>
                      <div className="col-span-3">
                        <Label>Name</Label>
                        <Input value={it.name} disabled={!draft} onChange={(e) => draft && setDraft((prev: any) => ({ ...prev, items: prev.items.map((x: any, i: number) => i===idx? { ...x, name: e.target.value }: x) }))} />
                      </div>
                      <div className="col-span-2">
                        <Label>Price</Label>
                        <Input type="number" value={it.price} disabled={!draft} onChange={(e) => draft && setDraft((prev: any) => ({ ...prev, items: prev.items.map((x: any, i: number) => i===idx? { ...x, price: Number(e.target.value) }: x) }))} />
                      </div>
                      <div className="col-span-2">
                        <Label>Qty</Label>
                        <div className="flex gap-1">
                          {draft && <Button size="icon" variant="outline" onClick={() => updateItemQty(idx, -1)}><Minus className="w-4 h-4"/></Button>}
                          <Input type="number" value={it.quantity} disabled={!draft} onChange={(e) => draft && setDraft((prev: any) => ({ ...prev, items: prev.items.map((x: any, i: number) => i===idx? { ...x, quantity: Math.max(1, Number(e.target.value)) }: x) }))} />
                          {draft && <Button size="icon" variant="outline" onClick={() => updateItemQty(idx, +1)}><Plus className="w-4 h-4"/></Button>}
                        </div>
                      </div>
                      <div className="col-span-1">
                        {draft && <Button variant="destructive" size="sm" onClick={() => removeItem(idx)}>Remove</Button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Charges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Shipping Cost</Label>
                  <Input type="number" value={draft ? draft.shipping : order.shipping} disabled={!draft} onChange={(e) => draft && setDraft((prev: any) => ({ ...prev, shipping: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Discount</Label>
                  <Input type="number" value={draft ? draft.discount : order.discount} disabled={!draft} onChange={(e) => draft && setDraft((prev: any) => ({ ...prev, discount: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Reason (required for price changes)</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} disabled={!draft} placeholder="Describe why you edited this order" />
                </div>
              </div>

            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
