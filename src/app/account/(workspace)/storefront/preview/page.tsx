import { accountActor } from "@/lib/account-data";
import { ownStorefront } from "@/lib/storefront-store";
import { CoachStorefront } from "@/components/CoachStorefront";
import { AccountEmpty } from "@/components/AccountUI";

export default async function PreviewPage() {
  const { profile, offers } = await ownStorefront(await accountActor());
  if (!profile) return <AccountEmpty title="Create your profile first" href="/account/storefront" action="Edit my profile">Save your introduction to see your public profile preview.</AccountEmpty>;
  return <CoachStorefront preview storefront={{ profile, offers: offers.filter((offer) => offer.kind && offer.inclusions) }} />;
}
