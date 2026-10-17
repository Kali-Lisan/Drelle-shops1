import { requireAdmin } from '@/lib/auth';
import { CategoryManager } from '@/components/admin/CategoryManager';
import type { Category } from '@/lib/types';

export default async function Categories() {
  const { supabase } = await requireAdmin();
  const [{ data: cats }, { data: prods }] = await Promise.all([
    supabase.from('categories').select('*').order('sort_order').order('name'),
    supabase.from('products').select('category_id,subcategory_id')]);
  const count = (id: string) => (prods ?? []).filter(p => p.category_id === id || p.subcategory_id === id).length;
  return (<div><h1 className="font-luxe mb-6 text-4xl">Categories</h1>
    <CategoryManager cats={((cats ?? []) as Category[]).map(c => ({ ...c, count: count(c.id) }))} /></div>);
}
