'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Wand2 } from 'lucide-react';
import type { Brand, Category, ProductFull } from '@/lib/types';
import { saveProduct, deleteProduct, duplicateProduct } from '@/actions/admin/products';
import { ConfirmButton } from './ConfirmButton';
import { MediaManager } from './MediaManager';

interface VRow { id?: string; label: string; size: string; color: string; sku: string; price: string; stock: string }

export function ProductEditor({ product, brands, categories }: { product: ProductFull | null; brands: Brand[]; categories: Category[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const tops = categories.filter(c => !c.parent_id);
  const [f, setF] = useState({
    name: product?.name ?? '', brand_id: product?.brand_id ?? '', category_id: product?.category_id ?? tops[0]?.id ?? '',
    subcategory_id: product?.subcategory_id ?? '', description: product?.description ?? '', specs: (product?.specifications ?? []).join('\n'),
    price: product?.price?.toString() ?? '', price_on_request: product?.price_on_request ?? false, original_price: product?.original_price?.toString() ?? '',
    sku: product?.sku ?? '', status: product?.status ?? 'available', track_inventory: product?.track_inventory ?? true,
    stock: String(product?.stock_quantity ?? 0), is_featured: product?.is_featured ?? false, is_published: product?.is_published ?? false,
  });
  const [variants, setVariants] = useState<VRow[]>((product?.product_variants ?? []).map(v => ({
    id: v.id, label: v.label, size: v.size ?? '', color: v.color ?? '', sku: v.sku ?? '', price: v.price?.toString() ?? '', stock: String(v.stock_quantity) })));
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(s => ({ ...s, [k]: v }));
  const subs = categories.filter(c => c.parent_id === f.category_id);
  const num = (s: string) => (s.trim() === '' ? null : Number(s));

  const suggestName = () => {
    const b = brands.find(x => x.id === f.brand_id)?.name ?? '';
    const t = categories.find(c => c.id === (f.subcategory_id || f.category_id))?.name ?? '';
    set('name', [b, t].filter(Boolean).join(' '));
  };

  const submit = () => start(async () => {
    setMsg(null);
    const price = f.price_on_request ? null : num(f.price);
    if (!f.price_on_request && (price === null || Number.isNaN(price))) { setMsg({ ok: false, text: 'Enter a valid price or tick “Price on request”.' }); return; }
    const r = await saveProduct({
      id: product?.id, name: f.name, brand_id: f.brand_id || null, category_id: f.category_id, subcategory_id: f.subcategory_id || null,
      description: f.description, specifications: f.specs.split('\n').map(s => s.trim()).filter(Boolean),
      price, price_on_request: f.price_on_request, original_price: f.price_on_request ? null : num(f.original_price),
      sku: f.sku.trim() || null, status: f.status, track_inventory: f.track_inventory, stock_quantity: Math.max(0, Math.floor(Number(f.stock) || 0)),
      is_featured: f.is_featured, is_published: f.is_published,
      variants: variants.map(v => ({ id: v.id, label: v.label, size: v.size || null, color: v.color || null, sku: v.sku || null, price: num(v.price), stock_quantity: Math.max(0, Math.floor(Number(v.stock) || 0)) })),
    });
    if (!r.ok) { setMsg({ ok: false, text: r.error }); return; }
    setMsg({ ok: true, text: 'Saved.' });
    if (!product) router.push(`/admin/products/${r.id}`); else router.refresh();
  });

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label" htmlFor="brand">Maison</label>
            <select id="brand" className="input" value={f.brand_id} onChange={e => set('brand_id', e.target.value)}>
              <option value="">— No maison —</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div><label className="label" htmlFor="cat">Category</label>
            <select id="cat" className="input" value={f.category_id} onChange={e => { set('category_id', e.target.value); set('subcategory_id', ''); }}>
              {tops.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="sub">Subcategory / product type</label>
            <select id="sub" className="input" value={f.subcategory_id} onChange={e => set('subcategory_id', e.target.value)} disabled={subs.length === 0}>
              <option value="">{subs.length ? '— None —' : 'No subcategories'}</option>{subs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="name">Product name</label>
            <div className="flex gap-2"><input id="name" className="input" value={f.name} maxLength={160} onChange={e => set('name', e.target.value)} />
              <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={suggestName} title="Build name from maison and type"><Wand2 className="h-4 w-4" /></button></div></div>
        </div>
        <div><label className="label" htmlFor="desc">Description</label><textarea id="desc" rows={4} className="input" maxLength={5000} value={f.description} onChange={e => set('description', e.target.value)} /></div>
        <div><label className="label" htmlFor="specs">Specifications (one per line)</label><textarea id="specs" rows={3} className="input" value={f.specs} onChange={e => set('specs', e.target.value)} /></div>
      </div>

      <div className="card space-y-5 p-5">
        <h2 className="font-luxe text-2xl">Pricing &amp; availability</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="label" htmlFor="price">Price (GHS)</label>
            <input id="price" type="number" min={0} step="0.01" className="input" disabled={f.price_on_request} value={f.price} onChange={e => set('price', e.target.value)} />
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.price_on_request} onChange={e => set('price_on_request', e.target.checked)} /> Price on request</label></div>
          <div><label className="label" htmlFor="orig">Original price (optional)</label>
            <input id="orig" type="number" min={0} step="0.01" className="input" disabled={f.price_on_request} value={f.original_price} onChange={e => set('original_price', e.target.value)} /></div>
          <div><label className="label" htmlFor="sku">SKU / internal code</label><input id="sku" className="input" value={f.sku} maxLength={60} onChange={e => set('sku', e.target.value)} /></div>
          <div><label className="label" htmlFor="status">Availability</label>
            <select id="status" className="input" value={f.status} onChange={e => set('status', e.target.value as typeof f.status)}>
              <option value="available">Available</option><option value="preorder">Preorder</option><option value="sold_out">Sold out</option></select></div>
          <div><label className="label" htmlFor="stock">Quantity in stock</label>
            <input id="stock" type="number" min={0} className="input" value={f.stock} disabled={!f.track_inventory || variants.length > 0} onChange={e => set('stock', e.target.value)} />
            <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.track_inventory} onChange={e => set('track_inventory', e.target.checked)} /> Track inventory</label></div>
          <div className="space-y-2 pt-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_published} onChange={e => set('is_published', e.target.checked)} /> Published on storefront</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_featured} onChange={e => set('is_featured', e.target.checked)} /> Featured</label></div>
        </div>
        {!f.track_inventory && <p className="text-xs text-neutral-500">Inventory is not tracked: customers can order up to 20 per order without a stock limit.</p>}
        {variants.length > 0 && <p className="text-xs text-neutral-500">With variants, stock is managed per variant below.</p>}
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between"><h2 className="font-luxe text-2xl">Variants</h2>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setVariants(v => [...v, { label: '', size: '', color: '', sku: '', price: '', stock: '0' }])}><Plus className="h-4 w-4" /> Add variant</button></div>
        {variants.length === 0 && <p className="text-sm text-neutral-500">No variants. Add sizes, colours or options if customers must choose one.</p>}
        {variants.map((v, i) => (
          <div key={v.id ?? i} className="grid items-end gap-2 border border-neutral-200 p-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
            {([['label', 'Label *'], ['size', 'Size'], ['color', 'Colour'], ['sku', 'SKU'], ['price', 'Price override'], ['stock', 'Stock']] as const).map(([k, l]) => (
              <div key={k}><label className="label">{l}</label>
                <input className="input" type={k === 'price' || k === 'stock' ? 'number' : 'text'} min={0} step={k === 'price' ? '0.01' : '1'} value={v[k]}
                  onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x))} /></div>))}
            <button type="button" className="btn btn-outline btn-sm" aria-label="Remove variant" onClick={() => setVariants(vs => vs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
          </div>))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn btn-primary" disabled={pending} onClick={submit}>{pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}</button>
        {product && <>
          <button className="btn btn-outline" disabled={pending} onClick={() => start(async () => { const r = await duplicateProduct(product.id); if (r.ok) router.push(`/admin/products/${r.id}`); else setMsg({ ok: false, text: r.error }); })}>Duplicate</button>
          <ConfirmButton label="Delete product" className="btn btn-outline" title={`Delete “${product.name}”?`} confirmLabel="Delete product"
            onConfirm={async () => { const r = await deleteProduct(product.id); if (!r.ok) return r.error; router.push('/admin/products'); }}>
            The product and its images/videos will be permanently removed from the store. Past orders keep their saved item names and prices.</ConfirmButton></>}
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-700'}`} role={msg.ok ? 'status' : 'alert'}>{msg.text}</p>}
      </div>

      {product
        ? <MediaManager productId={product.id} initial={product.product_media} />
        : <p className="card p-5 text-sm text-neutral-600">Create the product first, then you can upload images and videos.</p>}
    </div>
  );
}
