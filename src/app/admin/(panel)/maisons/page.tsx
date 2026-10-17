import { requireAdmin } from '@/lib/auth';
import { BrandManager } from '@/components/admin/BrandManager';
import type { Brand } from '@/lib/types';

export default async function Maisons() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('brands').select('*, products(count)').order('sort_order').order('name');
  const brands = (data ?? []).map((b: Brand & { products: { count: number }[] }) => ({ ...b, count: b.products?.[0]?.count ?? 0 }));
  return (<div><h1 className="font-luxe mb-6 text-4xl">Maisons</h1><BrandManager brands={brands} /></div>);
}
