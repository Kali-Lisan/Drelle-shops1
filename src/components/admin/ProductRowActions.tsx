'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { deleteProduct, duplicateProduct, setPublished } from '@/actions/admin/products';
import { ConfirmButton } from './ConfirmButton';

export function ProductRowActions({ id, name, published }: { id: string; name: string; published: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState('');
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Link className="btn btn-outline btn-sm" href={`/admin/products/${id}`}>Edit</Link>
      <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await setPublished(id, !published); if (!r.ok) setErr(r.error); router.refresh(); })}>{published ? 'Unpublish' : 'Publish'}</button>
      <button className="btn btn-outline btn-sm" disabled={pending} onClick={() => start(async () => { const r = await duplicateProduct(id); if (r.ok) router.push(`/admin/products/${r.id}`); else setErr(r.error); })}>Duplicate</button>
      <ConfirmButton label="Delete" title={`Delete “${name}”?`} confirmLabel="Delete product" onConfirm={async () => { const r = await deleteProduct(id); if (!r.ok) return r.error; router.refresh(); }}>
        The product and its media will be removed from the store. Past orders keep their saved item names and prices.</ConfirmButton>
      {err && <span className="w-full text-right text-xs text-red-700" role="alert">{err}</span>}
    </div>
  );
}
