import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { PRODUCT_SELECT } from '@/lib/data';
import { ProductEditor } from '@/components/admin/ProductEditor';
import type { Brand, Category, ProductFull } from '@/lib/types';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: p }, { data: brands }, { data: cats }] = await Promise.all([
    supabase.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle(),
    supabase.from('brands').select('*').order('name'), supabase.from('categories').select('*').order('sort_order').order('name')]);
  if (!p) notFound();
  const product = p as unknown as ProductFull;
  product.product_variants.sort((a, b) => a.position - b.position);
  return (<div className="mx-auto max-w-4xl"><h1 className="font-luxe mb-6 text-4xl">{product.name}</h1>
    <ProductEditor key={product.updated_at} product={product} brands={(brands ?? []) as Brand[]} categories={(cats ?? []) as Category[]} /></div>);
}
