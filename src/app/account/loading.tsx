export default function Loading() {
  return <div role="status" aria-label="Loading your coaching account" className="space-y-6 motion-safe:animate-pulse"><div className="h-8 w-64 rounded bg-muted" /><div className="h-20 rounded bg-muted" /><div className="h-48 rounded-xl bg-muted" /><span className="sr-only">Loading your coaching account</span></div>;
}
