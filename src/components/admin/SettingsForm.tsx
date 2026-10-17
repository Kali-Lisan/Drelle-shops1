'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Settings } from '@/lib/types';
import { saveSettings, savePage } from '@/actions/admin/store';

export function SettingsForm({ settings, pages }: { settings: Settings; pages: { slug: string; title: string; body: string }[] }) {
  const router = useRouter();
  const [s, setS] = useState(settings);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  const [pg, setPg] = useState(pages);
  const field = (k: keyof Settings, label: string, props: { type?: string; area?: boolean; help?: string } = {}) => (
    <div><label className="label" htmlFor={k}>{label}</label>
      {props.area ? <textarea id={k} rows={3} className="input" value={String(s[k])} onChange={e => setS({ ...s, [k]: e.target.value })} />
        : <input id={k} type={props.type ?? 'text'} className="input" value={String(s[k])} onChange={e => setS({ ...s, [k]: props.type === 'number' ? Number(e.target.value) : e.target.value })} />}
      {props.help && <p className="mt-1 text-xs text-neutral-500">{props.help}</p>}</div>);
  return (
    <div className="space-y-8">
      <div className="card space-y-4 p-5">
        <h2 className="font-luxe text-2xl">Store</h2>
        {field('store_name', 'Store name')}{field('tagline', 'Tagline')}
        {field('whatsapp_number', 'WhatsApp business number', { help: 'Digits only with country code, e.g. 233531808823. Used for every WhatsApp button and checkout.' })}
        {field('support_email', 'Support email (optional)')}
        {field('inquiry_template', 'Product inquiry message', { area: true, help: 'Placeholders: {brand} {product_name} {price}' })}
        {field('preorder_policy', 'Preorder policy (shown to customers)', { area: true })}
        {field('low_stock_threshold', 'Low-stock threshold', { type: 'number' })}
        {field('announcement_text', 'Announcement bar text')}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.show_announcement} onChange={e => setS({ ...s, show_announcement: e.target.checked })} /> Show announcement bar</label>
        <div className="flex items-center gap-3"><button className="btn btn-primary" disabled={pending} onClick={() => start(async () => { const r = await saveSettings(s); setMsg(r.ok ? { ok: true, t: 'Settings saved.' } : { ok: false, t: r.error }); if (r.ok) router.refresh(); })}>{pending ? 'Saving…' : 'Save settings'}</button>
          {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-700'}`} role={msg.ok ? 'status' : 'alert'}>{msg.t}</p>}</div>
      </div>
      <div className="space-y-4">
        <h2 className="font-luxe text-2xl">Policy pages</h2>
        {pg.map((p, i) => (
          <div key={p.slug} className="card space-y-3 p-5">
            <input className="input font-semibold" aria-label={`${p.slug} title`} value={p.title} onChange={e => setPg(x => x.map((y, j) => j === i ? { ...y, title: e.target.value } : y))} />
            <textarea rows={5} className="input" aria-label={`${p.slug} text`} value={p.body} onChange={e => setPg(x => x.map((y, j) => j === i ? { ...y, body: e.target.value } : y))} />
            <button className="btn btn-outline btn-sm" onClick={async () => { const r = await savePage(p.slug, p.title, p.body); setMsg(r.ok ? { ok: true, t: `${p.title} saved.` } : { ok: false, t: r.error }); }}>Save “{p.title}”</button>
          </div>))}
      </div>
    </div>
  );
}
