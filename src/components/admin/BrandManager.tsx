'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Brand } from '@/lib/types';
import { saveBrand, deleteBrand } from '@/actions/admin/catalog';
import { ImageField } from './ImageField';
import { DeleteWithProducts } from './DeleteWithProducts';

type B = Brand & { count: number };
const blank = { id: undefined as string | undefined, name: '', description: '', origin: '', logo_path: null as string | null, is_visible: true, is_featured: false, sort_order: 0 };

export function BrandManager({ brands }: { brands: B[] }) {
  const router = useRouter();
  const [f, setF] = useState<typeof blank | null>(null);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const save = () => start(async () => {
    const r = await saveBrand({ ...f }); if (!r.ok) { setMsg(r.error); return; }
    setMsg('Saved.'); setF(null); router.refresh();
  });
  return (
    <div>
      <button className="btn btn-primary" onClick={() => { setMsg(''); setF({ ...blank, sort_order: brands.length + 1 }); }}>Add maison</button>
      {msg && <p className="mt-3 text-sm" role="status">{msg}</p>}
      {f && (
        <div className="card mt-4 space-y-4 p-5" role="form" aria-label={f.id ? 'Edit maison' : 'New maison'}>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="label" htmlFor="bn">Display name</label><input id="bn" className="input" value={f.name} maxLength={100} onChange={e => setF({ ...f, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="bo">Origin (optional)</label><input id="bo" className="input" value={f.origin} maxLength={100} onChange={e => setF({ ...f, origin: e.target.value })} /></div>
          </div>
          <div><label className="label" htmlFor="bd">Description</label><textarea id="bd" rows={3} className="input" maxLength={2000} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
          <ImageField label="Logo" scope="brand" value={f.logo_path} onChange={p => setF({ ...f, logo_path: p })} />
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_visible} onChange={e => setF({ ...f, is_visible: e.target.checked })} /> Visible on storefront</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_featured} onChange={e => setF({ ...f, is_featured: e.target.checked })} /> Featured on homepage</label>
            <label className="flex items-center gap-2">Order <input type="number" className="input w-24" value={f.sort_order} onChange={e => setF({ ...f, sort_order: Number(e.target.value) || 0 })} /></label>
          </div>
          <div className="flex gap-2"><button className="btn btn-primary" disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Save maison'}</button><button className="btn btn-outline" onClick={() => setF(null)}>Cancel</button></div>
        </div>)}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="p-3">Name</th><th className="p-3">Slug</th><th className="p-3">Products</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>{brands.map(b => (
            <tr key={b.id} className="border-b last:border-0">
              <td className="p-3 font-medium">{b.name}</td><td className="p-3 text-neutral-500">{b.slug}</td>
              <td className="p-3"><a className="underline" href={`/admin/products?brand=${b.id}`}>{b.count}</a></td>
              <td className="p-3">{b.is_visible ? 'Visible' : 'Hidden'}{b.is_featured && ' · Featured'}</td>
              <td className="flex justify-end gap-2 p-3">
                <button className="btn btn-outline btn-sm" onClick={() => { setMsg(''); setF({ id: b.id, name: b.name, description: b.description, origin: b.origin, logo_path: b.logo_path, is_visible: b.is_visible, is_featured: b.is_featured, sort_order: b.sort_order }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
                <DeleteWithProducts kind="maison" name={b.name} count={b.count} targets={brands.filter(x => x.id !== b.id).map(x => ({ id: x.id, name: x.name }))}
                  onDelete={async (mode, t) => { const r = await deleteBrand(b.id, mode, t); if (!r.ok) return r.error; router.refresh(); }} />
              </td></tr>))}</tbody>
        </table>
      </div>
    </div>
  );
}
