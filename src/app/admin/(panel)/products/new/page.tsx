import { requireAdmin } from '@/lib/auth';
import { ProductEditor } from '@/components/admin/ProductEditor';
import type { Brand, Category } from '@/lib/types';

export default async function NewProduct() {
  const { supabase } = await requireAdmin();
  const [{ data: brands }, { data: cats }] = await Promise.all([
    supabase.from('brands').select('*').order('name'), supabase.from('categories').select('*').order('sort_order').order('name')]);
  return (<div className="mx-auto max-w-4xl"><h1 className="font-luxe mb-6 text-4xl">Add product</h1>
    <ProductEditor product={null} brands={(brands ?? []) as Brand[]} categories={(cats ?? []) as Category[]} /></div>);
}
