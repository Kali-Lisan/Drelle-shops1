export default function Loading() {
  return (<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" aria-busy="true"><div className="skeleton h-10 w-60" />
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i}><div className="skeleton aspect-[4/5]" /><div className="skeleton mt-3 h-4 w-3/4" /></div>)}</div></div>);
}
