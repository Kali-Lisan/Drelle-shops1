import Link from 'next/link';
import { getBrands, getCategories, getProducts, PAGE_SIZE } from '@/lib/data';
import { ProductGrid } from './ProductCard';

type SP = Record<string, string | string[] | undefined>;
const arr = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const num = (v: string | string[] | undefined) => { const n = Number(Array.isArray(v) ? v[0] : v); return Number.isFinite(n) && (Array.isArray(v) ? v[0] : v) !== '' && v !== undefined ? n : undefined; };

export async function Listing({ sp, basePath, title, fixedCategory, fixedBrand, intro }: {
  sp: SP; basePath: string; title: string; fixedCategory?: string; fixedBrand?: string; intro?: React.ReactNode;
}) {
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.slice(0, 100) ?? '';
  const category = fixedCategory ?? (Array.isArray(sp.category) ? sp.category[0] : sp.category) ?? '';
  const brands = fixedBrand ? [fixedBrand] : arr(sp.brand);
  const availability = arr(sp.avail).filter(a => ['available', 'preorder', 'sold_out'].includes(a));
  const sort = ['recommended', 'newest', 'price_asc', 'price_desc'].includes(String(sp.sort)) ? String(sp.sort) : 'recommended';
  const min = num(sp.min), max = num(sp.max);
  const page = Math.max(Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1, 1);

  const [{ rows, total }, allBrands, cats] = await Promise.all([
    getProducts({ q, brands, category, min, max, availability, sort: sort === 'newest' ? 'newest' : sort, page }),
    getBrands(), getCategories(),
  ]);
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set('q', q);
    if (!fixedCategory && category) u.set('category', category);
    if (!fixedBrand) brands.forEach(b => u.append('brand', b));
    availability.forEach(a => u.append('avail', a));
    if (min !== undefined) u.set('min', String(min)); if (max !== undefined) u.set('max', String(max));
    if (sort !== 'recommended') u.set('sort', sort);
    if (p > 1) u.set('page', String(p));
    const s = u.toString(); return s ? `${basePath}?${s}` : basePath;
  };
  const topCats = cats.filter(c => !c.parent_id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-luxe text-4xl">{title}</h1>
      {intro}
      <div className="mt-8 grid gap-10 lg:grid-cols-[240px_1fr]">
        <form method="get" action={basePath} className="space-y-6 text-sm" aria-label="Filters">
          <div><label className="label" htmlFor="q">Search</label><input id="q" name="q" defaultValue={q} className="input" placeholder="Name, maison, category" /></div>
          {!fixedCategory && (
            <div><label className="label" htmlFor="category">Category</label>
              <select id="category" name="category" defaultValue={category} className="input">
                <option value="">All categories</option>
                {topCats.map(c => (<optgroup key={c.id} label={c.name}>
                  <option value={c.slug}>All {c.name}</option>
                  {cats.filter(s => s.parent_id === c.id).map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
                </optgroup>))}
              </select></div>)}
          {!fixedBrand && (
            <fieldset><legend className="label">Maison</legend>
              <div className="max-h-48 space-y-1 overflow-y-auto border border-neutral-200 p-2">
                {allBrands.map(b => (<label key={b.id} className="flex items-center gap-2"><input type="checkbox" name="brand" value={b.slug} defaultChecked={brands.includes(b.slug)} />{b.name}</label>))}
              </div></fieldset>)}
          <fieldset><legend className="label">Availability</legend>
            {[['available', 'Available'], ['preorder', 'Preorder'], ['sold_out', 'Sold out']].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2"><input type="checkbox" name="avail" value={v} defaultChecked={availability.includes(v)} />{l}</label>))}
          </fieldset>
          <fieldset><legend className="label">Price (GHS)</legend>
            <div className="flex items-center gap-2">
              <input name="min" type="number" min={0} inputMode="numeric" defaultValue={min} className="input" placeholder="Min" aria-label="Minimum price" />
              <span>–</span>
              <input name="max" type="number" min={0} inputMode="numeric" defaultValue={max} className="input" placeholder="Max" aria-label="Maximum price" />
            </div></fieldset>
          <div><label className="label" htmlFor="sort">Sort by</label>
            <select id="sort" name="sort" defaultValue={sort} className="input">
              <option value="recommended">Recommended</option><option value="newest">Newest arrivals</option>
              <option value="price_asc">Price, low to high</option><option value="price_desc">Price, high to low</option>
            </select></div>
          <div className="flex gap-2"><button className="btn btn-primary flex-1">Apply</button><Link href={basePath} className="btn btn-outline">Reset</Link></div>
        </form>

        <section aria-live="polite">
          <p className="mb-4 text-sm text-neutral-500">{total} {total === 1 ? 'product' : 'products'}</p>
          {rows.length === 0 ? (
            <div className="border border-dashed border-neutral-300 p-12 text-center">
              <p className="font-luxe text-2xl">No products match your search</p>
              <p className="mt-2 text-sm text-neutral-500">Try removing a filter, or ask us on WhatsApp if we can source it for you.</p>
              <Link href={basePath} className="btn btn-outline mt-6">Clear filters</Link>
            </div>
          ) : <ProductGrid rows={rows} priorityCount={4} />}
          {pages > 1 && (
            <nav className="mt-10 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
              {page > 1 ? <Link className="btn btn-outline btn-sm" href={href(page - 1)} rel="prev">Previous</Link> : <span />}
              <span>Page {page} of {pages}</span>
              {page < pages ? <Link className="btn btn-outline btn-sm" href={href(page + 1)} rel="next">Next</Link> : <span />}
            </nav>)}
        </section>
      </div>
    </div>
  );
}
