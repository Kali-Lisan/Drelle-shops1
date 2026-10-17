import { getCategories } from '@/lib/data';
import { HeaderClient } from './HeaderClient';

export async function Header() {
  const cats = (await getCategories()).filter(c => !c.parent_id);
  return <HeaderClient categories={cats.map(c => ({ name: c.name, slug: c.slug }))} />;
}
