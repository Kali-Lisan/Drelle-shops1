import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { ProductRowActions } from '@/components/admin/ProductRowActions';
import { ghs, statusLabel } from '@/lib/format';

const SIZE = 25;
type SP = Record<string, string | undefined>;

export default async function Products({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const page = Math.max(Number(sp.page) || 1, 1);
  const q = (sp.q ?? '').replace(/[%,()*\\]/g, ' ').trim().slice(0, 80);
  let query = supabase.from('products').select(
    'id,name,price,price_on_request,status,stock_quantity,reserved_quantity,track_inventory,is_published,is_featured,brand:brands(name),category:categories!products_category_id_fkey(name)', { count: 'exact' });
  if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
  if (sp.brand && /^[0-9a-f-]{36}$/.test(sp.brand)) query = query.eq('brand_id', sp.brand);
  if (sp.category && /^[0-9a-f-]{36}$/.test(sp.category)) query = query.or(`category_id.eq.${sp.category},subcategory_id.eq.${sp.category}`);
  if (['available', 'preorder', 'sold_out'].includes(sp.status ?? '')) query = query.eq('status', sp.status!);
  if (sp.published === 'no') query = query.eq('is_published', false);
  const { data, count } = await query.order('created_at', { ascending: false }).range((page - 1) * SIZE, page * SIZE - 1);
  const pages = Math.max(Math.ceil((count ?? 0) / SIZE), 1);
  const rows = (data ?? []) as unknown as { id: string; name: string; price: number | null; price_on_request: boolean; status: string; stock_quantity: number; reserved_quantity: number; track_inventory: boolean; is_published: boolean; is_featured: boolean; brand: { name: string } | null; category: { name: string } | null }[];
  const keep = (p: number) => { const u = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== 'page') as [string, string][]); if (p > 1) u.set('page', String(p)); return `/admin/products?${u}`; };
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-luxe text-4xl">Products <span className="text-lg text-neutral-400">({count ?? 0})</span></h1>
        <Link href="/admin/products/new" className="btn btn-primary">Add product</Link></div>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Search name or SKU" className="input max-w-xs" aria-label="Search products" />
        <select name="status" defaultValue={sp.status ?? ''} className="input w-auto" aria-label="Availability"><option value="">Any availability</option><option value="available">Available</option><option value="preorder">Preorder</option><option value="sold_out">Sold out</option></select>
        <select name="published" defaultValue={sp.published ?? ''} className="input w-auto" aria-label="Publication"><option value="">All</option><option value="no">Unpublished only</option></select>
        <button className="btn btn-outline">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="p-3">Product</th><th className="p-3">Category</th><th className="p-3">Price</th><th className="p-3">Availability</th><th className="p-3">Stock</th><th className="p-3">Published</th><th className="p-3" /></tr></thead>
          <tbody>{rows.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-neutral-500">No products found.</td></tr>}
            {rows.map(p => (<tr key={p.id} className="border-b last:border-0">
              <td className="p-3"><p className="font-medium">{p.name}</p><p className="text-xs text-neutral-500">{p.brand?.name ?? 'No maison'}{p.is_featured && ' · Featured'}</p></td>
              <td className="p-3">{p.category?.name}</td><td className="p-3 whitespace-nowrap">{ghs(p.price)}</td><td className="p-3">{statusLabel[p.status]}</td>
              <td className="p-3">{p.track_inventory ? `${p.stock_quantity}${p.reserved_quantity ? ` (${p.reserved_quantity} held)` : ''}` : 'Not tracked'}</td>
              <td className="p-3">{p.is_published ? 'Yes' : 'No'}</td>
              <td className="p-3"><ProductRowActions id={p.id} name={p.name} published={p.is_published} /></td></tr>))}</tbody>
        </table>
      </div>
      {pages > 1 && <nav className="mt-6 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
        {page > 1 ? <Link className="btn btn-outline btn-sm" href={keep(page - 1)}>Previous</Link> : <span />}<span>Page {page} of {pages}</span>
        {page < pages ? <Link className="btn btn-outline btn-sm" href={keep(page + 1)}>Next</Link> : <span />}</nav>}
    </div>
  );
}
