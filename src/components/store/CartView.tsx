'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { CheckCircle2, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../CartProvider';
import { refreshCart, placeOrder, type PlaceOrderResult } from '@/actions/checkout';
import { ghs } from '@/lib/format';
import { Placeholder } from './ProductCard';

export function CartView() {
  const cart = useCart();
  const { lines, ready } = cart;
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [result, setResult] = useState<PlaceOrderResult | null>(null);
  const [pending, start] = useTransition();
  const refreshed = useRef(false);

  // Re-validate against the database once the persisted cart has loaded.
  useEffect(() => {
    if (!ready || refreshed.current || lines.length === 0) return;
    refreshed.current = true;
    refreshCart(lines.map(l => ({ productId: l.productId, variantId: l.variantId, qty: l.qty }))).then(fresh => {
      const probs: Record<string, string> = {};
      const next = lines.map(l => {
        const f = fresh.find(x => x.productId === l.productId && x.variantId === l.variantId);
        if (!f) return l;
        if (f.problem) probs[l.key] = f.problem;
        return { ...l, name: f.name, brand: f.brand, price: f.price ?? l.price, image: f.image, status: f.status, maxQty: f.maxQty, variantLabel: f.variantLabel, slug: f.slug || l.slug };
      });
      setProblems(probs); cart.replaceAll(next);
    }).catch(() => { /* offline: server re-validates at checkout anyway */ });
  }, [ready, lines, cart]);

  const blocked = lines.some(l => problems[l.key]);
  const checkout = () => start(async () => {
    const r = await placeOrder({ key: cart.checkoutKey(), items: lines.map(l => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })), ...form });
    setResult(r);
    if (r.ok) {
      cart.clear(); cart.resetCheckoutKey();
      if (r.waUrl) window.open(r.waUrl, '_blank', 'noopener,noreferrer');
    }
  });

  if (result?.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-700" aria-hidden />
        <h1 className="font-luxe mt-4 text-4xl">Order request saved</h1>
        <p className="mt-2 text-sm text-neutral-600">Reference <strong>{result.reference}</strong> · Total {ghs(result.total)}</p>
        <p className="mt-4 border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-950">
          Your order is <strong>pending</strong>. It is not confirmed until you send the prepared WhatsApp message and we confirm it with you. No payment has been taken.
          {result.hasPreorder && ' This order includes preorder items.'}
        </p>
        {result.waUrl ? <a href={result.waUrl} target="_blank" rel="noopener noreferrer" className="btn btn-wa mt-6">Open WhatsApp to send your order</a>
          : <p className="mt-6 text-sm text-red-700">WhatsApp is not configured yet. Please quote your reference when you contact us.</p>}
        <div className="mt-4"><Link href="/shop" className="text-sm underline">Continue shopping</Link></div>
      </div>
    );
  }

  if (!ready) return <div className="mx-auto max-w-4xl px-4 py-10"><div className="skeleton h-10 w-48" /><div className="skeleton mt-6 h-40" /></div>;
  if (lines.length === 0) return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="font-luxe text-4xl">Your cart is empty</h1>
      <Link href="/shop" className="btn btn-primary mt-8">Continue shopping</Link></div>);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-luxe text-4xl">Your cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
          {lines.map(l => (
            <li key={l.key} className="flex gap-4 py-5">
              <Link href={l.slug ? `/product/${l.slug}` : '#'} className="relative h-28 w-24 shrink-0 overflow-hidden bg-neutral-100">
                {l.image ? <Image src={l.image} alt={l.name} fill sizes="96px" className="object-cover" /> : <Placeholder label="No photo" />}
              </Link>
              <div className="flex-1">
                {l.brand && <p className="text-[11px] uppercase tracking-widest text-neutral-500">{l.brand}</p>}
                <p className="font-medium">{l.name}</p>
                {l.variantLabel && <p className="text-xs text-neutral-500">{l.variantLabel}</p>}
                {l.status === 'preorder' && <span className="badge mt-1 bg-amber-200 text-amber-950">Preorder</span>}
                <p className="mt-1 text-sm">{ghs(l.price)} each</p>
                {problems[l.key] && <p className="mt-1 text-sm text-red-700" role="alert">{problems[l.key]}</p>}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center border border-neutral-300" role="group" aria-label={`Quantity for ${l.name}`}>
                    <button className="p-2" aria-label="Decrease quantity" onClick={() => cart.setQty(l.key, l.qty - 1)} disabled={l.qty <= 1}><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-8 text-center text-sm">{l.qty}</span>
                    <button className="p-2" aria-label="Increase quantity" onClick={() => cart.setQty(l.key, l.qty + 1)} disabled={l.qty >= (l.maxQty ?? 20)}><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <button className="text-neutral-500 hover:text-red-700" aria-label={`Remove ${l.name}`} onClick={() => cart.remove(l.key)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <p className="font-semibold">{ghs(l.price * l.qty)}</p>
            </li>))}
        </ul>
        <aside className="card h-fit space-y-4 p-5">
          <div className="flex justify-between text-lg"><span>Total</span><strong>{ghs(cart.total)}</strong></div>
          <p className="text-xs text-neutral-500">Prices are confirmed by our server when you check out.</p>
          <div><label className="label" htmlFor="cname">Your name (optional)</label><input id="cname" className="input" maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoComplete="name" /></div>
          <div><label className="label" htmlFor="cphone">WhatsApp number (optional)</label><input id="cphone" className="input" maxLength={25} inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></div>
          <div><label className="label" htmlFor="cnotes">Notes (optional)</label><textarea id="cnotes" className="input" rows={2} maxLength={1000} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          {result && !result.ok && <p className="text-sm text-red-700" role="alert">{result.error}</p>}
          {blocked && <p className="text-sm text-red-700">Please fix or remove the highlighted items to continue.</p>}
          <button className="btn btn-wa w-full" disabled={pending || blocked} onClick={checkout}>{pending ? 'Saving order…' : 'Complete purchase on WhatsApp'}</button>
          <Link href="/shop" className="block text-center text-sm underline">Continue shopping</Link>
        </aside>
      </div>
    </div>
  );
}
