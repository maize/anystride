import Link from "next/link";

export function AccountUnavailable() {
  return <>
    <Link href="/coaching" className="text-sm text-muted-foreground hover:text-brand">← Back to coaching</Link>
    <p className="mt-8 text-sm font-semibold text-brand">Coaching marketplace · in preparation</p>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">A place for your coaching.</h1>
    <p className="mt-4 max-w-xl text-lg text-muted-foreground text-pretty">Coach applications, service proposals and runner requests will live here. Accounts and payments are not open yet.</p>
    <p className="mt-4 text-sm text-muted-foreground">You can still browse the directory or tell us about your coaching business. All training plans remain free, with no account required.</p>
    <Link href="/partners" className="mt-8 inline-block rounded-lg bg-foreground px-3 py-2 text-base font-semibold text-background hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">Register coaching interest</Link>
  </>;
}
