"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { trackProductEvent, trackProductEventOnce } from "@/lib/analytics";
import { useFormAbandon } from "@/lib/form-abandon";
import { PROFILE_FIELDS, SERVICE_FIELDS, type ItemCategory } from "@/lib/product-events";

const subscribe = () => () => {};
export const storefrontButton = "action-primary disabled:cursor-not-allowed disabled:opacity-50";

export function StorefrontForm({ action, fields, children, button, previewAfterSave = false, tracking }: { action: "profile" | "offer"; fields: Record<string,string|number>; children: ReactNode; button: string; previewAfterSave?: boolean; tracking?: { step_name: "profile" | "service"; step_number: 1 | 2 } }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const abandon = useFormAbandon({
    event: "coach_storefront_abandon",
    fields: tracking?.step_name === "service" ? SERVICE_FIELDS : PROFILE_FIELDS,
    payload: () => tracking ? { step_name: tracking.step_name, step_number: tracking.step_number } : null,
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const busy = useRef(false);
  const attempt = useRef("");
  const status = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const data = new FormData(event.currentTarget);
    const body: Record<string,unknown> = { ...Object.fromEntries(data), ...fields, action };
    const lines = (name: string) => String(data.get(name) ?? "").split(/\n/).map((line) => line.trim()).filter(Boolean);
    if (action === "profile") { body.specialties = lines("specialties"); body.published = data.get("published") === "on"; }
    else {
      if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(String(data.get("price")))) { setFailed(true); setMessage("Enter a price with no more than two decimal places."); return; }
      const [whole,fraction=""] = String(data.get("price")).split(".");
      body.amount = Number(whole)*100 + Number(fraction.padEnd(2,"0")); delete body.price;
      body.durationWeeks = Number(data.get("durationWeeks")); body.inclusions = lines("inclusions"); body.available = data.get("available") === "on";
      if (!body.id) { attempt.current ||= crypto.randomUUID(); body.id = attempt.current; }
    }
    busy.current = true; setPending(true); setMessage(""); setFailed(false);
    try {
      const response = await fetch("/api/marketplace/storefront", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
      const result = await response.json();
      if (!response.ok || !result.saved) throw new Error(result.error || "We couldn’t save your changes.");
      if (tracking) {
        abandon.markSubmitted();
        trackProductEventOnce(`storefront-step:${tracking.step_name}`, "coach_storefront_step", { step_name: tracking.step_name, step_number: tracking.step_number });
      }
      if (action === "profile" && previewAfterSave) { router.push("/account/storefront/preview"); router.refresh(); return; }
      setSaved(true); setMessage(action === "profile" ? "Profile saved." : "Service saved and sent for review."); router.refresh();
    } catch (error) { setFailed(true); setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "The request timed out. Refresh to check whether it was saved before trying again."); }
    finally { busy.current = false; setPending(false); status.current?.focus(); }
  }
  return <form onSubmit={submit} onFocus={tracking ? (event) => { abandon.onFocus(event); } : undefined} className="space-y-6"><fieldset disabled={!hydrated || pending || saved} className="space-y-6">{children}<button className={storefrontButton}>{pending ? "Saving…" : saved ? "Saved" : button}</button></fieldset><p ref={status} tabIndex={-1} role={failed ? "alert" : "status"} className="text-sm text-muted-foreground">{message}</p><noscript>Enable JavaScript to save your storefront.</noscript></form>;
}

export function StorefrontActionButton({ action, fields = {}, children, commerce }: { action: "checkout" | "payouts" | "dashboard" | "reconcile" | "cancel" | "publication"; fields?: Record<string,string|number|boolean>; children: ReactNode; commerce?: { item_id: string; item_category: ItemCategory; value: number; currency: string } }) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const busy = useRef(false);
  const attempt = useRef("");
  const [pending,setPending] = useState(false);
  const [message,setMessage] = useState("");
  async function run() {
    if (busy.current) return;
    busy.current = true; setPending(true); setMessage("");
    try {
      const body: Record<string,unknown> = { action,...fields };
      if (action === "checkout") {
        const storageKey = `anystride-checkout:${fields.serviceId}:${fields.version}`;
        if (!attempt.current) {
          try { attempt.current = sessionStorage.getItem(storageKey) ?? ""; } catch { /* The durable order also prevents duplicate sessions. */ }
          if (!/^[0-9a-f-]{36}$/.test(attempt.current)) attempt.current = crypto.randomUUID();
          try { sessionStorage.setItem(storageKey, attempt.current); } catch { /* Optional retry convenience. */ }
        }
        body.orderId = attempt.current;
      }
      const response = await fetch("/api/marketplace/storefront", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Please try again.");
      if (action === "checkout" && result.resetAttempt) {
        try { sessionStorage.removeItem(`anystride-checkout:${fields.serviceId}:${fields.version}`); } catch { /* Optional retry convenience. */ }
        attempt.current = "";
      }
      if (result.url) {
        const url = new URL(result.url, window.location.origin);
        if (!((url.origin === window.location.origin && url.pathname.startsWith("/account/orders/")) || ["https://checkout.stripe.com","https://connect.stripe.com"].includes(url.origin))) throw new Error("Could not open the payment page.");
        if (action === "checkout" && url.origin === "https://checkout.stripe.com" && commerce) {
          try { sessionStorage.setItem(`anystride:checkout-started:${commerce.item_id}`, "1"); } catch { /* The order id still dedupes the event. */ }
          trackProductEventOnce(`begin:${String(body.orderId)}`, "begin_checkout", { ...commerce, transaction_id: body.orderId });
        }
        if (action === "payouts" && url.origin === "https://connect.stripe.com") trackProductEventOnce("storefront-step:payouts", "coach_storefront_step", { step_name: "payouts", step_number: 3 });
        window.location.assign(url.href);
      } else {
        if (action === "publication" && fields.published === true) trackProductEvent("coach_storefront_publish");
        setMessage(action === "publication" ? fields.published ? "Profile published." : "Profile is now private." : "Payment status checked.");
        router.refresh();
      }
    } catch (error) { setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "This is taking longer than expected. Try again; your checkout will be reused."); }
    finally { busy.current = false; setPending(false); }
  }
  return <div><button disabled={!hydrated || pending} onClick={run} className={storefrontButton}>{pending ? "Please wait…" : children}</button>{message && <p role="status" className="mt-3 max-w-md text-sm text-muted-foreground">{message}</p>}<noscript>Enable JavaScript to continue.</noscript></div>;
}
