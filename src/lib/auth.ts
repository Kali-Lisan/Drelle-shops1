import 'server-only';
import { redirect } from 'next/navigation';
import { serverClient } from './supabase/server';

/**
 * Authoritative admin check. A valid Supabase session alone is NOT enough:
 *  1. the session user's email must equal the server-only ADMIN_EMAIL, and
 *  2. the user must exist in public.admin_users (checked by the database via is_admin()).
 * RLS repeats check 2 on every query, so a bypass here still cannot write data.
 */
export async function getAdmin() {
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!user || !adminEmail || user.email?.toLowerCase() !== adminEmail) return null;
  const { data } = await supabase.rpc('is_admin');
  if (data !== true) return null;
  return { supabase, user };
}

export async function requireAdmin() {
  const a = await getAdmin();
  if (!a) redirect('/admin/login');
  return a;
}

// For server actions: throws instead of redirecting so the client gets a clean error.
export async function assertAdmin() {
  const a = await getAdmin();
  if (!a) throw new Error('Not authorized');
  return a;
}
