"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { accountInput } from "./AccountUI";

export function CoachProfileMergeForm({ profile, hasApplication }: { profile: { slug: string; name: string; bio: string[]; experience?: string }; hasApplication: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  const status = useRef<HTMLParagraphElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || saved) return;
    const data = new FormData(event.currentTarget);
    busy.current = true; setPending(true); setError(false); setMessage("");
    try {
      const application = hasApplication ? undefined : { name: data.get("name"), bio: data.get("bio"), credentials: data.get("credentials") };
      const response = await fetch("/api/marketplace/coach-profile-merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: profile.slug, ...(application ? { application } : {}) }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok || result.saved !== true) throw new Error(result.error || "We couldn’t merge this profile. Please try again.");
      setSaved(true); setMessage("Profile linked to your account. Anystride approval is required before your account replaces the imported directory listing."); router.refresh();
    } catch (cause) { setError(true); setMessage(cause instanceof Error && cause.name === "Error" ? cause.message : "We couldn’t confirm the merge. Retry this form to check whether it was saved."); }
    finally { busy.current = false; setPending(false); status.current?.focus(); }
  }
  return <form onSubmit={submit} className="mt-6 space-y-4" aria-busy={pending}>
    <fieldset disabled={pending || saved} className="space-y-4">
      {!hasApplication && <>
        <label className="block text-sm font-medium">Coaching name<input name="name" defaultValue={profile.name.slice(0, 100)} required minLength={2} maxLength={100} className={accountInput} /></label>
        <label className="block text-sm font-medium">Your coaching approach<textarea name="bio" defaultValue={profile.bio.join("\n\n").slice(0, 2000)} required minLength={40} maxLength={2000} rows={4} className={accountInput} /></label>
        <label className="block text-sm font-medium">Experience and qualifications<textarea name="credentials" defaultValue={profile.experience ?? ""} required minLength={10} maxLength={1000} rows={3} className={accountInput} /></label>
      </>}
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1 accent-brand" /><span>This is my coaching profile. Link it to my account and show one directory listing after approval. {hasApplication ? "My existing application, services and purchases will be kept." : "My name, approach and qualifications will be public after review."}</span></label>
      <button type="submit" className="action-primary disabled:cursor-not-allowed disabled:opacity-50">{pending ? "Merging…" : saved ? "Profile linked" : "Merge profile"}</button>
    </fieldset>
    <p ref={status} tabIndex={-1} role={error ? "alert" : "status"} className="text-sm text-muted-foreground">{message}</p>
    <noscript>Enable JavaScript to merge your coach profile.</noscript>
  </form>;
}
