export default function Loading() {
  return <div aria-label="Loading coach profile" role="status" className="mx-auto max-w-6xl animate-pulse px-8 py-16"><div className="grid gap-12 md:grid-cols-[1.5fr_1fr]"><div className="space-y-6"><div className="h-4 w-48 rounded bg-muted" /><div className="h-24 w-3/4 rounded bg-muted" /><div className="h-16 rounded bg-muted" /><div className="h-12 w-48 rounded-full bg-muted" /></div><div className="aspect-[4/5] rounded-2xl bg-muted" /></div><div className="mt-16 h-64 rounded-2xl bg-muted" /><span className="sr-only">Loading coach profile…</span></div>;
}
