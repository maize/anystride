"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const subscribe = () => () => {};
const button = "w-full rounded-lg bg-foreground px-4 py-4 text-base font-semibold text-background transition-colors duration-200 hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";
const textButton = "font-semibold underline underline-offset-4 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50";

export function AccountSignIn({ createAccount = false, next = "/account" }: { createAccount?: boolean; next?: string }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const busy = useRef(false);
  const status = useRef<HTMLParagraphElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState(false);
  const [email, setEmail] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => { if (message && !pending) status.current?.focus(); }, [message, pending]);
  useEffect(() => { if (editing) emailInput.current?.focus(); }, [editing]);

  async function requestLink() {
    if (busy.current || cooldown > 0) return;
    busy.current = true;
    setPending(true); setFailed(false); setMessage("");
    const address = email.trim();
    setEmail(address);
    try {
      const response = await fetch("/api/marketplace/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: createAccount ? "sign-up" : "sign-in", email: address, ...(next !== "/account" ? { next } : {}) }), signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        if (response.status === 429) {
          setCooldown(60);
          throw new Error("Please wait a minute before requesting another link.");
        }
        throw new Error("We couldn’t request your email. Please try again. Your address has been kept.");
      }
      setSent(true); setEditing(false); setCooldown(60);
      setMessage("Link requested. If this address can receive an account link, it will arrive shortly.");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error && error.name === "Error" ? error.message : "The connection was interrupted. Please try again. Your address has been kept.");
    } finally { busy.current = false; setPending(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestLink();
  }
  const alternate = createAccount ? "/account/sign-in" : "/account/sign-up";
  return <form method="post" action="/api/marketplace/auth" onSubmit={submit} className="space-y-6" aria-busy={pending}>
    {sent ? <div>
      <p className="mb-2 text-sm font-semibold text-brand">One more step</p>
      <h3 className="text-2xl font-semibold">Check your inbox</h3>
      <p className="mt-4 text-sm text-muted-foreground">Link requested for</p>
      <p className="mt-2 break-all font-semibold">{email}</p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Open the latest Anystride email and follow its link in this browser.</p>
    </div> : <fieldset disabled={pending} className="space-y-6">
      <p className="text-muted-foreground">We’ll email you a secure link. No password to remember.</p>
      <label className="block text-sm font-medium" htmlFor="account-email">Email address
        <input ref={emailInput} id="account-email" type="email" name="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoCapitalize="none" spellCheck={false} inputMode="email" required maxLength={254} aria-describedby="email-hint" className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-4 text-base focus:outline-2 focus:outline-brand" />
      </label>
      <p id="email-hint" className="text-sm text-muted-foreground">{createAccount ? "Use an email address you can access on this device." : "Use the email address you signed up with."}</p>
      {createAccount && <p className="text-sm text-muted-foreground">Read our <Link href="/privacy" className="underline">privacy policy</Link> and <Link href="/terms" className="underline">site terms</Link>. This creates an optional account, not a coaching contract or marketing subscription.</p>}
      <button disabled={!hydrated || pending || cooldown > 0} className={button}>{pending ? "Requesting your link…" : cooldown > 0 ? `Try again in ${cooldown}s` : createAccount ? "Email my account link" : "Email my sign in link"}</button>
    </fieldset>}
    <p ref={status} tabIndex={-1} role={failed ? "alert" : "status"} className={`${message ? "rounded-lg bg-background p-4 " : ""}text-sm leading-relaxed ${failed ? "text-foreground" : "text-muted-foreground"}`}>{message}</p>
    {sent && <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">{next === "/account/services" ? "You’ll return to your coach application after verifying your email." : next.startsWith("/account/checkout/") ? "Your selected service is saved. You’ll return to it after signing in." : "The link will take you straight to your account."}</p>
      <div className="space-y-4 border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">No email yet? Check your spam or junk folder.</p>
        <button type="button" disabled={pending || cooldown > 0} className={button} onClick={() => void requestLink()}>{pending ? "Requesting your link…" : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend email link"}</button>
        <button type="button" disabled={pending} className={`text-sm ${textButton}`} onClick={() => { setSent(false); setMessage(""); setFailed(false); setEditing(true); }}>Use a different email</button>
      </div>
    </div>}
    <div className="border-t border-border pt-6 text-sm leading-relaxed">
      <p className="text-muted-foreground">{createAccount ? "Already have an account?" : "New to Anystride?"}</p>
      <Link href={`${alternate}${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`} className={`mt-2 inline-block ${textButton}`}>{createAccount ? "Sign in" : "Create a free account"}</Link>
    </div>
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
