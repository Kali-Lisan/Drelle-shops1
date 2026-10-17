import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { logout } from '@/actions/auth';
import { AdminNav } from '@/components/admin/AdminNav';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-neutral-50 lg:flex">
      <aside className="border-b border-neutral-200 bg-white lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <Link href="/admin" className="font-luxe text-2xl">Drelle Admin</Link>
          <form action={logout} className="lg:mt-3"><button className="btn btn-outline btn-sm">Sign out</button></form>
        </div>
        <AdminNav />
        <Link href="/" target="_blank" className="hidden px-4 py-3 text-xs text-neutral-500 underline lg:block">View storefront ↗</Link>
      </aside>
      <main className="min-w-0 flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
