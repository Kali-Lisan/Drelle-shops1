import { getSettings } from '@/lib/data';
import { waLink } from '@/lib/whatsapp';
export const metadata = { title: 'Contact' };

export default async function Contact() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-luxe text-4xl">Contact us</h1>
      <p className="mt-4 text-neutral-600">The quickest way to reach us is WhatsApp. Ask about availability, preorders or items you cannot find.</p>
      {s.whatsapp_number ? <a className="btn btn-wa mt-6" target="_blank" rel="noopener noreferrer" href={waLink(s.whatsapp_number, `Hello ${s.store_name}, I would like to make an inquiry.`)}>Message us on WhatsApp</a>
        : <p className="mt-6 text-sm text-neutral-500">WhatsApp contact is not configured yet.</p>}
      {s.support_email && <p className="mt-6 text-sm">Email: {s.support_email}</p>}
    </div>
  );
}
