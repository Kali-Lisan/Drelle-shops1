import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { slugify } from './format';

export async function uniqueSlug(sb: SupabaseClient, table: 'products' | 'brands' | 'categories', base: string, excludeId?: string) {
  const root = slugify(base);
  const { data } = await sb.from(table).select('id,slug').like('slug', `${root}%`);
  const taken = new Set((data ?? []).filter(r => r.id !== excludeId).map(r => r.slug as string));
  if (!taken.has(root)) return root;
  for (let i = 2; i < 500; i++) if (!taken.has(`${root}-${i}`)) return `${root}-${i}`;
  return `${root}-${Date.now()}`;
}
