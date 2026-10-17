'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertAdmin } from '@/lib/auth';
import { uniqueSlug } from '@/lib/slug';
import { confirmImageUpload, removeStorageObjects, type Result } from './media';

const uuid = z.string().uuid();
const bust = () => { revalidatePath('/', 'layout'); };
const imgPath = z.string().regex(/^(brands|categories)\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/).nullable();

const brandSchema = z.object({
  id: uuid.optional(), name: z.string().trim().min(1, 'Display name is required').max(100), slug: z.string().trim().max(100).optional(),
  description: z.string().max(2000), origin: z.string().trim().max(100), logo_path: imgPath,
  is_visible: z.boolean(), is_featured: z.boolean(), sort_order: z.number().int().min(-9999).max(9999),
});

export async function saveBrand(raw: unknown): Promise<Result<{ id: string }>> {
  const { supabase } = await assertAdmin();
  const p = brandSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const v = p.data;
  let oldLogo: string | null = null;
  if (v.id) { const { data } = await supabase.from('brands').select('logo_path').eq('id', v.id).single(); oldLogo = data?.logo_path ?? null; }
  if (v.logo_path && v.logo_path !== oldLogo) { const c = await confirmImageUpload(v.logo_path); if (!c.ok) return c; }
  const slug = await uniqueSlug(supabase, 'brands', v.slug || v.name, v.id);
  const row = { name: v.name, slug, description: v.description, origin: v.origin, logo_path: v.logo_path, is_visible: v.is_visible, is_featured: v.is_featured, sort_order: v.sort_order };
  const q = v.id ? supabase.from('brands').update(row).eq('id', v.id).select('id').single() : supabase.from('brands').insert(row).select('id').single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: 'Could not save the maison.' };
  if (oldLogo && oldLogo !== v.logo_path) await removeStorageObjects([{ bucket: 'product-images', path: oldLogo }]);
  bust(); return { ok: true, id: data.id };
}

export async function deleteBrand(id: string, mode: 'none' | 'reassign' | 'delete_products', reassignTo: string | null): Promise<Result> {
  const { supabase } = await assertAdmin();
  if (!uuid.safeParse(id).success || !['none', 'reassign', 'delete_products'].includes(mode)) return { ok: false, error: 'Invalid request.' };
  const { data, error } = await supabase.rpc('admin_delete_brand', { p_id: id, p_mode: mode, p_reassign: reassignTo });
  if (error) return { ok: false, error: error.message.startsWith('HAS_PRODUCTS') ? 'This maison still has products. Choose what to do with them.' : 'Could not delete the maison.' };
  await removeStorageObjects((data ?? []) as { bucket: string; path: string }[]);
  bust(); return { ok: true };
}

const catSchema = z.object({
  id: uuid.optional(), name: z.string().trim().min(1, 'Name is required').max(80), parent_id: uuid.nullable(),
  image_path: imgPath, is_visible: z.boolean(), sort_order: z.number().int().min(-9999).max(9999),
});

export async function saveCategory(raw: unknown): Promise<Result<{ id: string }>> {
  const { supabase } = await assertAdmin();
  const p = catSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const v = p.data;
  if (v.id && v.parent_id === v.id) return { ok: false, error: 'A category cannot be its own parent.' };
  if (v.parent_id) {
    const { data: par } = await supabase.from('categories').select('parent_id').eq('id', v.parent_id).single();
    if (!par || par.parent_id) return { ok: false, error: 'Subcategories can only be one level deep.' };
    if (v.id) { const { count } = await supabase.from('categories').select('id', { count: 'exact', head: true }).eq('parent_id', v.id); if (count) return { ok: false, error: 'This category has subcategories, so it cannot become a subcategory.' }; }
  }
  let oldImg: string | null = null;
  if (v.id) { const { data } = await supabase.from('categories').select('image_path').eq('id', v.id).single(); oldImg = data?.image_path ?? null; }
  if (v.image_path && v.image_path !== oldImg) { const c = await confirmImageUpload(v.image_path); if (!c.ok) return c; }
  const slug = await uniqueSlug(supabase, 'categories', v.name, v.id);
  const row = { name: v.name, slug, parent_id: v.parent_id, image_path: v.image_path, is_visible: v.is_visible, sort_order: v.sort_order };
  const q = v.id ? supabase.from('categories').update(row).eq('id', v.id).select('id').single() : supabase.from('categories').insert(row).select('id').single();
  const { data, error } = await q;
  if (error || !data) return { ok: false, error: 'Could not save the category.' };
  if (oldImg && oldImg !== v.image_path) await removeStorageObjects([{ bucket: 'product-images', path: oldImg }]);
  bust(); return { ok: true, id: data.id };
}

export async function deleteCategory(id: string, mode: 'none' | 'reassign' | 'delete_products', reassignTo: string | null): Promise<Result> {
  const { supabase } = await assertAdmin();
  if (!uuid.safeParse(id).success || !['none', 'reassign', 'delete_products'].includes(mode)) return { ok: false, error: 'Invalid request.' };
  const { data, error } = await supabase.rpc('admin_delete_category', { p_id: id, p_mode: mode, p_reassign: reassignTo });
  if (error) return { ok: false, error: error.message.startsWith('HAS_PRODUCTS') ? 'This category still has products. Choose what to do with them.' : error.message.startsWith('INVALID_TARGET') ? 'Choose a different top-level category to move products to.' : 'Could not delete the category.' };
  await removeStorageObjects((data ?? []) as { bucket: string; path: string }[]);
  bust(); return { ok: true };
}

export async function reorderCategories(ids: string[]): Promise<Result> {
  const { supabase } = await assertAdmin();
  if (!z.array(uuid).max(200).safeParse(ids).success) return { ok: false, error: 'Invalid request.' };
  for (let i = 0; i < ids.length; i++) await supabase.from('categories').update({ sort_order: i + 1 }).eq('id', ids[i]);
  bust(); return { ok: true };
}
