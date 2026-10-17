'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  ['/admin', 'Overview'], ['/admin/products', 'Products'], ['/admin/products/new', 'Add product'], ['/admin/maisons', 'Maisons'],
  ['/admin/categories', 'Categories'], ['/admin/orders', 'Orders'], ['/admin/inventory', 'Inventory'], ['/admin/settings', 'Store settings'],
];
export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:px-3">
      {items.map(([href, label]) => {
        const active = href === '/admin' ? path === href : path === href || (path.startsWith(href + '/') && href !== '/admin/products');
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
          className={`whitespace-nowrap px-3 py-2 text-sm ${active ? 'bg-neutral-950 text-white' : 'hover:bg-neutral-100'}`}>{label}</Link>;
      })}
    </nav>
  );
}
