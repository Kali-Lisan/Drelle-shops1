import { redirect } from 'next/navigation';
import { getAdmin } from '@/lib/auth';
import { LoginForm } from '@/components/admin/LoginForm';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getAdmin()) redirect('/admin');
  const { next } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
      <div className="card w-full max-w-sm p-8">
        <p className="font-luxe text-3xl">Drelle Shops</p>
        <h1 className="mt-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">Administrator sign in</h1>
        <LoginForm next={next ?? ''} />
      </div>
    </div>
  );
}
