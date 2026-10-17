'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useCart } from '../CartProvider';

export function HeaderClient({ categories }: { categories: { name: string; slug: string }[] }) {
  const { count } = useCart();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) { router.push(`/search?q=${encodeURIComponent(q.trim())}`); setOpen(false); }
  };
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <button className="lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        <Link href="/" className="font-luxe text-2xl font-semibold tracking-wide">Drelle Shops</Link>
        <nav className="ml-6 hidden items-center gap-6 text-xs font-semibold uppercase tracking-widest lg:flex" aria-label="Main">
          <Link href="/shop" className="hover:text-gold">Shop</Link>
          <Link href="/brands" className="hover:text-gold">Maisons</Link>
          {categories.slice(0, 5).map(c => <Link key={c.slug} href={`/categories/${c.slug}`} className="hover:text-gold">{c.name}</Link>)}
        </nav>
        <form onSubmit={submit} role="search" className="ml-auto hidden max-w-xs flex-1 items-center border border-neutral-300 px-3 md:flex">
          <Search className="h-4 w-4 text-neutral-500" aria-hidden />
          <input value={q} onChange={e => setQ(e.target.value)} aria-label="Search products" placeholder="Search products or maisons"
            className="w-full bg-transparent px-2 py-2 text-sm focus:outline-none" />
        </form>
        <Link href="/cart" className="relative ml-auto md:ml-0" aria-label={`Cart, ${count} items`}>
          <ShoppingBag className="h-6 w-6" />
          {count > 0 && <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-neutral-950 px-1 text-[10px] font-bold text-white">{count}</span>}
        </Link>
      </div>
      {open && (
        <div className="border-t border-neutral-200 bg-white px-4 pb-4 lg:hidden">
          <form onSubmit={submit} role="search" className="my-3 flex items-center border border-neutral-300 px-3">
            <Search className="h-4 w-4 text-neutral-500" aria-hidden />
            <input value={q} onChange={e => setQ(e.target.value)} aria-label="Search products" placeholder="Search" className="w-full px-2 py-2 text-sm focus:outline-none" />
          </form>
          <nav className="flex flex-col gap-3 text-sm font-semibold uppercase tracking-widest" aria-label="Mobile">
            <Link href="/shop" onClick={() => setOpen(false)}>Shop all</Link>
            <Link href="/brands" onClick={() => setOpen(false)}>Maisons</Link>
            {categories.map(c => <Link key={c.slug} href={`/categories/${c.slug}`} onClick={() => setOpen(false)}>{c.name}</Link>)}
            <Link href="/contact" onClick={() => setOpen(false)}>Contact</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
