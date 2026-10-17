'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { updateStock } from '@/actions/admin/products';

export interface InvRow { productId: string; variantId?: string; name: string; sub?: string; stock: number; held: number; track: boolean; status: 'available' | 'preorder' | 'sold_out' }

function Row({ r }: { r: InvRow }) {
  const router = useRouter();
  const [stock, setStock] = useState(String(r.stock));
  const [status, setStatus] = useState(r.status);
  const [track, setTrack] = useState(r.track);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setMsg('');
    const res = await updateStock({ productId: r.variantId ? undefined : r.productId, variantId: r.variantId, stock: Math.max(0, Math.floor(Number(stock) || 0)), status: r.variantId ? undefined : status, track: r.variantId ? undefined : track });
    setBusy(false); setMsg(res.ok ? 'Saved' : res.error); if (res.ok) router.refresh();
  };
  return (
    <tr className="border-b last:border-0">
      <td className="p-3"><p className={r.variantId ? 'pl-4 text-neutral-700' : 'font-medium'}>{r.name}</p>{r.sub && <p className="text-xs text-neutral-500">{r.sub}</p>}</td>
      <td className="p-3"><input type="number" min={0} className="input w-24" value={stock} onChange={e => setStock(e.target.value)} disabled={!track && !r.variantId} aria-label={`Stock for ${r.name}`} /></td>
      <td className="p-3">{r.held}</td>
      <td className="p-3">{r.variantId ? '—' : <select className="input w-auto" value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label={`Availability for ${r.name}`}><option value="available">Available</option><option value="preorder">Preorder</option><option value="sold_out">Sold out</option></select>}</td>
      <td className="p-3">{r.variantId ? '—' : <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={track} onChange={e => setTrack(e.target.checked)} /> Track</label>}</td>
      <td className="p-3"><button className="btn btn-outline btn-sm" disabled={busy} onClick={save}>{busy ? '…' : 'Save'}</button> <span className="ml-2 text-xs" role="status">{msg}</span></td>
    </tr>
  );
}

export function InventoryTable({ rows }: { rows: InvRow[] }) {
  return (
    <div className="card overflow-x-auto"><table className="w-full text-left text-sm">
      <thead className="border-b bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="p-3">Product</th><th className="p-3">In stock</th><th className="p-3">Held by pending</th><th className="p-3">Availability</th><th className="p-3">Tracking</th><th className="p-3" /></tr></thead>
      <tbody>{rows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-neutral-500">Nothing to show.</td></tr>}
        {rows.map(r => <Row key={`${r.productId}-${r.variantId ?? ''}-${r.stock}-${r.status}-${r.track}`} r={r} />)}</tbody></table></div>
  );
}
