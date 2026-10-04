"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const subscribe = () => () => {};
const button = "rounded-lg bg-foreground px-3 py-2 font-semibold text-background hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";

export function AccountSignIn({ createAccount = false, next = "/account" }: { createAccount?: boolean; next?: string }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const busy = useRef(false);
  const status = useRef<HTMLParagraphElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    busy.current = true; setPending(true);
    try {
      const response = await fetch("/api/marketplace/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: createAccount ? "sign-up" : "sign-in", email: data.get("email"), ...(next !== "/account" ? { next } : {}) }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("We could not request a sign in email. Wait a minute and try again.");
      setMessage("Check your email. If this address can sign in, you will receive a link. Open it in this browser to continue.");
    } catch { setMessage("We could not request a sign in email. Wait a minute and try again."); }
    finally { busy.current = false; setPending(false); status.current?.focus(); }
  }
  return <form method="post" action="/api/marketplace/auth" onSubmit={submit} className="max-w-md space-y-6">
    <p className="text-muted-foreground">We’ll email you a secure sign in link. No password needed.</p>
    <label className="block text-sm font-medium">Email address<input type="email" name="email" autoComplete="email" required maxLength={254} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-base focus:outline-2 focus:outline-brand" /></label>
    {createAccount && <p className="text-sm text-muted-foreground">Read our <Link href="/privacy" className="underline">privacy policy</Link> and <Link href="/terms" className="underline">site terms</Link>. This creates an optional account, not a coaching contract or marketing subscription.</p>}
    <button disabled={!hydrated || pending} className={button}>{pending ? "Requesting link…" : createAccount ? "Email my account link" : "Email my sign in link"}</button>
    <p ref={status} tabIndex={-1} role="status" className="text-sm text-muted-foreground">{message}</p>
    <p className="text-sm"><Link href={`${createAccount ? "/account/sign-in" : "/account/sign-up"}${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className="underline">{createAccount ? "Already have an account? Sign in" : "New to Anystride coaching? Create an account"}</Link></p>
    <noscript>Enable JavaScript to request a secure sign in link.</noscript>
  </form>;
}

export function AccountSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return <div><button disabled={pending} className="text-sm underline hover:text-brand" onClick={async () => {
    setPending(true); setFailed(false);
    try {
      const response = await fetch("/api/marketplace/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sign-out" }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error();
      router.replace("/account/sign-in");
      router.refresh();
    } catch { setPending(false); setFailed(true); }
  }}>{pending ? "Signing out…" : "Sign out"}</button>{failed && <p role="alert" className="text-sm">Could not sign out. Please try again.</p>}</div>;
}
