'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { Category } from '@/lib/types';
import { saveCategory, deleteCategory, reorderCategories } from '@/actions/admin/catalog';
import { ImageField } from './ImageField';
import { DeleteWithProducts } from './DeleteWithProducts';

type C = Category & { count: number };
const blank = { id: undefined as string | undefined, name: '', parent_id: null as string | null, image_path: null as string | null, is_visible: true, sort_order: 0 };

export function CategoryManager({ cats }: { cats: C[] }) {
  const router = useRouter();
  const [f, setF] = useState<typeof blank | null>(null);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const tops = cats.filter(c => !c.parent_id);
  const save = () => start(async () => { const r = await saveCategory({ ...f }); if (!r.ok) { setMsg(r.error); return; } setMsg('Saved.'); setF(null); router.refresh(); });
  const move = (list: C[], i: number, d: -1 | 1) => start(async () => {
    const ids = list.map(c => c.id); const j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]]; await reorderCategories(ids); router.refresh();
  });
  const Row = ({ c, list, i, sub }: { c: C; list: C[]; i: number; sub?: boolean }) => (
    <tr className="border-b last:border-0">
      <td className={`p-3 ${sub ? 'pl-10 text-neutral-700' : 'font-medium'}`}>{sub && '↳ '}{c.name}</td>
      <td className="p-3"><a className="underline" href={`/admin/products?category=${c.id}`}>{c.count}</a></td>
      <td className="p-3">{c.is_visible ? 'Visible' : 'Hidden'}</td>
      <td className="flex flex-wrap justify-end gap-2 p-3">
        <button className="btn btn-outline btn-sm" aria-label="Move up" disabled={i === 0 || pending} onClick={() => move(list, i, -1)}><ArrowUp className="h-3.5 w-3.5" /></button>
        <button className="btn btn-outline btn-sm" aria-label="Move down" disabled={i === list.length - 1 || pending} onClick={() => move(list, i, 1)}><ArrowDown className="h-3.5 w-3.5" /></button>
        <button className="btn btn-outline btn-sm" onClick={() => { setMsg(''); setF({ id: c.id, name: c.name, parent_id: c.parent_id, image_path: c.image_path, is_visible: c.is_visible, sort_order: c.sort_order }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button>
        <DeleteWithProducts kind="category" name={c.name} count={sub ? 0 : c.count} targets={tops.filter(t => t.id !== c.id).map(t => ({ id: t.id, name: t.name }))}
          onDelete={async (mode, t) => { const r = await deleteCategory(c.id, mode, t); if (!r.ok) return r.error; router.refresh(); }} />
      </td></tr>);
  return (
    <div>
      <button className="btn btn-primary" onClick={() => { setMsg(''); setF({ ...blank, sort_order: cats.length + 1 }); }}>Add category or subcategory</button>
      {msg && <p className="mt-3 text-sm" role="status">{msg}</p>}
      {f && (
        <div className="card mt-4 space-y-4 p-5" role="form" aria-label="Category form">
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="label" htmlFor="cn">Name</label><input id="cn" className="input" value={f.name} maxLength={80} onChange={e => setF({ ...f, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="cp">Parent</label>
              <select id="cp" className="input" value={f.parent_id ?? ''} onChange={e => setF({ ...f, parent_id: e.target.value || null })}>
                <option value="">— Top-level category —</option>{tops.filter(t => t.id !== f.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
          </div>
          <ImageField label="Category image (optional)" scope="category" value={f.image_path} onChange={p => setF({ ...f, image_path: p })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_visible} onChange={e => setF({ ...f, is_visible: e.target.checked })} /> Visible on storefront</label>
          <div className="flex gap-2"><button className="btn btn-primary" disabled={pending} onClick={save}>{pending ? 'Saving…' : 'Save'}</button><button className="btn btn-outline" onClick={() => setF(null)}>Cancel</button></div>
        </div>)}
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500"><tr><th className="p-3">Name</th><th className="p-3">Products</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
          <tbody>{tops.map((t, i) => { const subs = cats.filter(c => c.parent_id === t.id); return [<Row key={t.id} c={t} list={tops} i={i} />, ...subs.map((s, k) => <Row key={s.id} c={s} list={subs} i={k} sub />)]; })}</tbody>
        </table>
      </div>
    </div>
  );
}
