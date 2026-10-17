import Link from 'next/link';
import Image from 'next/image';
import { getBrands } from '@/lib/data';
import { imageUrl } from '@/lib/media';
export const metadata = { title: 'Maisons' };

export default async function Brands() {
  const brands = await getBrands();
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-luxe text-4xl">Maisons</h1>
      {brands.length === 0 ? <p className="mt-6 text-neutral-500">No maisons are listed yet.</p> : (
        <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map(b => (<li key={b.id}>
            <Link href={`/brands/${b.slug}`} className="card flex h-32 flex-col items-center justify-center gap-2 p-4 text-center transition hover:border-gold">
              {b.logo_path && <Image src={imageUrl(b.logo_path)!} alt="" width={96} height={40} className="h-10 w-auto object-contain" />}
              <span className="font-luxe text-xl">{b.name}</span>
            </Link></li>))}
        </ul>)}
    </div>
  );
}
