"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const subscribe = () => () => {};

export function SandboxCoachingForm({ requestId, action }: { requestId: string; action: "checkout" | "message" }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const busy = useRef(false);
  const attempt = useRef({ body: "", id: "" });
  const status = useRef<HTMLParagraphElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    const text = String(new FormData(form).get("body") ?? "").trim();
    const body: Record<string, string> = { action, requestId };
    if (action === "message") {
      if (attempt.current.body !== text || !attempt.current.id) attempt.current = { body: text, id: crypto.randomUUID() };
      Object.assign(body, { id: attempt.current.id, body: text });
    }
    busy.current = true; setPending(true); setMessage("");
    try {
      const response = await fetch("/api/marketplace/sandbox", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The sandbox request could not be completed.");
      if (action === "checkout") {
        if (result.testMode !== true || typeof result.url !== "string" || new URL(result.url).origin !== "https://checkout.stripe.com") throw new Error("Unexpected checkout response.");
        window.location.assign(result.url);
      } else {
        if (result.saved !== true) throw new Error("The message could not be saved.");
        form.reset(); attempt.current = { body: "", id: "" }; setMessage("Message saved."); router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "The request timed out. Retry with this form to reuse the same reference.");
    } finally { busy.current = false; setPending(false); status.current?.focus(); }
  }
  return <form onSubmit={submit} method="post" action="/api/marketplace/sandbox" className="space-y-4">
    <fieldset disabled={!hydrated || pending} className="space-y-4">
      {action === "message" && <label className="block text-sm font-medium">Message<textarea name="body" required maxLength={2000} rows={4} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-base focus:outline-2 focus:outline-brand" /></label>}
      <button className="rounded-lg bg-foreground px-4 py-2 font-semibold text-background hover:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50">{pending ? "Working…" : action === "checkout" ? "Open test checkout" : "Send message"}</button>
    </fieldset>
    <p ref={status} role="status" tabIndex={-1} className="text-sm text-muted-foreground">{message}</p>
    <noscript>Enable JavaScript to use the sandbox coaching tools.</noscript>
  </form>;
}
