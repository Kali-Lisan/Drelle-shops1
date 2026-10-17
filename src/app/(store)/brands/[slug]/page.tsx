import { notFound } from 'next/navigation';
import Image from 'next/image';
import { Listing } from '@/components/store/Listing';
import { getBrands } from '@/lib/data';
import { imageUrl } from '@/lib/media';

export default async function BrandPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const brand = (await getBrands()).find(b => b.slug === slug);
  if (!brand) notFound();
  return <Listing sp={await searchParams} basePath={`/brands/${slug}`} title={brand.name} fixedBrand={slug}
    intro={<div className="mt-3 flex items-start gap-4">
      {brand.logo_path && <Image src={imageUrl(brand.logo_path)!} alt={`${brand.name} logo`} width={96} height={48} className="h-12 w-auto object-contain" />}
      <div>{brand.origin && <p className="text-xs uppercase tracking-widest text-gold">{brand.origin}</p>}
        {brand.description && <p className="mt-1 max-w-2xl text-sm text-neutral-600">{brand.description}</p>}</div></div>} />;
}
