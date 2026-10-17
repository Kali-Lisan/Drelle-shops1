import { ghs } from './format';

export const waLink = (number: string, text: string) =>
  `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

export function inquiryMessage(template: string, p: { name: string; brand: string | null; price: number | null }) {
  const brand = p.brand ?? '';
  const text = template
    .replaceAll('{brand}', brand).replaceAll('{product_name}', p.name)
    .replaceAll('{price}', ghs(p.price));
  return text.replace(/\s{2,}/g, ' ').trim();
}

interface OrderLike {
  reference: string; total: number; has_preorder: boolean;
  items: { product_name: string; brand_name: string; variant_label: string; unit_price: number; quantity: number; line_total: number; is_preorder: boolean }[];
}

// Built from the order saved in the database, never from client-submitted prices.
export function orderMessage(storeName: string, o: OrderLike, customerName: string) {
  const lines = o.items.map((i, n) =>
    `${n + 1}. ${[i.brand_name, i.product_name].filter(Boolean).join(' - ')}${i.variant_label ? ` (${i.variant_label})` : ''}` +
    `${i.is_preorder ? ' [PREORDER]' : ''}\n   ${i.quantity} x ${ghs(i.unit_price)} = ${ghs(i.line_total)}`);
  return [
    `Hello ${storeName}, I would like to place an order.`,
    `Order reference: ${o.reference}`,
    customerName ? `Name: ${customerName}` : '',
    '', ...lines, '',
    `Total: ${ghs(o.total)}`,
    o.has_preorder ? 'Note: this order includes preorder items.' : '',
    '', 'Please confirm availability and payment details.',
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n');
}
