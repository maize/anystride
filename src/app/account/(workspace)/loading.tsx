export default function WorkspaceLoading() {
  return <div role="status" className="min-h-64 space-y-6">
    <span className="sr-only">Loading your account page…</span>
    <div aria-hidden="true" className="space-y-6 motion-safe:animate-pulse">
      <div className="h-8 w-56 max-w-full rounded-lg bg-muted" />
      <div className="h-4 w-96 max-w-full rounded-lg bg-muted" />
      <div className="h-40 rounded-xl border border-border bg-muted/40" />
    </div>
  </div>;
}
