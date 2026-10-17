'use client';
import { useRef, useState, type ReactNode } from 'react';

export function ConfirmButton({ label, title, children, onConfirm, danger = true, className = 'btn btn-outline btn-sm', confirmLabel = 'Confirm' }: {
  label: ReactNode; title: string; children?: ReactNode; onConfirm: () => Promise<string | void>; danger?: boolean; className?: string; confirmLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <>
      <button type="button" className={className} onClick={() => { setErr(''); ref.current?.showModal(); }}>{label}</button>
      <dialog ref={ref} className="m-auto w-[min(92vw,28rem)] border border-neutral-300 p-0 backdrop:bg-black/50" aria-labelledby="cd-title">
        <div className="space-y-4 p-6">
          <h2 id="cd-title" className="font-luxe text-2xl">{title}</h2>
          <div className="text-sm text-neutral-700">{children}</div>
          {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => ref.current?.close()} disabled={busy}>Cancel</button>
            <button type="button" className={`btn btn-sm ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={async () => {
              setBusy(true); setErr('');
              try { const e = await onConfirm(); if (e) setErr(e); else ref.current?.close(); } catch { setErr('Something went wrong. Please try again.'); }
              setBusy(false);
            }}>{busy ? 'Working…' : confirmLabel}</button>
          </div>
        </div>
      </dialog>
    </>
  );
}
