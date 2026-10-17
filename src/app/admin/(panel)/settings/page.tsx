import { requireAdmin } from '@/lib/auth';
import { SettingsForm } from '@/components/admin/SettingsForm';
import type { Settings } from '@/lib/types';

export default async function SettingsPage() {
  const { supabase } = await requireAdmin();
  const [{ data: s }, { data: pages }] = await Promise.all([supabase.from('store_settings').select('*').eq('id', 1).single(), supabase.from('store_pages').select('slug,title,body').order('slug')]);
  return (<div className="mx-auto max-w-3xl"><h1 className="font-luxe mb-6 text-4xl">Store settings</h1>
    <SettingsForm settings={s as Settings} pages={pages ?? []} /></div>);
}
