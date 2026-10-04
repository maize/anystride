import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { MarketplaceError, marketplaceEnabled } from "@/lib/marketplace-config";
import { checkoutOffer } from "@/lib/storefront-store";
import { storefrontId } from "@/lib/storefront-input";
import { storefrontPaymentMode } from "@/lib/storefront-payments";
import { StorefrontActionButton } from "@/components/StorefrontForm";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { servicePrice } from "@/components/CoachStorefront";

export default async function CheckoutPage({ params }: { params: Promise<{ serviceId: string }> }) {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  const { serviceId } = await params;
  try { storefrontId(serviceId); } catch { notFound(); }
  const offer = await checkoutOffer(serviceId);
  if (!offer) notFound();
  let actor = null;
  try { actor = await requireMarketplaceActor(); } catch (error) { if (!(error instanceof MarketplaceError) || error.status !== 401) throw error; }
  const mode = storefrontPaymentMode();
  const next = encodeURIComponent(`/account/checkout/${offer.id}`);
  return <>
    <a href={`/coaching/with/${offer.slug}`} className="action-link text-muted-foreground">← Back to {offer.coach_name}</a>
    <div className="mt-8 grid items-start gap-12 md:grid-cols-[1.5fr_1fr]"><section><p className="eyebrow text-brand">Your next step · {offer.coach_name}</p><h1 className="mt-4 text-4xl font-semibold tracking-tight">{offer.title}</h1><p className="mt-6 whitespace-pre-wrap leading-relaxed text-muted-foreground">{offer.description}</p><h2 className="mt-8 text-xl font-semibold">What’s included</h2><ul className="mt-4 space-y-3">{offer.inclusions.map((line) => <li key={line} className="flex gap-3"><span aria-hidden="true" className="text-brand">↗</span>{line}</li>)}</ul><h2 className="mt-8 text-xl font-semibold">How it works</h2><p className="mt-4 whitespace-pre-wrap text-muted-foreground">{offer.delivery}</p><h2 className="mt-8 text-xl font-semibold">Cancellation & refunds</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{offer.cancellation}</p></section>
      <aside aria-label="Purchase summary" className="rounded-2xl bg-muted p-8 md:sticky md:top-8"><p className="eyebrow">{offer.kind === "consultation" ? "Consultation" : `${offer.duration_weeks} week package`}</p><p className="mt-4 text-5xl font-semibold tracking-tighter tabular-nums">{servicePrice(offer.amount,offer.currency)}</p><p className="mt-3 text-sm text-muted-foreground">{offer.currency.toUpperCase()} · one payment · no subscription</p><div className="my-6 border-t border-border" />
        {mode === "test" && <p role="status" className="mb-6 text-sm font-semibold text-brand">Test checkout. No real money or coaching service.</p>}
        {!offer.available ? <p className="text-sm">This service is currently unavailable.</p> : actor?.id === offer.coach_id ? <p className="text-sm">This is your service. Athletes can purchase it from this page.</p> : mode === "off" ? <p className="text-sm text-muted-foreground">Online purchases are opening soon. Please check back here.</p> : !actor ? <><a href={`/account/sign-up?next=${next}`} className="action-primary">Create account to continue ↗</a><p className="mt-4 text-sm">Already a member? <a href={`/account/sign-in?next=${next}`} className="font-semibold underline">Sign in</a></p></> : <StorefrontActionButton action="checkout" fields={{ serviceId:offer.id,version:offer.version }}>Continue to secure payment ↗</StorefrontActionButton>}
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">Review your purchase on Stripe before paying. After payment, your coach’s contact details and getting-started instructions appear in your account. Your account email is shared with this coach so they can deliver your service.</p><p className="mt-4 text-xs text-muted-foreground"><Link href="/terms" className="underline">Site terms</Link> · <Link href="/privacy" className="underline">Privacy</Link></p>
      </aside>
    </div>
  </>;
}
