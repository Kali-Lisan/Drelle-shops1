import { Listing } from '@/components/store/Listing';
export const metadata = { title: 'Shop all' };
export default async function Shop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <Listing sp={await searchParams} basePath="/shop" title="Shop all" />;
}
