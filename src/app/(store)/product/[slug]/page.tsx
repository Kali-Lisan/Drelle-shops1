import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProductBySlug, getSettings, getProducts } from '@/lib/data';
import { ProductGallery, type GalleryItem } from '@/components/store/ProductGallery';
import { AddToCart } from '@/components/store/AddToCart';
import { ProductGrid } from '@/components/store/ProductCard';
import { ghs } from '@/lib/format';
import { imageUrl, mediaUrl } from '@/lib/media';
import { inquiryMessage, waLink } from '@/lib/whatsapp';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await getProductBySlug((await params).slug);
  if (!p) return { title: 'Product not found' };
  const img = p.product_media.find(m => m.media_type === 'image');
  return { title: p.name, description: p.description.slice(0, 160) || `${p.name} at Drelle Shops`, openGraph: img ? { images: [imageUrl(img.storage_path)!] } : undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await getProductBySlug((await params).slug);
  if (!p) notFound();
  const s = await getSettings();
  const related = await getProducts({ category: p.category?.slug, limit: 5 });

  const media = [...p.product_media].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position);
  const items: GalleryItem[] = media.map(m => ({ id: m.id, type: m.media_type, src: mediaUrl(m.bucket, m.storage_path)!, alt: m.alt_text, mime: m.mime_type }));
  const primary = media.find(m => m.media_type === 'image');
  const brand = p.brand?.name ?? null;
  const avail = p.track_inventory ? Math.max(p.stock_quantity - p.reserved_quantity, 0) : null;
  const inquiry = s.whatsapp_number ? waLink(s.whatsapp_number, inquiryMessage(s.inquiry_template, { name: p.name, brand, price: p.price })) : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-500">
        <Link href="/shop" className="hover:underline">Shop</Link>
        {p.category && <> / <Link href={`/categories/${p.category.slug}`} className="hover:underline">{p.category.name}</Link></>}
        {' '}/ <span className="text-neutral-900">{p.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <ProductGallery items={items} name={p.name} />
        <div>
          {brand && <Link href={`/brands/${p.brand!.slug}`} className="text-xs uppercase tracking-widest text-gold hover:underline">{brand}</Link>}
          <h1 className="font-luxe mt-1 text-4xl">{p.name}</h1>
          <p className="mt-3 text-2xl">
            <span className={p.price_on_request ? 'text-neutral-600' : 'font-semibold'}>{ghs(p.price)}</span>
            {p.original_price && p.price && p.original_price > p.price && <span className="ml-3 text-base text-neutral-400 line-through">{ghs(p.original_price)}</span>}
          </p>
          <p className="mt-2 text-sm">
            <span className={`badge ${p.status === 'available' ? 'bg-green-100 text-green-900' : p.status === 'preorder' ? 'bg-amber-200 text-amber-950' : 'bg-neutral-900 text-white'}`}>
              {p.status === 'available' ? 'Available' : p.status === 'preorder' ? 'Preorder' : 'Sold out'}</span>
          </p>
          {p.status === 'preorder' && <p className="mt-3 border-l-2 border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">{s.preorder_policy}</p>}
          <div className="mt-6">
            <AddToCart productId={p.id} slug={p.slug} name={p.name} brand={brand ?? ''} image={primary ? imageUrl(primary.storage_path) : null}
              status={p.status} price={p.price} priceOnRequest={p.price_on_request} trackInventory={p.track_inventory} available={avail}
              variants={p.product_variants.map(v => ({ id: v.id, label: v.label, price: v.price, available: p.track_inventory ? Math.max(v.stock_quantity - v.reserved_quantity, 0) : null }))} />
          </div>
          {inquiry && <a href={inquiry} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-4 w-full">Ask about this product</a>}
          {p.description && <section className="mt-8"><h2 className="label">Description</h2><p className="whitespace-pre-line text-sm leading-relaxed text-neutral-700">{p.description}</p></section>}
          {p.specifications.length > 0 && <section className="mt-6"><h2 className="label">Specifications</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">{p.specifications.map((x, i) => <li key={i}>{x}</li>)}</ul></section>}
          {p.sku && <p className="mt-6 text-xs text-neutral-500">SKU: {p.sku}</p>}
        </div>
      </div>
      {related.rows.filter(r => r.id !== p.id).length > 0 && (
        <section className="mt-16"><h2 className="font-luxe mb-6 text-3xl">You may also like</h2>
          <ProductGrid rows={related.rows.filter(r => r.id !== p.id).slice(0, 4)} /></section>)}
    </div>
  );
}
