'use server';
import { z } from 'zod';
import { publicClient } from '@/lib/supabase/public';
import { PRODUCT_SELECT, getSettings } from '@/lib/data';
import { imageUrl } from '@/lib/media';
import { orderMessage, waLink } from '@/lib/whatsapp';
import type { ProductFull } from '@/lib/types';

const itemSchema = z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullable(), qty: z.number().int().min(1).max(20) });

export interface FreshLine {
  productId: string; variantId: string | null; variantLabel: string; slug: string; name: string; brand: string;
  price: number | null; image: string | null; status: 'available' | 'preorder' | 'sold_out'; maxQty: number | null;
  problem: string | null;
}

// Re-reads prices/availability from the database so the cart never shows stale or tampered data.
export async function refreshCart(raw: unknown): Promise<FreshLine[]> {
  const items = z.array(itemSchema).max(50).safeParse(raw);
  if (!items.success) return [];
  const ids = [...new Set(items.data.map(i => i.productId))];
  const { data } = await publicClient().from('products').select(PRODUCT_SELECT).in('id', ids).eq('is_published', true);
  const map = new Map((data as unknown as ProductFull[] ?? []).map(p => [p.id, p]));
  return items.data.map(it => {
    const p = map.get(it.productId);
    if (!p) return { productId: it.productId, variantId: it.variantId, variantLabel: '', slug: '', name: 'Unavailable item', brand: '', price: null, image: null, status: 'sold_out', maxQty: 0, problem: 'This item is no longer available.' };
    const v = p.product_variants.find(x => x.id === it.variantId);
    const img = [...p.product_media].filter(m => m.media_type === 'image').sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position)[0];
    let problem: string | null = null;
    if (p.price_on_request || p.price == null) problem = 'Price on request — please ask on WhatsApp.';
    else if (p.status === 'sold_out') problem = 'Sold out.';
    else if (p.product_variants.length > 0 && !v) problem = 'This option is no longer available.';
    const stock = p.status === 'preorder' || !p.track_inventory ? null : v ? Math.max(v.stock_quantity - v.reserved_quantity, 0) : Math.max(p.stock_quantity - p.reserved_quantity, 0);
    if (!problem && stock !== null && stock < it.qty) problem = stock === 0 ? 'Out of stock.' : `Only ${stock} available.`;
    return { productId: p.id, variantId: v?.id ?? null, variantLabel: v?.label ?? '', slug: p.slug, name: p.name, brand: p.brand?.name ?? '',
      price: v?.price ?? p.price, image: imageUrl(img?.storage_path), status: p.status, maxQty: stock, problem };
  });
}

const orderSchema = z.object({
  key: z.string().uuid(), items: z.array(itemSchema).min(1).max(50),
  name: z.string().trim().max(100), phone: z.string().trim().max(25).regex(/^[0-9+() -]*$/, 'Phone may only contain digits, spaces, + ( ) -'),
  notes: z.string().trim().max(1000),
});

export type PlaceOrderResult = { ok: true; reference: string; total: number; waUrl: string | null; hasPreorder: boolean } | { ok: false; error: string };

const MSG: Record<string, (a: string[]) => string> = {
  EMPTY_CART: () => 'Your cart is empty.',
  INVALID_CONTACT: () => 'Please check your name and phone number.',
  INVALID_QUANTITY: () => 'One of the quantities is invalid.',
  PRODUCT_UNAVAILABLE: () => 'An item in your cart is no longer available. Please review your cart.',
  PRICE_ON_REQUEST: a => `${a[0]} is price on request. Remove it and ask about it on WhatsApp.`,
  SOLD_OUT: a => `${a[0]} is sold out.`,
  VARIANT_REQUIRED: a => `Please choose an option for ${a[0]}.`,
  VARIANT_INVALID: a => `The selected option for ${a[0]} is no longer available.`,
  INSUFFICIENT_STOCK: a => `Only ${a[1]} of ${a[0]} available. Please reduce the quantity.`,
};

export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = orderSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid order.' };
  const o = parsed.data;
  const sb = publicClient();
  const { data, error } = await sb.rpc('create_order', {
    p_idempotency_key: o.key, p_customer_name: o.name, p_customer_phone: o.phone, p_notes: o.notes,
    p_items: o.items.map(i => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.qty })),
  });
  if (error) {
    const m = error.message.match(/^([A-Z_]+)(?::(.*))?$/);
    const f = m && MSG[m[1]];
    return { ok: false, error: f ? f((m![2] ?? '').split(':')) : 'We could not place your order. Please try again.' };
  }
  const order = data as { reference: string; total: number; has_preorder: boolean; customer_name: string; items: Parameters<typeof orderMessage>[1]['items'] };
  const s = await getSettings();
  const waUrl = s.whatsapp_number ? waLink(s.whatsapp_number, orderMessage(s.store_name, { reference: order.reference, total: Number(order.total), has_preorder: order.has_preorder, items: order.items }, order.customer_name)) : null;
  return { ok: true, reference: order.reference, total: Number(order.total), waUrl, hasPreorder: order.has_preorder };
}
