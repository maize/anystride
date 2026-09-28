"use client";

export default function AccountError({ reset }: { reset: () => void }) {
  return <div className="space-y-4"><h1 className="text-3xl font-semibold">Your account could not be loaded</h1><p role="alert">Your saved information has not changed. Try again shortly.</p><button onClick={reset} className="rounded-lg bg-foreground px-3 py-2 font-semibold text-background hover:bg-brand focus-visible:outline-2 focus-visible:outline-brand">Try again</button></div>;
}
