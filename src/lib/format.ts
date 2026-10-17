export const ghs = (n: number | null | undefined) =>
  n == null ? 'Price on request' : `GHS ${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const slugify = (s: string) =>
  s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';

export const availableStock = (p: { track_inventory: boolean; stock_quantity: number; reserved_quantity: number }) =>
  p.track_inventory ? Math.max(p.stock_quantity - p.reserved_quantity, 0) : null;

export const statusLabel: Record<string, string> = {
  available: 'Available', preorder: 'Preorder', sold_out: 'Sold out',
  pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled',
};
