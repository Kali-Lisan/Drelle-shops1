import { publicClient } from './supabase/public';
import type { Brand, Category, ProductFull, ProductRow, Settings } from './types';

export const PAGE_SIZE = 24;

export async function getSettings(): Promise<Settings> {
  const { data } = await publicClient().from('store_settings').select('*').eq('id', 1).single();
  return (data ?? {
    store_name: 'Drelle Shops', tagline: '', whatsapp_number: '', support_email: '', announcement_text: '',
    show_announcement: false, inquiry_template: 'Hello, I am interested in the {brand} {product_name}.',
    preorder_policy: '', low_stock_threshold: 3,
  }) as Settings;
}

export async function getBrands(opts: { featured?: boolean } = {}): Promise<Brand[]> {
  let q = publicClient().from('brands').select('*').eq('is_visible', true);
  if (opts.featured) q = q.eq('is_featured', true);
  const { data } = await q.order('sort_order').order('name');
  return (data ?? []) as Brand[];
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await publicClient().from('categories').select('*').eq('is_visible', true).order('sort_order').order('name');
  return (data ?? []) as Category[];
}

export interface ListParams {
  q?: string; brands?: string[]; category?: string; min?: number; max?: number;
  availability?: string[]; sort?: string; page?: number; featured?: boolean; status?: string; limit?: number;
}

export async function getProducts(p: ListParams = {}): Promise<{ rows: ProductRow[]; total: number }> {
  const limit = p.limit ?? PAGE_SIZE;
  const page = Math.max(p.page ?? 1, 1);
  const { data, error } = await publicClient().rpc('storefront_products', {
    p_search: p.q || null, p_brand_slugs: p.brands?.length ? p.brands : null, p_category_slug: p.category || null,
    p_min: p.min ?? null, p_max: p.max ?? null, p_availability: p.availability?.length ? p.availability : null,
    p_sort: p.sort || 'recommended', p_limit: limit, p_offset: (page - 1) * limit,
    p_featured: p.featured ?? null, p_status: p.status ?? null,
  });
  if (error) { console.error('getProducts', error.message); return { rows: [], total: 0 }; }
  const rows = (data ?? []) as ProductRow[];
  return { rows, total: rows[0] ? Number(rows[0].total_count) : 0 };
}

export const PRODUCT_SELECT =
  '*, brand:brands(name,slug), category:categories!products_category_id_fkey(name,slug), subcategory:categories!products_subcategory_id_fkey(name,slug), product_variants(*), product_media(*)';

export async function getProductBySlug(slug: string): Promise<ProductFull | null> {
  const { data } = await publicClient().from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('is_published', true).maybeSingle();
  if (!data) return null;
  const p = data as unknown as ProductFull;
  p.product_variants.sort((a, b) => a.position - b.position);
  p.product_media.sort((a, b) => a.position - b.position);
  return p;
}

export async function getPage(slug: string) {
  const { data } = await publicClient().from('store_pages').select('*').eq('slug', slug).maybeSingle();
  return data as { slug: string; title: string; body: string } | null;
}
