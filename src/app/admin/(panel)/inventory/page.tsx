import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { InventoryTable, type InvRow } from '@/components/admin/InventoryTable';

const SIZE = 40;
export default async function Inventory({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const page = Math.max(Number(sp.page) || 1, 1);
  const { data: set } = await supabase.from('store_settings').select('low_stock_threshold').eq('id', 1).single();
  const t = set?.low_stock_threshold ?? 3;
  let q = supabase.from('products').select('id,name,status,track_inventory,stock_quantity,reserved_quantity,brand:brands(name),product_variants(id,label,stock_quantity,reserved_quantity)', { count: 'exact' });
  if (sp.low === '1') q = q.eq('track_inventory', true).eq('status', 'available');
  const { data, count } = await q.order('name').range((page - 1) * SIZE, page * SIZE - 1);
  type P = { id: string; name: string; status: InvRow['status']; track_inventory: boolean; stock_quantity: number; reserved_quantity: number; brand: { name: string } | null; product_variants: { id: string; label: string; stock_quantity: number; reserved_quantity: number }[] };
  const rows: InvRow[] = [];
  for (const p of ((data ?? []) as unknown as P[])) {
    const hasV = p.product_variants.length > 0;
    if (sp.low === '1' && !hasV && p.stock_quantity - p.reserved_quantity > t) continue;
    rows.push({ productId: p.id, name: p.name, sub: hasV ? 'Stock managed per variant' : p.brand?.name, stock: hasV ? 0 : p.stock_quantity, held: hasV ? 0 : p.reserved_quantity, track: p.track_inventory, status: p.status });
    for (const v of p.product_variants) rows.push({ productId: p.id, variantId: v.id, name: v.label, stock: v.stock_quantity, held: v.reserved_quantity, track: true, status: p.status });
  }
  const pages = Math.max(Math.ceil((count ?? 0) / SIZE), 1);
  return (
    <div>
      <h1 className="font-luxe text-4xl">Inventory</h1>
      <p className="mt-2 max-w-2xl text-sm text-neutral-600">Pending orders <strong>hold</strong> stock. Confirming an order deducts it; cancelling releases it. Products with tracking off have no stock limit. Low stock means {t} or fewer available.</p>
      <div className="my-4 flex gap-2"><Link href="/admin/inventory" className="btn btn-outline btn-sm">All</Link><Link href="/admin/inventory?low=1" className="btn btn-outline btn-sm">Low stock</Link></div>
      <InventoryTable rows={rows} />
      {pages > 1 && <nav className="mt-6 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
        {page > 1 ? <Link className="btn btn-outline btn-sm" href={`/admin/inventory?page=${page - 1}${sp.low ? '&low=1' : ''}`}>Previous</Link> : <span />}<span>Page {page} of {pages}</span>
        {page < pages ? <Link className="btn btn-outline btn-sm" href={`/admin/inventory?page=${page + 1}${sp.low ? '&low=1' : ''}`}>Next</Link> : <span />}</nav>}
    </div>
  );
}
