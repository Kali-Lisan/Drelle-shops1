'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { setOrderStatus, saveOrderNotes } from '@/actions/admin/store';
import { ConfirmButton } from './ConfirmButton';

export function OrderControls({ id, status, notes }: { id: string; status: string; notes: string }) {
  const router = useRouter();
  const [n, setN] = useState(notes);
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  const go = async (s: string) => { const r = await setOrderStatus(id, s); if (!r.ok) return r.error; router.refresh(); };
  const next = status === 'pending' ? ['confirmed', 'completed'] : status === 'confirmed' ? ['completed'] : [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {next.map(s => (<ConfirmButton key={s} danger={false} className="btn btn-primary btn-sm" label={`Mark ${s}`} title={`Mark order ${s}?`} confirmLabel="Yes, update" onConfirm={() => go(s)}>
          {s === 'confirmed' ? 'Confirm only after you have spoken to the customer. Held stock will be deducted from inventory.' : 'The order will be marked completed. This is final.'}</ConfirmButton>))}
        {(status === 'pending' || status === 'confirmed') && <ConfirmButton className="btn btn-outline btn-sm" label="Cancel order" title="Cancel this order?" confirmLabel="Cancel order" onConfirm={() => go('cancelled')}>Held or deducted stock goes back to inventory. This is final.</ConfirmButton>}
        {next.length === 0 && status !== 'pending' && status !== 'confirmed' && <p className="text-sm text-neutral-500">This order is final.</p>}
      </div>
      <div><label className="label" htmlFor="an">Admin notes</label><textarea id="an" rows={3} className="input" value={n} maxLength={2000} onChange={e => setN(e.target.value)} />
        <button className="btn btn-outline btn-sm mt-2" disabled={pending} onClick={() => start(async () => { const r = await saveOrderNotes(id, n); setMsg(r.ok ? 'Notes saved.' : r.error); router.refresh(); })}>Save notes</button>
        {msg && <span className="ml-3 text-sm" role="status">{msg}</span>}</div>
    </div>
  );
}
