"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-2xl px-6 py-24"><h1 className="text-3xl font-semibold">This profile is taking a moment.</h1><p className="mt-4 text-muted-foreground">We couldn’t load the coach’s services. Please try again.</p><button onClick={reset} className="action-primary mt-8">Try again</button></div>;
}
