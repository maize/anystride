export default function LoadingAccount() {
  return <div role="status" aria-label="Loading your account" className="space-y-8"><div className="h-8 w-48 rounded-lg bg-muted" /><div className="h-4 w-64 max-w-full rounded-lg bg-muted" /><div className="h-48 rounded-xl bg-muted" /><span className="sr-only">Loading your account…</span></div>;
}
