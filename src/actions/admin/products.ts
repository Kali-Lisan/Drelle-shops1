'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertAdmin } from '@/lib/auth';
import { uniqueSlug } from '@/lib/slug';
import { removeStorageObjects, type Result } from './media';

const uuid = z.string().uuid();
const money = z.number().min(0).max(10_000_000).multipleOf(0.01).nullable();
const variantSchema = z.object({
  id: uuid.optional(), label: z.string().trim().min(1, 'Variant label is required').max(80),
  size: z.string().trim().max(40).nullable(), color: z.string().trim().max(40).nullable(),
  sku: z.string().trim().max(60).nullable(), price: money, stock_quantity: z.number().int().min(0).max(100000),
});
const productSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, 'Name is required').max(160),
  brand_id: uuid.nullable(), category_id: uuid, subcategory_id: uuid.nullable(),
  description: z.string().max(5000), specifications: z.array(z.string().trim().min(1).max(200)).max(30),
  price: money, price_on_request: z.boolean(), original_price: money,
  sku: z.string().trim().max(60).nullable(),
  status: z.enum(['available', 'preorder', 'sold_out']),
  track_inventory: z.boolean(), stock_quantity: z.number().int().min(0).max(100000),
  is_featured: z.boolean(), is_published: z.boolean(),
  variants: z.array(variantSchema).max(50),
}).superRefine((v, ctx) => {
  if (!v.price_on_request && v.price == null) ctx.addIssue({ code: 'custom', path: ['price'], message: 'Enter a price or mark it as price on request.' });
  if (v.original_price != null && v.price != null && v.original_price < v.price) ctx.addIssue({ code: 'custom', path: ['original_price'], message: 'Original price must be at least the current price.' });
});
export type ProductInput = z.infer<typeof productSchema>;

const bust = () => { revalidatePath('/', 'layout'); };

export async function saveProduct(raw: unknown): Promise<Result<{ id: string }>> {
  const { supabase } = await assertAdmin();
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;
  if (v.price_on_request) { v.price = null; v.original_price = null; }

  if (v.subcategory_id) {
    const { data: sub } = await supabase.from('categories').select('parent_id').eq('id', v.subcategory_id).single();
    if (!sub || sub.parent_id !== v.category_id) return { ok: false, error: 'The subcategory does not belong to the selected category.' };
  }
  const fields = {
    name: v.name, brand_id: v.brand_id, category_id: v.category_id, subcategory_id: v.subcategory_id,
    description: v.description, specifications: v.specifications, price: v.price, price_on_request: v.price_on_request,
    original_price: v.original_price, sku: v.sku || null, status: v.status, track_inventory: v.track_inventory,
    stock_quantity: v.stock_quantity, is_featured: v.is_featured, is_published: v.is_published,
  };
  let id = v.id;
  if (id) {
    const { error } = await supabase.from('products').update(fields).eq('id', id);
    if (error) return { ok: false, error: error.code === '23505' ? 'That SKU is already used by another product.' : 'Could not save the product.' };
  } else {
    const slug = await uniqueSlug(supabase, 'products', v.name);
    const { data, error } = await supabase.from('products').insert({ ...fields, slug }).select('id').single();
    if (error || !data) return { ok: false, error: error?.code === '23505' ? 'That SKU is already used by another product.' : 'Could not create the product.' };
    id = data.id;
  }

  // Sync variants
  const { data: existing } = await supabase.from('product_variants').select('id').eq('product_id', id);
  const keep = new Set(v.variants.filter(x => x.id).map(x => x.id));
  const drop = (existing ?? []).map(e => e.id).filter(e => !keep.has(e));
  if (drop.length) await supabase.from('product_variants').delete().in('id', drop);
  for (let i = 0; i < v.variants.length; i++) {
    const x = v.variants[i];
    const row = { label: x.label, size: x.size || null, color: x.color || null, sku: x.sku || null, price: x.price, stock_quantity: x.stock_quantity, position: i };
    const { error } = x.id
      ? await supabase.from('product_variants').update(row).eq('id', x.id).eq('product_id', id)
      : await supabase.from('product_variants').insert({ ...row, product_id: id });
    if (error) return { ok: false, error: error.code === '23505' ? `Variant SKU "${x.sku}" is already in use.` : 'Could not save a variant.' };
  }
  bust();
  return { ok: true, id: id! };
}

export async function deleteProduct(id: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Invalid request.' };
  const { data, error } = await supabase.rpc('admin_delete_product', { p_id: id });
  if (error) return { ok: false, error: 'Could not delete the product.' };
  await removeStorageObjects((data ?? []) as { bucket: string; path: string }[]);
  bust(); return { ok: true };
}

export async function duplicateProduct(id: string): Promise<Result<{ id: string }>> {
  const { supabase } = await assertAdmin();
  if (!uuid.safeParse(id).success) return { ok: false, error: 'Invalid request.' };
  const { data, error } = await supabase.rpc('admin_duplicate_product', { p_id: id });
  if (error || !data) return { ok: false, error: 'Could not duplicate the product.' };
  bust(); return { ok: true, id: data as string };
}

export async function setPublished(id: string, published: boolean): Promise<Result> {
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from('products').update({ is_published: published }).eq('id', uuid.parse(id));
  if (error) return { ok: false, error: 'Could not update.' };
  bust(); return { ok: true };
}

// Inventory screen: explicit edits only; editing never flips availability on its own.
export async function updateStock(input: unknown): Promise<Result> {
  const { supabase } = await assertAdmin();
  const p = z.object({ productId: uuid.optional(), variantId: uuid.optional(), stock: z.number().int().min(0).max(100000),
    status: z.enum(['available', 'preorder', 'sold_out']).optional(), track: z.boolean().optional() }).safeParse(input);
  if (!p.success) return { ok: false, error: 'Invalid stock values.' };
  const d = p.data;
  if (d.variantId) {
    const { error } = await supabase.from('product_variants').update({ stock_quantity: d.stock }).eq('id', d.variantId);
    if (error) return { ok: false, error: 'Could not update stock.' };
  } else if (d.productId) {
    const upd: Record<string, unknown> = { stock_quantity: d.stock };
    if (d.status) upd.status = d.status;
    if (d.track !== undefined) upd.track_inventory = d.track;
    const { error } = await supabase.from('products').update(upd).eq('id', d.productId);
    if (error) return { ok: false, error: 'Could not update stock.' };
  } else return { ok: false, error: 'Invalid request.' };
  bust(); return { ok: true };
}
