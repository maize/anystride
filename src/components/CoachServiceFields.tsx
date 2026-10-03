import { accountInput } from "./AccountUI";
import type { CoachingService } from "@/lib/marketplace-store";

export function CoachServiceFields({ service }: { service?: CoachingService }) {
  return <>
    <label className="block text-sm font-medium">Service title<input name="title" defaultValue={service?.title} required minLength={5} maxLength={120} className={accountInput} /></label>
    <label className="block text-sm font-medium">What athletes receive<textarea name="description" defaultValue={service?.description} required minLength={40} maxLength={2000} rows={4} className={accountInput} /></label>
    <p className="text-sm text-muted-foreground">Describe the training support, how often you will be in contact, and what is included.</p>
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="block text-sm font-medium">Proposed total price<input name="price" type="number" defaultValue={service ? (service.amount / 100).toFixed(2) : undefined} min="1" max="1000" step="0.01" required className={accountInput} /></label>
      <label className="block text-sm font-medium">Currency<select name="currency" defaultValue={service?.currency ?? "usd"} className={accountInput}><option value="usd">USD</option><option value="eur">EUR</option><option value="gbp">GBP</option></select></label>
      <label className="block text-sm font-medium">Duration in weeks<input name="durationWeeks" type="number" defaultValue={service?.duration_weeks} min="1" max="52" step="1" required className={accountInput} /></label>
    </div>
  </>;
}
