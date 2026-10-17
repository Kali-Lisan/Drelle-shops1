import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { ghs, statusLabel } from '@/lib/format';
import type { Order } from '@/lib/types';

const SIZE = 20;
const tone: Record<string, string> = { pending: 'bg-amber-100 text-amber-900', confirmed: 'bg-blue-100 text-blue-900', completed: 'bg-green-100 text-green-900', cancelled: 'bg-neutral-200 text-neutral-700' };

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const page = Math.max(Number(sp.page) || 1, 1);
  const q = (sp.q ?? '').replace(/[%,()*\\]/g, ' ').trim().slice(0, 60);
  let query = supabase.from('orders').select('*', { count: 'exact' });
  if (['pending', 'confirmed', 'completed', 'cancelled'].includes(sp.status ?? '')) query = query.eq('status', sp.status!);
  if (q) query = query.or(`reference.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
  const { data, count } = await query.order('created_at', { ascending: sp.sort === 'oldest' }).range((page - 1) * SIZE, page * SIZE - 1);
  const pages = Math.max(Math.ceil((count ?? 0) / SIZE), 1);
  const link = (p: number) => { const u = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== 'page') as [string, string][]); if (p > 1) u.set('page', String(p)); return `/admin/orders?${u}`; };
  return (
    <div>
      <h1 className="font-luxe mb-6 text-4xl">Orders <span className="text-lg text-neutral-400">({count ?? 0})</span></h1>
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Reference, name or phone" className="input max-w-xs" aria-label="Search orders" />
        <select name="status" defaultValue={sp.status ?? ''} className="input w-auto" aria-label="Status"><option value="">All statuses</option>{['pending', 'confirmed', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}</select>
        <select name="sort" defaultValue={sp.sort ?? 'newest'} className="input w-auto" aria-label="Sort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
        <button className="btn btn-outline">Apply</button>
      </form>
      <div className="card overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="border-b bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="p-3">Reference</th><th className="p-3">Customer</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Placed</th></tr></thead>
        <tbody>{(data ?? []).length === 0 && <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No orders yet.</td></tr>}
          {((data ?? []) as Order[]).map(o => (<tr key={o.id} className="border-b last:border-0 hover:bg-neutral-50">
            <td className="p-3"><Link className="font-medium underline" href={`/admin/orders/${o.id}`}>{o.reference}</Link>{o.has_preorder && <span className="badge ml-2 bg-amber-200 text-amber-950">Preorder</span>}</td>
            <td className="p-3">{o.customer_name || '—'}<br /><span className="text-xs text-neutral-500">{o.customer_phone}</span></td>
            <td className="p-3 whitespace-nowrap">{ghs(o.total)}</td><td className="p-3"><span className={`badge ${tone[o.status]}`}>{statusLabel[o.status]}</span></td>
            <td className="p-3 whitespace-nowrap text-neutral-600">{new Date(o.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td></tr>))}</tbody></table></div>
      {pages > 1 && <nav className="mt-6 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
        {page > 1 ? <Link className="btn btn-outline btn-sm" href={link(page - 1)}>Previous</Link> : <span />}<span>Page {page} of {pages}</span>
        {page < pages ? <Link className="btn btn-outline btn-sm" href={link(page + 1)}>Next</Link> : <span />}</nav>}
    </div>
  );
}
