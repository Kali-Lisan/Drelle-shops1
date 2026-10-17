'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { useCart } from '../CartProvider';
import { ghs } from '@/lib/format';

interface V { id: string; label: string; price: number | null; available: number | null }
export interface AddProps {
  productId: string; slug: string; name: string; brand: string; image: string | null;
  status: 'available' | 'preorder' | 'sold_out'; price: number | null; priceOnRequest: boolean;
  trackInventory: boolean; available: number | null; variants: V[];
}

export function AddToCart(p: AddProps) {
  const { add } = useCart();
  const [variantId, setVariantId] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState('');
  const variant = p.variants.find(v => v.id === variantId);
  const unitPrice = variant?.price ?? p.price;
  const stock = p.status === 'preorder' || !p.trackInventory ? null : variant ? variant.available : p.available;
  const cap = stock === null ? 20 : Math.min(stock, 20);

  if (p.priceOnRequest) return <p className="text-sm text-neutral-600">This item is priced on request. Use “Ask about this product” and we will send you the price.</p>;
  if (p.status === 'sold_out') return <button className="btn btn-primary w-full" disabled>Sold out</button>;

  const onAdd = () => {
    setErr('');
    if (p.variants.length > 0 && !variant) { setErr('Please select an option first.'); return; }
    if (stock !== null && stock < 1) { setErr('This option is currently out of stock.'); return; }
    add({ productId: p.productId, variantId: variant?.id ?? null, variantLabel: variant?.label ?? '', slug: p.slug, name: p.name, brand: p.brand,
      price: unitPrice ?? 0, image: p.image, status: p.status, maxQty: stock }, qty);
    setAdded(true); setTimeout(() => setAdded(false), 2500);
  };

  return (
    <div className="space-y-4">
      {p.variants.length > 0 && (
        <div><label htmlFor="variant" className="label">Select option</label>
          <select id="variant" className="input" value={variantId} onChange={e => { setVariantId(e.target.value); setQty(1); setErr(''); }}>
            <option value="">Choose…</option>
            {p.variants.map(v => <option key={v.id} value={v.id} disabled={v.available !== null && v.available < 1 && p.status === 'available'}>
              {v.label}{v.price != null ? ` — ${ghs(v.price)}` : ''}{v.available !== null && v.available < 1 && p.status === 'available' ? ' (out of stock)' : ''}</option>)}
          </select></div>)}
      <div className="flex items-center gap-4">
        <div className="flex items-center border border-neutral-300" role="group" aria-label="Quantity">
          <button className="p-2.5" aria-label="Decrease quantity" onClick={() => setQty(q => Math.max(1, q - 1))}><Minus className="h-4 w-4" /></button>
          <span className="w-10 text-center text-sm" aria-live="polite">{qty}</span>
          <button className="p-2.5" aria-label="Increase quantity" onClick={() => setQty(q => Math.min(cap, q + 1))} disabled={qty >= cap}><Plus className="h-4 w-4" /></button>
        </div>
        <button className="btn btn-primary flex-1" onClick={onAdd}>{added ? <><Check className="h-4 w-4" /> Added</> : p.status === 'preorder' ? 'Preorder' : 'Add to cart'}</button>
      </div>
      {stock !== null && stock > 0 && stock <= 5 && <p className="text-xs text-amber-700">Only {stock} left</p>}
      {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
      {added && <Link href="/cart" className="block text-sm underline">View cart</Link>}
    </div>
  );
}
