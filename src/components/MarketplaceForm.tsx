"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

const subscribe = () => () => {};
const accountButton = "rounded-lg bg-foreground px-3 py-2 text-base font-semibold text-background transition-colors duration-300 ease-stride hover:bg-brand active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";

/** A stable retry reference lasts for an unchanged payload, never a form reset. */
export function MarketplaceForm({ action, fields = {}, children, button, success }: {
  action: "apply" | "service" | "inquire" | "respond" | "review";
  fields?: Record<string, string | number>;
  children?: ReactNode;
  button: string;
  success: string;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const inFlight = useRef(false);
  const attempt = useRef({ body: "", id: "" });
  const status = useRef<HTMLParagraphElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || saved) return;
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = { action, ...fields, ...Object.fromEntries(data) };
    if (action === "service") {
      const price = String(body.price ?? "");
      if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(price)) {
        setError(true); setMessage("Enter a price with no more than two decimal places."); status.current?.focus(); return;
      }
      const [whole, fraction = ""] = price.split(".");
      body.amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
      body.durationWeeks = Number(body.durationWeeks);
      delete body.price;
    }
    if (action === "inquire") body.shareWithCoach = data.get("shareWithCoach") === "on";
    if (action === "service" || action === "inquire") {
      const fingerprint = JSON.stringify(body);
      if (attempt.current.body !== fingerprint) attempt.current = { body: fingerprint, id: crypto.randomUUID() };
      body.id = attempt.current.id;
    }
    inFlight.current = true;
    setPending(true); setMessage(""); setError(false);
    try {
      const response = await fetch("/api/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || result.saved !== true) throw new Error(result.error || "Your changes could not be saved. Try again.");
      setSaved(true); setMessage(success); router.refresh();
    } catch (cause) {
      setError(true);
      setMessage(cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "The request timed out. Try again with this form; we will check for a duplicate.");
    } finally {
      inFlight.current = false; setPending(false); status.current?.focus();
    }
  }

  return <form method="post" action="/api/marketplace" onSubmit={submit} className="space-y-4">
    <fieldset disabled={pending || saved || !hydrated} className="space-y-4">
      {children}
      <button type="submit" className={accountButton}>{pending ? "Saving…" : saved ? "Saved" : button}</button>
    </fieldset>
    <p ref={status} tabIndex={-1} role={error ? "alert" : "status"} className={`text-sm ${error ? "text-red-700" : "text-muted-foreground"}`}>{message}</p>
    <noscript><p className="text-sm">Enable JavaScript to use your coaching account. Your details will not be sent through a page URL.</p></noscript>
  </form>;
}
