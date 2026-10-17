import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { OrderControls } from '@/components/admin/OrderControls';
import { ghs, statusLabel } from '@/lib/format';
import type { Order } from '@/lib/types';

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle();
  if (!data) notFound();
  const o = data as Order;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/orders" className="text-sm underline">← All orders</Link>
      <div><h1 className="font-luxe text-4xl">{o.reference}</h1>
        <p className="mt-1 text-sm text-neutral-600">{statusLabel[o.status]} · placed {new Date(o.created_at).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })}</p></div>
      <div className="card grid gap-4 p-5 text-sm sm:grid-cols-2">
        <div><p className="label">Customer</p>{o.customer_name || '—'}</div>
        <div><p className="label">WhatsApp</p>{o.customer_phone || '—'}</div>
        {o.notes && <div className="sm:col-span-2"><p className="label">Customer notes</p><p className="whitespace-pre-line">{o.notes}</p></div>}
        <div><p className="label">Stock</p>{{ none: 'Not tracked', reserved: 'Held for this order', deducted: 'Deducted', released: 'Released' }[o.stock_state] ?? o.stock_state}</div>
      </div>
      <div className="card overflow-x-auto"><table className="w-full text-left text-sm">
        <thead className="border-b bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="p-3">Item</th><th className="p-3">Qty</th><th className="p-3">Unit price</th><th className="p-3 text-right">Line total</th></tr></thead>
        <tbody>{(o.order_items ?? []).map(i => (<tr key={i.id} className="border-b">
          <td className="p-3">{i.brand_name && <span className="text-xs text-neutral-500">{i.brand_name} · </span>}{i.product_name}{i.variant_label && ` (${i.variant_label})`}{i.is_preorder && <span className="badge ml-2 bg-amber-200 text-amber-950">Preorder</span>}</td>
          <td className="p-3">{i.quantity}</td><td className="p-3">{ghs(i.unit_price)}</td><td className="p-3 text-right">{ghs(i.line_total)}</td></tr>))}</tbody>
        <tfoot><tr><td colSpan={3} className="p-3 text-right font-semibold">Total</td><td className="p-3 text-right font-semibold">{ghs(o.total)}</td></tr></tfoot></table></div>
      <p className="text-xs text-neutral-500">Prices are the snapshot taken when the order was placed; later price changes do not affect this order.</p>
      <OrderControls id={o.id} status={o.status} notes={o.admin_notes} />
    </div>
  );
}
