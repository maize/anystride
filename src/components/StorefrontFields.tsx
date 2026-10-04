import { accountInput } from "./AccountUI";
import type { StorefrontProfile, OwnStorefrontOffer } from "@/lib/storefront-store";

export function StorefrontProfileFields({ profile }: { profile: StorefrontProfile | null }) {
  return <>
    <div className="grid gap-6 sm:grid-cols-2"><label className="block text-sm font-medium">Your profile address<div className="mt-2 flex items-center gap-2"><span className="text-muted-foreground">/coaching/with/</span><input name="slug" required minLength={3} maxLength={70} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(profile)} defaultValue={profile?.slug} placeholder="your-name" className={`${accountInput} mt-0 min-w-0`} /></div><span className="mt-2 block text-xs text-muted-foreground">Choose once. This is the link you’ll share with clients.</span></label>
      <label className="block text-sm font-medium">Location & format<input name="location" required minLength={2} maxLength={100} defaultValue={profile?.location} placeholder="Boston · Online worldwide" className={accountInput} /></label></div>
    <label className="block text-sm font-medium">Your introduction<input name="headline" required minLength={10} maxLength={140} defaultValue={profile?.headline} placeholder="Who do you help, and what can you help them achieve?" className={accountInput} /></label>
    <label className="block text-sm font-medium">Portrait image address<input type="url" name="photoUrl" maxLength={1000} defaultValue={profile?.photo_url} placeholder="https://your-site.com/your-photo.jpg" className={accountInput} /><span className="mt-2 block text-xs text-muted-foreground">Use a public HTTPS image you own. Your initials appear until you add a photo.</span></label>
    <label className="block text-sm font-medium">Specialities<textarea name="specialties" required rows={3} defaultValue={profile?.specialties.join("\n")} placeholder={"First marathons\nReturning to running\nBusy schedules"} className={accountInput} /><span className="mt-2 block text-xs text-muted-foreground">One per line, up to six.</span></label>
    <label className="block text-sm font-medium">How you coach<textarea name="approach" required minLength={40} maxLength={3000} rows={6} defaultValue={profile?.approach} placeholder="Describe your approach and what working together feels like." className={accountInput} /></label>
    <label className="flex items-start gap-3 text-sm"><input name="published" type="checkbox" defaultChecked={profile?.published} className="mt-1" /><span><strong>Publish my profile</strong><span className="mt-1 block text-muted-foreground">Your approved coaching name, bio and qualifications appear with this profile. Only approved services are shown publicly.</span></span></label>
  </>;
}

export function StorefrontOfferFields({ offer }: { offer?: OwnStorefrontOffer }) {
  return <>
    <label className="block text-sm font-medium">Service name<input name="title" required minLength={5} maxLength={120} defaultValue={offer?.title} placeholder="Your next marathon, with a coach in your corner" className={accountInput} /></label>
    <label className="block text-sm font-medium">Who it’s for and what they receive<textarea name="description" required minLength={40} maxLength={2000} rows={3} defaultValue={offer?.description} className={accountInput} /></label>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block text-sm font-medium">Service type<select name="kind" defaultValue={offer?.kind ?? "package"} className={accountInput}><option value="package">Coaching package</option><option value="consultation">Consultation</option></select></label>
      <label className="block text-sm font-medium">Total price<input name="price" type="number" required min={1} max={1000} step="0.01" defaultValue={offer ? (offer.amount/100).toFixed(2) : undefined} className={accountInput} /></label>
      <label className="block text-sm font-medium">Currency<select name="currency" defaultValue={offer?.currency ?? "usd"} className={accountInput}><option value="usd">USD</option><option value="eur">EUR</option><option value="gbp">GBP</option></select></label>
      <label className="block text-sm font-medium">Duration in weeks<input name="durationWeeks" type="number" required min={1} max={52} defaultValue={offer?.duration_weeks ?? 1} className={accountInput} /></label>
    </div>
    <p className="text-xs text-muted-foreground">One payment for the complete service. For a consultation, specify the session length below.</p>
    <label className="block text-sm font-medium">What’s included<textarea name="inclusions" required rows={4} defaultValue={offer?.inclusions?.join("\n")} placeholder={"Personal training schedule\nWeekly check-in\nRace preparation call"} className={accountInput} /><span className="mt-2 block text-xs text-muted-foreground">One inclusion per line, up to eight.</span></label>
    <label className="block text-sm font-medium">How it’s delivered<input name="delivery" required minLength={10} maxLength={500} defaultValue={offer?.delivery} placeholder="Online coaching through Final Surge, with a weekly video call." className={accountInput} /></label>
    <label className="block text-sm font-medium">Cancellation & refund policy<textarea name="cancellation" required minLength={20} maxLength={1000} rows={3} defaultValue={offer?.cancellation} placeholder="Explain when a client can cancel and how refunds are handled." className={accountInput} /></label>
    <label className="block text-sm font-medium">Instructions after purchase<textarea name="nextSteps" required minLength={20} maxLength={2000} rows={4} defaultValue={offer?.next_steps} placeholder="Tell your new client exactly how to get started and when you will contact them." className={accountInput} /><span className="mt-2 block text-xs text-muted-foreground">Shown after verified payment, together with your account email address.</span></label>
    <label className="flex items-center gap-3 text-sm"><input name="available" type="checkbox" defaultChecked={offer?.available ?? true} />Accepting purchases for this service</label>
  </>;
}
