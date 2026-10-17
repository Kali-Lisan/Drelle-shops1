'use server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertAdmin } from '@/lib/auth';
import type { Result } from './media';

const uuid = z.string().uuid();
const bust = () => { revalidatePath('/', 'layout'); revalidatePath('/admin', 'layout'); };

export async function setOrderStatus(orderId: string, status: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  if (!uuid.safeParse(orderId).success) return { ok: false, error: 'Invalid request.' };
  const { error } = await supabase.rpc('admin_set_order_status', { p_order_id: orderId, p_status: status });
  if (error) return { ok: false, error: error.message.startsWith('INVALID_TRANSITION') ? 'That status change is not allowed (completed and cancelled orders are final).' : 'Could not update the order.' };
  bust(); return { ok: true };
}

export async function saveOrderNotes(orderId: string, notes: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from('orders').update({ admin_notes: notes.slice(0, 2000) }).eq('id', uuid.parse(orderId));
  if (error) return { ok: false, error: 'Could not save notes.' };
  bust(); return { ok: true };
}

const settingsSchema = z.object({
  store_name: z.string().trim().min(1).max(80), tagline: z.string().trim().max(200),
  whatsapp_number: z.string().trim().regex(/^[0-9]{6,20}$/, 'WhatsApp number must be digits only, including country code (e.g. 233531808823).'),
  support_email: z.string().trim().max(120).refine(v => v === '' || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Enter a valid email or leave blank.'),
  announcement_text: z.string().trim().max(200), show_announcement: z.boolean(),
  inquiry_template: z.string().trim().min(5).max(500), preorder_policy: z.string().trim().max(1000),
  low_stock_threshold: z.number().int().min(0).max(1000),
});

export async function saveSettings(raw: unknown): Promise<Result> {
  const { supabase } = await assertAdmin();
  const p = settingsSchema.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { error } = await supabase.from('store_settings').update(p.data).eq('id', 1);
  if (error) return { ok: false, error: 'Could not save settings.' };
  bust(); return { ok: true };
}

export async function savePage(slug: string, title: string, body: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  if (!/^[a-z0-9-]+$/.test(slug) || !title.trim()) return { ok: false, error: 'Invalid page.' };
  const { error } = await supabase.from('store_pages').update({ title: title.trim().slice(0, 100), body: body.slice(0, 20000) }).eq('slug', slug);
  if (error) return { ok: false, error: 'Could not save the page.' };
  bust(); return { ok: true };
}
