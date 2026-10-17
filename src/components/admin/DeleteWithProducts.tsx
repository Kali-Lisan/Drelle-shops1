'use client';
import { useState } from 'react';
import { ConfirmButton } from './ConfirmButton';

export function DeleteWithProducts({ kind, name, count, targets, onDelete }: {
  kind: 'maison' | 'category'; name: string; count: number; targets: { id: string; name: string }[];
  onDelete: (mode: 'none' | 'reassign' | 'delete_products', target: string | null) => Promise<string | void>;
}) {
  const [mode, setMode] = useState<'reassign' | 'delete_products'>('reassign');
  const [target, setTarget] = useState('');
  const [typed, setTyped] = useState('');
  return (
    <ConfirmButton label="Delete" title={`Delete ${kind} “${name}”?`} confirmLabel="Delete" onConfirm={async () => {
      if (count === 0) return onDelete('none', null);
      if (mode === 'reassign' && kind === 'category' && !target) return 'Choose a category to move the products to.';
      if (mode === 'delete_products' && typed !== 'DELETE') return 'Type DELETE to confirm deleting the products.';
      return onDelete(mode, mode === 'reassign' ? target || null : null);
    }}>
      {count === 0 ? <p>This {kind} has no products. It will be removed from the storefront immediately.</p> : (
        <div className="space-y-3">
          <p><strong>{count}</strong> product{count === 1 ? '' : 's'} use this {kind}. Order history is never deleted — past orders keep their saved names and prices.</p>
          <label className="flex items-start gap-2"><input type="radio" checked={mode === 'reassign'} onChange={() => setMode('reassign')} />
            <span>Move the products to another {kind}{kind === 'maison' ? ' (or none)' : ''}</span></label>
          {mode === 'reassign' && <select className="input" value={target} onChange={e => setTarget(e.target.value)} aria-label="Move products to">
            <option value="">{kind === 'maison' ? '— No maison —' : 'Choose…'}</option>{targets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>}
          <label className="flex items-start gap-2"><input type="radio" checked={mode === 'delete_products'} onChange={() => setMode('delete_products')} />
            <span className="text-red-800">Permanently delete these products and their media</span></label>
          {mode === 'delete_products' && <input className="input" placeholder="Type DELETE" value={typed} onChange={e => setTyped(e.target.value)} aria-label="Type DELETE to confirm" />}
        </div>)}
    </ConfirmButton>
  );
}
