import Link from 'next/link';
import Image from 'next/image';
import { ghs } from '@/lib/format';
import { imageUrl } from '@/lib/media';
import type { ProductRow } from '@/lib/types';

export function Placeholder({ label = 'Photo coming soon' }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-gold-soft text-center text-neutral-500" role="img" aria-label={label}>
      <span className="font-luxe text-3xl text-gold">DS</span>
      <span className="mt-1 text-[10px] uppercase tracking-widest">{label}</span>
    </div>
  );
}

export function ProductCard({ p, priority = false }: { p: ProductRow; priority?: boolean }) {
  const src = imageUrl(p.image_path);
  return (
    <Link href={`/product/${p.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100">
        {src ? <Image src={src} alt={p.name} fill priority={priority} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /> : <Placeholder />}
        {p.status !== 'available' && (
          <span className={`badge absolute left-2 top-2 ${p.status === 'preorder' ? 'bg-amber-200 text-amber-950' : 'bg-neutral-900 text-white'}`}>
            {p.status === 'preorder' ? 'Preorder' : 'Sold out'}
          </span>
        )}
      </div>
      <div className="mt-3 space-y-0.5">
        {p.brand_name && <p className="text-[11px] uppercase tracking-widest text-neutral-500">{p.brand_name}</p>}
        <h3 className="text-sm font-medium group-hover:text-gold">{p.name}</h3>
        <p className="text-sm">
          <span className={p.price_on_request ? 'text-neutral-600' : 'font-semibold'}>{ghs(p.price)}</span>
          {p.original_price && p.price && p.original_price > p.price && <span className="ml-2 text-xs text-neutral-400 line-through">{ghs(p.original_price)}</span>}
        </p>
      </div>
    </Link>
  );
}

export function ProductGrid({ rows, priorityCount = 0 }: { rows: ProductRow[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((p, i) => <ProductCard key={p.id} p={p} priority={i < priorityCount} />)}
    </div>
  );
}
