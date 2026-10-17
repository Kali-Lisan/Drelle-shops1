import { Listing } from '@/components/store/Listing';
export const metadata = { title: 'Search' };
export default async function Search({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  return <Listing sp={sp} basePath="/search" title={q ? `Results for “${q.slice(0, 60)}”` : 'Search'} />;
}
