'use server';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { assertAdmin } from '@/lib/auth';
import { IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, VIDEO_TYPES } from '@/lib/media';
import { extFor, isAllowedMime, verifyUploaded } from '@/lib/storage-verify';

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
const uuid = z.string().uuid();
const bust = () => { revalidatePath('/', 'layout'); };

export async function createUpload(input: unknown): Promise<Result<{ bucket: 'product-images' | 'product-videos'; path: string; token: string }>> {
  const { supabase } = await assertAdmin();
  const p = z.object({ scope: z.enum(['product', 'brand', 'category']), productId: uuid.optional(), mime: z.string().max(100), size: z.number().int().positive() }).safeParse(input);
  if (!p.success) return { ok: false, error: 'Invalid upload request.' };
  const { scope, productId, mime, size } = p.data;
  if (!isAllowedMime(mime)) return { ok: false, error: 'Unsupported file type. Use JPEG, PNG, WebP, AVIF, MP4, WebM or MOV.' };
  const isVideo = (VIDEO_TYPES as readonly string[]).includes(mime);
  if (isVideo && scope !== 'product') return { ok: false, error: 'Only images are allowed here.' };
  if (size > (isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)) return { ok: false, error: `File too large (max ${isVideo ? '50' : '8'} MB).` };
  if (scope === 'product' && !productId) return { ok: false, error: 'Save the product before uploading media.' };
  const bucket = isVideo ? 'product-videos' : 'product-images';
  const path = `${scope === 'product' ? `products/${productId}` : scope === 'brand' ? 'brands' : 'categories'}/${randomUUID()}.${extFor(mime)}`;
  const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, error: 'Could not start the upload.' };
  return { ok: true, bucket, path, token: data.token };
}

export async function registerMedia(input: unknown): Promise<Result<{ id: string }>> {
  const { supabase } = await assertAdmin();
  const p = z.object({ productId: uuid, bucket: z.enum(['product-images', 'product-videos']), path: z.string().max(300), alt: z.string().max(200).default('') }).safeParse(input);
  if (!p.success) return { ok: false, error: 'Invalid media.' };
  const { productId, bucket, path, alt } = p.data;
  if (!path.startsWith(`products/${productId}/`)) return { ok: false, error: 'Invalid storage path.' };
  const v = await verifyUploaded(supabase, bucket, path);
  if (!v.ok) return v;
  const { data: existing } = await supabase.from('product_media').select('position,is_primary,media_type').eq('product_id', productId);
  const pos = (existing ?? []).reduce((m, r) => Math.max(m, r.position), -1) + 1;
  const isImage = v.mime.startsWith('image/');
  const makePrimary = isImage && !(existing ?? []).some(r => r.is_primary);
  const { data, error } = await supabase.from('product_media').insert({
    product_id: productId, media_type: isImage ? 'image' : 'video', bucket, storage_path: path, mime_type: v.mime,
    file_size: v.size, alt_text: alt, position: pos, is_primary: makePrimary,
  }).select('id').single();
  if (error || !data) { await supabase.storage.from(bucket).remove([path]); return { ok: false, error: 'Could not save the media record.' }; }
  bust();
  return { ok: true, id: data.id };
}

export async function reorderMedia(productId: string, orderedIds: string[]): Promise<Result> {
  const { supabase } = await assertAdmin();
  if (!uuid.safeParse(productId).success || !z.array(uuid).max(100).safeParse(orderedIds).success) return { ok: false, error: 'Invalid request.' };
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from('product_media').update({ position: i }).eq('id', orderedIds[i]).eq('product_id', productId);
    if (error) return { ok: false, error: 'Could not save the new order.' };
  }
  bust(); return { ok: true };
}

export async function setPrimaryMedia(mediaId: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  if (!uuid.safeParse(mediaId).success) return { ok: false, error: 'Invalid request.' };
  const { error } = await supabase.rpc('admin_set_primary_media', { p_media_id: mediaId });
  if (error) return { ok: false, error: 'Only images can be the primary media.' };
  bust(); return { ok: true };
}

export async function updateMediaAlt(mediaId: string, alt: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from('product_media').update({ alt_text: alt.slice(0, 200) }).eq('id', uuid.parse(mediaId));
  if (error) return { ok: false, error: 'Could not save.' };
  bust(); return { ok: true };
}

export async function deleteMedia(mediaId: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  if (!uuid.safeParse(mediaId).success) return { ok: false, error: 'Invalid request.' };
  const { data: m } = await supabase.from('product_media').select('*').eq('id', mediaId).single();
  if (!m) return { ok: false, error: 'Media not found.' };
  const { error } = await supabase.from('product_media').delete().eq('id', mediaId);
  if (error) return { ok: false, error: 'Could not delete.' };
  await supabase.storage.from(m.bucket).remove([m.storage_path]);
  if (m.is_primary) {
    const { data: next } = await supabase.from('product_media').select('id').eq('product_id', m.product_id).eq('media_type', 'image').order('position').limit(1);
    if (next?.[0]) await supabase.rpc('admin_set_primary_media', { p_media_id: next[0].id });
  }
  bust(); return { ok: true };
}

// Replace the file behind an existing media slot (keeps position/primary/alt).
export async function replaceMedia(input: unknown): Promise<Result> {
  const { supabase } = await assertAdmin();
  const p = z.object({ mediaId: uuid, bucket: z.enum(['product-images', 'product-videos']), path: z.string().max(300) }).safeParse(input);
  if (!p.success) return { ok: false, error: 'Invalid request.' };
  const { data: old } = await supabase.from('product_media').select('*').eq('id', p.data.mediaId).single();
  if (!old) return { ok: false, error: 'Media not found.' };
  if (old.bucket !== p.data.bucket) return { ok: false, error: 'Replacement must be the same kind of media (image or video).' };
  if (!p.data.path.startsWith(`products/${old.product_id}/`)) return { ok: false, error: 'Invalid storage path.' };
  const v = await verifyUploaded(supabase, p.data.bucket, p.data.path);
  if (!v.ok) return v;
  const { error } = await supabase.from('product_media').update({ storage_path: p.data.path, mime_type: v.mime, file_size: v.size }).eq('id', old.id);
  if (error) { await supabase.storage.from(p.data.bucket).remove([p.data.path]); return { ok: false, error: 'Could not replace the file.' }; }
  await supabase.storage.from(old.bucket).remove([old.storage_path]);
  bust(); return { ok: true };
}

// Used by brand/category forms: verify an uploaded logo/image before it is saved on the record.
export async function confirmImageUpload(path: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  const v = await verifyUploaded(supabase, 'product-images', path);
  return v.ok ? { ok: true } : v;
}

export async function removeStorageObjects(items: { bucket: string; path: string }[]) {
  const { supabase } = await assertAdmin();
  for (const b of ['product-images', 'product-videos'] as const) {
    const paths = items.filter(i => i.bucket === b).map(i => i.path);
    if (paths.length) await supabase.storage.from(b).remove(paths);
  }
}
