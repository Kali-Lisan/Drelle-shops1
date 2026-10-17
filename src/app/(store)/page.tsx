import Link from 'next/link';
import { getBrands, getCategories, getProducts, getSettings } from '@/lib/data';
import { ProductGrid } from '@/components/store/ProductCard';
import { waLink } from '@/lib/whatsapp';

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (<section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6">
    <div className="mb-6 flex items-end justify-between"><h2 className="font-luxe text-3xl">{title}</h2>
      {href && <Link href={href} className="text-xs font-semibold uppercase tracking-widest underline-offset-4 hover:underline">View all</Link>}</div>
    {children}</section>);
}

export default async function Home() {
  const [featured, fresh, pre, brands, cats, s] = await Promise.all([
    getProducts({ featured: true, limit: 8 }), getProducts({ sort: 'newest', limit: 8 }),
    getProducts({ status: 'preorder', limit: 4 }), getBrands({ featured: true }), getCategories(), getSettings(),
  ]);
  const top = cats.filter(c => !c.parent_id);
  return (
    <>
      <section className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 text-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Designer maisons, curated for you</p>
          <h1 className="font-luxe mt-4 max-w-2xl text-5xl leading-tight sm:text-7xl">The Art of Elegance</h1>
          <p className="mt-5 max-w-xl text-neutral-300">{s.tagline}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn bg-white text-neutral-950 hover:bg-amber-100">Shop collection</Link>
            <Link href="/brands" className="btn border border-white/40 text-white hover:bg-white/10">Explore maisons</Link>
          </div>
        </div>
      </section>
      <Section title="Shop by category">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {top.map(c => <li key={c.id}><Link href={`/categories/${c.slug}`} className="card flex h-24 items-center justify-center text-center font-luxe text-xl transition hover:border-gold hover:bg-gold-soft">{c.name}</Link></li>)}
        </ul>
      </Section>
      {featured.rows.length > 0 && <Section title="Featured" href="/shop?sort=recommended"><ProductGrid rows={featured.rows} priorityCount={4} /></Section>}
      {fresh.rows.length > 0 && <Section title="New arrivals" href="/shop?sort=newest"><ProductGrid rows={fresh.rows} /></Section>}
      {brands.length > 0 && <Section title="Featured maisons" href="/brands">
        <ul className="flex flex-wrap gap-3">{brands.map(b => <li key={b.id}><Link href={`/brands/${b.slug}`} className="btn btn-outline">{b.name}</Link></li>)}</ul></Section>}
      {pre.rows.length > 0 && <Section title="Available for preorder" href="/shop?avail=preorder">
        <p className="mb-4 max-w-2xl text-sm text-neutral-600">{s.preorder_policy}</p><ProductGrid rows={pre.rows} /></Section>}
      {s.whatsapp_number && (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6"><div className="bg-gold-soft p-10 text-center">
          <h2 className="font-luxe text-3xl">Looking for something specific?</h2>
          <p className="mt-2 text-sm text-neutral-600">Message us and we will help you find it.</p>
          <a className="btn btn-wa mt-5" target="_blank" rel="noopener noreferrer" href={waLink(s.whatsapp_number, `Hello ${s.store_name}, I am looking for a specific item.`)}>Chat on WhatsApp</a>
        </div></section>)}
    </>
  );
}
