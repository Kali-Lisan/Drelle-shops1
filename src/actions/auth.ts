'use server';
import { createHmac } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';

export interface LoginState { error?: string }

async function throttleKey() {
  const h = await headers();
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'unknown').trim();
  const secret = process.env.LOGIN_HMAC_SECRET;
  if (!secret || secret.length < 32) throw new Error('LOGIN_HMAC_SECRET is not configured');
  return createHmac('sha256', secret).update(ip).digest('hex');
}

const safeNext = (n: unknown) => (typeof n === 'string' && /^\/admin(\/[A-Za-z0-9/_-]*)?$/.test(n) ? n : '/admin');

// The visitor supplies ONLY the password. The email is a server-only environment variable.
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const password = form.get('password');
  const email = process.env.ADMIN_EMAIL?.trim();
  if (!email) return { error: 'Admin sign-in is not configured.' };
  if (typeof password !== 'string' || password.length === 0 || password.length > 200) return { error: 'Enter the administrator password.' };

  const supabase = await serverClient();
  const key = await throttleKey();
  const { data: blocked } = await supabase.rpc('login_is_blocked', { p_key: key });
  if (blocked) return { error: 'Too many failed attempts. Please wait 15 minutes and try again.' };

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  let ok = !error;
  if (ok) {
    const { data: isAdmin } = await supabase.rpc('is_admin');
    if (isAdmin !== true) { await supabase.auth.signOut(); ok = false; }
  }
  if (!ok) {
    await supabase.rpc('login_record_failure', { p_key: key });
    return { error: 'Incorrect password.' };   // identical message for every failure cause
  }
  await supabase.rpc('login_clear', { p_key: key });
  redirect(safeNext(form.get('next')));
}

export async function logout() {
  const supabase = await serverClient();
  await supabase.auth.signOut({ scope: 'global' });   // revokes every refresh token for the admin
  redirect('/admin/login');
}
