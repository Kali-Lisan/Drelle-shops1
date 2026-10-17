import Link from 'next/link';
import { getSettings } from '@/lib/data';
import { waLink } from '@/lib/whatsapp';

export async function Footer() {
  const s = await getSettings();
  return (
    <footer className="mt-20 bg-neutral-950 text-neutral-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-luxe text-2xl text-white">{s.store_name}</p>
          <p className="mt-2 text-sm text-neutral-400">{s.tagline}</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-2 text-sm">
          <Link href="/shop" className="hover:text-white">Shop</Link>
          <Link href="/brands" className="hover:text-white">Maisons</Link>
          <Link href="/contact" className="hover:text-white">Contact</Link>
          <Link href="/policies/shipping" className="hover:text-white">Delivery</Link>
          <Link href="/policies/returns" className="hover:text-white">Returns</Link>
          <Link href="/policies/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/policies/terms" className="hover:text-white">Terms</Link>
        </nav>
        <div className="text-sm">
          {s.whatsapp_number && <a className="btn btn-wa" href={waLink(s.whatsapp_number, `Hello ${s.store_name}, I have a question.`)} target="_blank" rel="noopener noreferrer">Chat on WhatsApp</a>}
          {s.support_email && <p className="mt-3 text-neutral-400">{s.support_email}</p>}
        </div>
      </div>
      <p className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-500">© {new Date().getFullYear()} {s.store_name}. All rights reserved.</p>
    </footer>
  );
}
