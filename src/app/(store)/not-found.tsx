import Link from 'next/link';
export default function NotFound() {
  return (<div className="mx-auto max-w-xl px-4 py-24 text-center"><h1 className="font-luxe text-5xl">Page not found</h1>
    <p className="mt-3 text-neutral-600">That page does not exist or is no longer available.</p>
    <Link href="/shop" className="btn btn-primary mt-8">Continue shopping</Link></div>);
}
