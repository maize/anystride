"use client";

export default function AccountError({ retry }: { retry: () => void }) {
  return <section role="alert">
    <h1 className="text-3xl font-semibold">Your account could not be loaded</h1>
    <p className="mt-4 max-w-2xl text-muted-foreground">We could not retrieve your account information. Please try again. This does not mean your requests or services have been removed.</p>
    <button onClick={retry} className="mt-6 rounded-lg bg-foreground px-4 py-2 font-semibold text-background hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Try again</button>
    <p className="mt-4 text-sm text-muted-foreground">Still having trouble? <a href="mailto:hello@anystride.com" className="underline">Contact Anystride</a>.</p>
  </section>;
}
