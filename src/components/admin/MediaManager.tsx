'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ImageIcon, Star, Trash2, Upload, Replace } from 'lucide-react';
import type { Media } from '@/lib/types';
import { mediaUrl, IMAGE_TYPES, VIDEO_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '@/lib/media';
import { registerMedia, reorderMedia, setPrimaryMedia, deleteMedia, replaceMedia, updateMediaAlt } from '@/actions/admin/media';
import { uploadFile } from './upload';
import { ConfirmButton } from './ConfirmButton';

interface Job { id: string; name: string; pct: number; error?: string; done?: boolean }

export function MediaManager({ productId, initial }: { productId: string; initial: Media[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [msg, setMsg] = useState('');
  const replaceFor = useRef<string | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const items = [...initial].sort((a, b) => a.position - b.position);
  const patch = (id: string, p: Partial<Job>) => setJobs(j => j.map(x => x.id === id ? { ...x, ...p } : x));

  function validate(f: File): string | null {
    const img = (IMAGE_TYPES as readonly string[]).includes(f.type), vid = (VIDEO_TYPES as readonly string[]).includes(f.type);
    if (!img && !vid) return 'Unsupported type (use JPEG, PNG, WebP, AVIF, MP4, WebM or MOV).';
    if (f.size > (img ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) return `Too large (max ${img ? 8 : 50} MB).`;
    return null;
  }

  async function addFiles(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const id = crypto.randomUUID();
      const bad = validate(f);
      setJobs(j => [...j, { id, name: f.name, pct: 0, error: bad ?? undefined }]);
      if (bad) continue;
      try {
        const up = await uploadFile(f, 'product', productId, pct => patch(id, { pct }));
        const r = await registerMedia({ productId, bucket: up.bucket, path: up.path, alt: '' });
        if (!r.ok) throw new Error(r.error);
        patch(id, { done: true, pct: 100 });
      } catch (e) { patch(id, { error: e instanceof Error ? e.message : 'Upload failed' }); }
    }
    router.refresh();
  }

  async function doReplace(files: FileList | null) {
    const mediaId = replaceFor.current; replaceFor.current = null;
    const f = files?.[0]; if (!f || !mediaId) return;
    const bad = validate(f); if (bad) { setMsg(bad); return; }
    const id = crypto.randomUUID();
    setJobs(j => [...j, { id, name: `Replacing with ${f.name}`, pct: 0 }]);
    try {
      const up = await uploadFile(f, 'product', productId, pct => patch(id, { pct }));
      const r = await replaceMedia({ mediaId, bucket: up.bucket, path: up.path });
      if (!r.ok) throw new Error(r.error);
      patch(id, { done: true, pct: 100 });
    } catch (e) { patch(id, { error: e instanceof Error ? e.message : 'Replace failed' }); }
    router.refresh();
  }

  async function move(i: number, d: -1 | 1) {
    const ids = items.map(m => m.id); const j = i + d; if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const r = await reorderMedia(productId, ids); setMsg(r.ok ? 'Order saved.' : r.error); router.refresh();
  }

  return (
    <section className="card p-5" aria-labelledby="media-h">
      <h2 id="media-h" className="font-luxe text-2xl">Images &amp; videos</h2>
      <p className="mt-1 text-xs text-neutral-500">Images: JPEG, PNG, WebP, AVIF up to 8 MB. Videos: MP4, WebM, MOV up to 50 MB. Files upload straight to storage; the order below is the storefront gallery order.</p>
      <label className="btn btn-primary mt-4 cursor-pointer"><Upload className="h-4 w-4" /> Add images or videos
        <input type="file" multiple accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(',')} className="sr-only" onChange={e => { addFiles(e.target.files); e.target.value = ''; }} /></label>
      <input ref={replaceInput} type="file" className="sr-only" accept={[...IMAGE_TYPES, ...VIDEO_TYPES].join(',')} onChange={e => { doReplace(e.target.files); e.target.value = ''; }} />

      {jobs.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm" aria-live="polite">
          {jobs.map(j => (<li key={j.id}>
            <div className="flex justify-between"><span className="truncate">{j.name}</span><span className={j.error ? 'text-red-700' : 'text-neutral-500'}>{j.error ?? (j.done ? 'Done' : `${j.pct}%`)}</span></div>
            {!j.error && <div className="h-1 bg-neutral-200"><div className="h-1 bg-neutral-900 transition-all" style={{ width: `${j.pct}%` }} /></div>}
          </li>))}
        </ul>)}
      {msg && <p className="mt-3 text-sm text-neutral-600" role="status">{msg}</p>}

      {items.length === 0 ? <p className="mt-6 flex items-center gap-2 text-sm text-neutral-500"><ImageIcon className="h-4 w-4" /> No media yet. The storefront shows a “Photo coming soon” placeholder until you add some.</p> : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((m, i) => {
            const src = mediaUrl(m.bucket, m.storage_path)!;
            return (
              <li key={m.id} className="border border-neutral-200 p-3">
                <div className="relative aspect-[4/5] bg-neutral-100">
                  {m.media_type === 'image'
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={src} alt={m.alt_text || 'Product image'} className="h-full w-full object-cover" loading="lazy" />
                    : <video src={src} controls preload="metadata" playsInline className="h-full w-full bg-black object-contain" />}
                  {m.is_primary && <span className="badge absolute left-2 top-2 bg-amber-300 text-amber-950">Primary</span>}
                  <span className="badge absolute right-2 top-2 bg-neutral-900 text-white">{m.media_type}</span>
                </div>
                <input className="input mt-2 text-xs" defaultValue={m.alt_text} placeholder="Alt text / caption" aria-label="Alt text" maxLength={200}
                  onBlur={async e => { if (e.target.value !== m.alt_text) { const r = await updateMediaAlt(m.id, e.target.value); setMsg(r.ok ? 'Caption saved.' : r.error); router.refresh(); } }} />
                <div className="mt-2 flex flex-wrap gap-1">
                  <button className="btn btn-outline btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button className="btn btn-outline btn-sm" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move later"><ArrowDown className="h-3.5 w-3.5" /></button>
                  {m.media_type === 'image' && !m.is_primary && <button className="btn btn-outline btn-sm" onClick={async () => { const r = await setPrimaryMedia(m.id); setMsg(r.ok ? 'Primary image updated.' : r.error); router.refresh(); }}><Star className="h-3.5 w-3.5" /> Primary</button>}
                  <button className="btn btn-outline btn-sm" onClick={() => { replaceFor.current = m.id; replaceInput.current?.click(); }}><Replace className="h-3.5 w-3.5" /> Replace</button>
                  <ConfirmButton label={<Trash2 className="h-3.5 w-3.5" aria-label="Delete" />} title="Delete this file?" confirmLabel="Delete" onConfirm={async () => { const r = await deleteMedia(m.id); if (!r.ok) return r.error; router.refresh(); }}>
                    The file will be removed from storage and from the product page.</ConfirmButton>
                </div>
              </li>);
          })}
        </ul>)}
    </section>
  );
}
