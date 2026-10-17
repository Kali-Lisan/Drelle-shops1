import { notFound } from 'next/navigation';
import { Listing } from '@/components/store/Listing';
import { getCategories } from '@/lib/data';

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const cats = await getCategories();
  const cat = cats.find(c => c.slug === slug);
  if (!cat) notFound();
  const subs = cats.filter(c => c.parent_id === cat.id);
  const parent = cats.find(c => c.id === cat.parent_id);
  return <Listing sp={await searchParams} basePath={`/categories/${slug}`} title={parent ? `${parent.name} · ${cat.name}` : cat.name} fixedCategory={slug}
    intro={subs.length > 0 && (<div className="mt-4 flex flex-wrap gap-2">{subs.map(s => <a key={s.id} href={`/categories/${s.slug}`} className="btn btn-outline btn-sm">{s.name}</a>)}</div>)} />;
}
