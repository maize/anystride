"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const button = "rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors duration-200 ease-stride hover:border-brand hover:text-brand active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50";

export function DeleteServiceButton({ id, version, title }: { id: string; version: number; title: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const busy = useRef(false);
  const status = useRef<HTMLParagraphElement>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  useEffect(() => {
    if (confirming) confirmButton.current?.focus();
    else if (returnFocus.current) { trigger.current?.focus(); returnFocus.current = false; }
  }, [confirming]);
  useEffect(() => { if (message) status.current?.focus(); }, [message]);

  async function remove() {
    if (busy.current) return;
    busy.current = true; setPending(true); setFailed(false); setMessage("");
    try {
      const response = await fetch("/api/marketplace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-service", id, version }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || result.saved !== true) throw new Error(result.error || "We couldn’t delete this service. Please try again.");
      setDeleted(true); setConfirming(false); setMessage("Service deleted."); router.refresh();
    } catch (error) {
      setFailed(true); setMessage(error instanceof Error && error.name === "Error" ? error.message : "We couldn’t confirm deletion. Please try again; your existing purchases are safe.");
    } finally { busy.current = false; setPending(false); }
  }

  return <div className="mt-4" aria-busy={pending}>
    {!deleted && (confirming ? <div className="rounded-xl bg-muted p-4">
      <p className="text-sm font-semibold">Delete “{title}”?</p>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">This removes it from your services and public listings. Existing purchases, enquiries and any checkout already opened are kept. You cannot restore this service.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button ref={confirmButton} type="button" disabled={pending} className={button} onClick={() => void remove()}>{pending ? "Deleting…" : "Confirm deletion"}</button>
        <button type="button" disabled={pending} className={button} onClick={() => { returnFocus.current = true; setConfirming(false); setMessage(""); }}>Keep service</button>
      </div>
    </div> : <button ref={trigger} type="button" className={button} onClick={() => setConfirming(true)} aria-label={`Delete service: ${title}`}>Delete service</button>)}
    <p ref={status} tabIndex={-1} role={failed ? "alert" : "status"} className="mt-2 text-sm text-muted-foreground">{message}</p>
  </div>;
}
