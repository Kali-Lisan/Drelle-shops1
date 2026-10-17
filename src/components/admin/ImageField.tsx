'use client';
import { useState } from 'react';
import { imageUrl, IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/media';
import { uploadFile } from './upload';

export function ImageField({ label, scope, value, onChange }: { label: string; scope: 'brand' | 'category'; value: string | null; onChange: (p: string | null) => void }) {
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState('');
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        {value ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={imageUrl(value)!} alt="" className="h-14 w-14 border border-neutral-200 object-contain" /> : <div className="flex h-14 w-14 items-center justify-center border border-dashed text-[10px] text-neutral-400">None</div>}
        <label className="btn btn-outline btn-sm cursor-pointer">{pct !== null && pct < 100 ? `${pct}%` : value ? 'Change' : 'Upload'}
          <input type="file" className="sr-only" accept={IMAGE_TYPES.join(',')} onChange={async e => {
            const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setErr('');
            if (!(IMAGE_TYPES as readonly string[]).includes(f.type) || f.size > MAX_IMAGE_BYTES) { setErr('Use a JPEG, PNG, WebP or AVIF under 8 MB.'); return; }
            try { setPct(0); const u = await uploadFile(f, scope, undefined, setPct); onChange(u.path); } catch (x) { setErr(x instanceof Error ? x.message : 'Upload failed'); setPct(null); }
          }} /></label>
        {value && <button type="button" className="text-xs underline" onClick={() => onChange(null)}>Remove</button>}
      </div>
      {err && <p className="mt-1 text-xs text-red-700" role="alert">{err}</p>}
    </div>
  );
}
