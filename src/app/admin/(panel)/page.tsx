import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

export default async function Overview() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc('admin_dashboard_stats');
  const s = (data ?? {}) as Record<string, number>;
  const cards: [string, string, string][] = [
    ['Published products', 'published_products', '/admin/products'], ['Maisons', 'maisons', '/admin/maisons'], ['Categories', 'categories', '/admin/categories'],
    ['Pending orders', 'pending_orders', '/admin/orders?status=pending'], ['Confirmed orders', 'confirmed_orders', '/admin/orders?status=confirmed'],
    ['Completed orders', 'completed_orders', '/admin/orders?status=completed'], ['Low-stock products', 'low_stock', '/admin/inventory?low=1'],
  ];
  return (
    <div>
      <h1 className="font-luxe text-4xl">Overview</h1>
      {error && <p className="mt-4 text-red-700" role="alert">Could not load statistics.</p>}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([l, k, href]) => (<li key={k}><Link href={href} className="card block p-5 transition hover:border-gold"><p className="text-xs uppercase tracking-wider text-neutral-500">{l}</p><p className="font-luxe mt-2 text-5xl">{s[k] ?? 0}</p></Link></li>))}
      </ul>
    </div>
  );
}
