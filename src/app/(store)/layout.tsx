import { Header } from '@/components/store/Header';
import { Footer } from '@/components/store/Footer';
import { getSettings } from '@/lib/data';

export const revalidate = 60;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="flex min-h-screen flex-col">
      {settings.show_announcement && settings.announcement_text && (
        <div className="bg-neutral-950 px-4 py-2 text-center text-xs tracking-wide text-amber-100">{settings.announcement_text}</div>
      )}
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
