'use client';
import Image from 'next/image';
import { useState } from 'react';
import { AlertTriangle, Play } from 'lucide-react';

export interface GalleryItem { id: string; type: 'image' | 'video'; src: string; alt: string; mime: string }

export function ProductGallery({ items, name }: { items: GalleryItem[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  if (items.length === 0) {
    return (<div className="flex aspect-[4/5] w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-gold-soft text-neutral-500" role="img" aria-label="Product photo coming soon">
      <span className="font-luxe text-5xl text-gold">DS</span><span className="mt-2 text-xs uppercase tracking-widest">Photo coming soon</span></div>);
  }
  const cur = items[Math.min(idx, items.length - 1)];
  const poster = items.find(i => i.type === 'image')?.src;
  return (
    <div>
      {/* Fixed aspect ratio box: no layout shift while media loads */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
        {cur.type === 'image' ? (
          <>
            {!loaded[cur.id] && <div className="skeleton absolute inset-0" />}
            <Image key={cur.id} src={cur.src} alt={cur.alt || name} fill priority sizes="(min-width:1024px) 50vw, 100vw" className="object-cover"
              onLoad={() => setLoaded(l => ({ ...l, [cur.id]: true }))} />
          </>
        ) : failed[cur.id] ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-neutral-600" role="alert">
            <AlertTriangle className="h-8 w-8 text-amber-600" /><p>This video could not be played.</p>
            <a href={cur.src} target="_blank" rel="noopener noreferrer" className="underline">Open video directly</a>
          </div>
        ) : (
          <video key={cur.id} className="absolute inset-0 h-full w-full bg-black object-contain" controls playsInline preload="metadata" poster={poster}
            aria-label={cur.alt || `${name} video`} onError={() => setFailed(f => ({ ...f, [cur.id]: true }))}>
            <source src={cur.src} type={cur.mime} />
            Your browser does not support embedded video.
          </video>
        )}
      </div>
      {items.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Product media">
          {items.map((it, i) => (
            <li key={it.id} className="shrink-0">
              <button onClick={() => setIdx(i)} aria-label={`Show ${it.type} ${i + 1}`} aria-current={i === idx}
                className={`relative block h-20 w-16 overflow-hidden bg-neutral-100 ring-offset-2 ${i === idx ? 'ring-2 ring-neutral-900' : 'opacity-70 hover:opacity-100'}`}>
                {it.type === 'image'
                  ? <Image src={it.src} alt="" fill sizes="64px" className="object-cover" />
                  : (<><video className="h-full w-full object-cover" muted preload="metadata" src={`${it.src}#t=0.1`} aria-hidden />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35"><Play className="h-6 w-6 fill-white text-white" aria-hidden /></span></>)}
              </button>
            </li>))}
        </ul>)}
    </div>
  );
}
