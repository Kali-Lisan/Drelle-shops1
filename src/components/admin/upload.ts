'use client';
import { createClient } from '@supabase/supabase-js';
import { createUpload } from '@/actions/admin/media';

export interface Uploaded { bucket: 'product-images' | 'product-videos'; path: string }

/** Uploads straight from the browser to Supabase Storage via a one-time signed URL (no server memory, real progress). */
export async function uploadFile(file: File, scope: 'product' | 'brand' | 'category', productId: string | undefined, onProgress: (pct: number) => void): Promise<Uploaded> {
  const t = await createUpload({ scope, productId, mime: file.type, size: file.size });
  if (!t.ok) throw new Error(t.error);
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  const url = `${base}/storage/v1/object/upload/sign/${t.bucket}/${t.path}?token=${encodeURIComponent(t.token)}`;
  const viaXhr = () => new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('apikey', key);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`status ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('network'));
    const body = new FormData();
    body.append('cacheControl', '31536000');
    body.append('', file);
    xhr.send(body);
  });
  try { await viaXhr(); }
  catch {
    // Fallback to the official client (no progress events) if the raw request is rejected.
    const sb = createClient(base, key, { auth: { persistSession: false } });
    const { error } = await sb.storage.from(t.bucket).uploadToSignedUrl(t.path, t.token, file);
    if (error) throw new Error('Upload failed. Please try again.');
  }
  onProgress(100);
  return { bucket: t.bucket, path: t.path };
}
