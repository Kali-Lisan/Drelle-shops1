import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { EXT_FOR, IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, VIDEO_TYPES } from './media';

export function sniffMime(b: Uint8Array): string | null {
  const s = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && s(1, 4) === 'PNG') return 'image/png';
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP') return 'image/webp';
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'video/webm';
  if (s(4, 8) === 'ftyp') {
    const brand = s(8, 12);
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (brand === 'qt  ') return 'video/quicktime';
    return 'video/mp4';
  }
  return null;
}

export const PATH_RE = /^(brands|categories|products\/[0-9a-f-]{36})\/[0-9a-f-]{36}\.(jpg|png|webp|avif|mp4|webm|mov)$/;

export function isAllowedMime(mime: string) {
  return (IMAGE_TYPES as readonly string[]).includes(mime) || (VIDEO_TYPES as readonly string[]).includes(mime);
}
export const extFor = (mime: string) => EXT_FOR[mime];

/**
 * Reads only the first bytes (HTTP Range) of an uploaded object to check its real content type,
 * and takes the true size from Content-Range. Nothing large is loaded into memory.
 * On failure the object is deleted.
 */
export async function verifyUploaded(sb: SupabaseClient, bucket: 'product-images' | 'product-videos', path: string):
  Promise<{ ok: true; mime: string; size: number } | { ok: false; error: string }> {
  const fail = async (error: string) => { await sb.storage.from(bucket).remove([path]); return { ok: false as const, error }; };
  if (!PATH_RE.test(path)) return { ok: false, error: 'Invalid storage path.' };
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data) return { ok: false, error: 'Uploaded file not found.' };
  const res = await fetch(data.signedUrl, { headers: { Range: 'bytes=0-31' }, cache: 'no-store' });
  if (!res.ok) return { ok: false, error: 'Uploaded file not found.' };
  const head = new Uint8Array(await res.arrayBuffer()).slice(0, 32);
  const total = Number(res.headers.get('content-range')?.split('/')[1] ?? res.headers.get('content-length') ?? 0);
  const mime = sniffMime(head);
  if (!mime) return fail('The file content is not a supported image or video.');
  const isImage = mime.startsWith('image/');
  if ((bucket === 'product-images') !== isImage) return fail('The file type does not match its destination.');
  if (!total || total > (isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES)) return fail('The file is too large.');
  return { ok: true, mime, size: total };
}
