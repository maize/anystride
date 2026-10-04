import Link from "next/link";
import { accountActor, accountData } from "@/lib/account-data";
import { ownStorefront } from "@/lib/storefront-store";
import { storefrontSellerStatus } from "@/lib/storefront-payments";
import { AccountEmpty, AccountHeading, AccountStatus, accountPrice } from "@/components/AccountUI";
import { StorefrontForm, StorefrontActionButton } from "@/components/StorefrontForm";
import { StorefrontProfileFields, StorefrontOfferFields } from "@/components/StorefrontFields";

export default async function StorefrontEditor() {
  const [actor,data] = await Promise.all([accountActor(),accountData()]);
  if (data.coach?.status !== "approved") return <AccountEmpty title="Your storefront starts with your coach profile" href="/account/services" action="Open coach application">Once your application is approved, you can publish a public profile and sell your coaching services.</AccountEmpty>;
  const [{ profile,offers }, seller] = await Promise.all([ownStorefront(actor),storefrontSellerStatus(actor).catch(() => null)]);
  return <>
    <AccountHeading title="Your coaching, your storefront">A public profile you can share. Services your next client can choose and buy.</AccountHeading>
    <nav aria-label="Storefront editor" className="mb-8 flex flex-wrap gap-6 text-sm font-semibold"><a href="#profile" className="hover:text-brand">My profile</a><a href="#offers" className="hover:text-brand">Services</a><a href="#payments" className="hover:text-brand">Payments</a><Link href="/account/orders" className="hover:text-brand">Orders & earnings</Link>{profile && <a href="/account/storefront/preview" className="text-brand">Preview profile ↗</a>}</nav>
    {profile?.published && <div className="mb-8 rounded-xl bg-muted p-6"><p className="text-sm font-semibold">Your public profile</p><a href={`/coaching/with/${profile.slug}`} className="action-link break-all">/coaching/with/{profile.slug} <span aria-hidden="true">↗</span></a></div>}
    <section id="profile" className="scroll-mt-8"><h2 className="mb-6 text-2xl font-semibold">Make it yours.</h2><StorefrontForm key={profile?.version ?? 0} action="profile" fields={{ version: profile?.version ?? 0 }} button="Save my profile"><StorefrontProfileFields profile={profile} /></StorefrontForm></section>
    <section id="offers" className="mt-12 scroll-mt-8 border-t border-border pt-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-semibold">Your services</h2><p className="text-sm text-muted-foreground">{offers.length} of 10 offers</p></div>
      <p className="mb-8 max-w-2xl text-sm text-muted-foreground">Each offer has a clear price, delivery details and purchase instructions. New offers and edits go through review before appearing on your profile.</p>
      <div className="space-y-4">{offers.map((offer) => <details key={`${offer.id}:${offer.version}`} className="rounded-xl border border-border p-6"><summary className="cursor-pointer"><span className="text-lg font-semibold">{offer.title}</span><span className="ml-4 text-sm text-muted-foreground">{accountPrice(offer.amount,offer.currency)}</span><span className="ml-4"><AccountStatus status={offer.status} /></span></summary><div className="mt-8">{offer.status === "suspended" ? <p>This offer is suspended. Contact Anystride for help.</p> : <StorefrontForm action="offer" fields={{ id: offer.id,version: offer.version }} button="Save and send for review"><StorefrontOfferFields offer={offer} /></StorefrontForm>}</div></details>)}</div>
      {offers.length < 10 && <details key={offers.map((o) => o.id).join(":")} open={!offers.length} className="mt-6 rounded-xl bg-muted p-6"><summary className="cursor-pointer text-lg font-semibold">+ Create a service</summary><div className="mt-8"><StorefrontForm action="offer" fields={{ version: 0 }} button="Send service for review"><StorefrontOfferFields /></StorefrontForm></div></details>}
    </section>
    <section id="payments" className="mt-12 scroll-mt-8 border-t border-border pt-8"><h2 className="text-2xl font-semibold">Get ready to get paid.</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">Connect your payout account to accept purchases. Stripe collects your business and bank details securely.</p>
      {seller?.mode === "test" && <p className="mt-4 text-sm font-semibold text-brand">Test mode · payments do not purchase real services.</p>}
      <div className="mt-6">{!seller ? <p role="alert" className="text-sm">We couldn’t check your payout account. Reload to try again.</p> : seller.mode === "off" ? <p className="text-sm text-muted-foreground">Payments are not enabled yet. You can prepare and publish your profile while setup is completed.</p> : <><p className="mb-4 text-sm">{seller.ready ? "Your account is ready to accept payments." : "Complete your payout details before clients can buy."}</p><StorefrontActionButton action="payouts">{seller.connected ? "Manage payout details" : "Set up payouts"}</StorefrontActionButton></>}</div>
    </section>
  </>;
}
