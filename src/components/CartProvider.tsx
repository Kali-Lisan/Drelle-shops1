'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface CartLine {
  key: string; productId: string; variantId: string | null; variantLabel: string;
  slug: string; name: string; brand: string; price: number; image: string | null;
  status: 'available' | 'preorder' | 'sold_out'; qty: number; maxQty: number | null;
}
interface Ctx {
  lines: CartLine[]; ready: boolean; count: number; total: number;
  add: (l: Omit<CartLine, 'key' | 'qty'>, qty?: number) => void;
  setQty: (key: string, qty: number) => void; remove: (key: string) => void; clear: () => void;
  replaceAll: (lines: CartLine[]) => void;
  checkoutKey: () => string; resetCheckoutKey: () => void;
}
const CartCtx = createContext<Ctx | null>(null);
const STORE = 'drelle-cart-v1';
const KEY_STORE = 'drelle-checkout-key-v1';

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(STORE); if (raw) setLines(JSON.parse(raw)); } catch { /* ignore */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORE, JSON.stringify(lines)); } catch { /* ignore */ }
  }, [lines, ready]);

  const add: Ctx['add'] = useCallback((l, qty = 1) => {
    const key = `${l.productId}|${l.variantId ?? ''}`;
    setLines(prev => {
      const ex = prev.find(x => x.key === key);
      const cap = l.maxQty ?? 20;
      if (ex) return prev.map(x => x.key === key ? { ...x, ...l, qty: Math.min(x.qty + qty, cap, 20) } : x);
      return [...prev, { ...l, key, qty: Math.min(qty, cap, 20) }];
    });
    try { localStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
  }, []);
  const setQty = useCallback((key: string, qty: number) =>
    setLines(prev => prev.map(x => x.key === key ? { ...x, qty: Math.max(1, Math.min(qty, x.maxQty ?? 20, 20)) } : x)), []);
  const remove = useCallback((key: string) => setLines(prev => prev.filter(x => x.key !== key)), []);
  const clear = useCallback(() => setLines([]), []);
  const replaceAll = useCallback((l: CartLine[]) => setLines(l), []);

  // One idempotency key per cart state: retrying the same checkout can never create a second order.
  const checkoutKey = useCallback(() => {
    const sig = lines.map(l => `${l.key}:${l.qty}`).sort().join(',');
    try {
      const raw = localStorage.getItem(KEY_STORE);
      if (raw) { const o = JSON.parse(raw); if (o.sig === sig) return o.key as string; }
      const key = crypto.randomUUID();
      localStorage.setItem(KEY_STORE, JSON.stringify({ sig, key }));
      return key;
    } catch { return crypto.randomUUID(); }
  }, [lines]);
  const resetCheckoutKey = useCallback(() => { try { localStorage.removeItem(KEY_STORE); } catch { /* ignore */ } }, []);

  const value = useMemo<Ctx>(() => ({
    lines, ready, count: lines.reduce((s, l) => s + l.qty, 0),
    total: lines.reduce((s, l) => s + l.qty * l.price, 0),
    add, setQty, remove, clear, replaceAll, checkoutKey, resetCheckoutKey,
  }), [lines, ready, add, setQty, remove, clear, replaceAll, checkoutKey, resetCheckoutKey]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error('useCart outside CartProvider');
  return c;
};
