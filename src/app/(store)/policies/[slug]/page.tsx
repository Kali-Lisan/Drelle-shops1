import { notFound } from 'next/navigation';
import { getPage } from '@/lib/data';

export default async function Policy({ params }: { params: Promise<{ slug: string }> }) {
  const page = await getPage((await params).slug);
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-luxe text-4xl">{page.title}</h1>
      <div className="mt-6 space-y-4 whitespace-pre-line leading-relaxed text-neutral-700">{page.body}</div>
    </article>
  );
}
