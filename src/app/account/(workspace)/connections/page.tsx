import { accountActor } from '@/lib/account-data';
import { readStrava } from '@/lib/strava-store';
import { MarketplaceError } from '@/lib/marketplace-config';
import { StravaCoachSharing } from '@/components/StravaCoachSharing';
import { StravaConnection } from '@/components/StravaConnection';
export const metadata = { title: 'Strava connection | Anystride' };
export default async function ConnectionsPage({ searchParams }: { searchParams: Promise<{ strava?: string }> }) {
  const actor = await accountActor();
  const { strava } = await searchParams;
  let initial;
  try { initial = await readStrava(actor); }
  catch (error) { return <><h1 className="text-3xl font-semibold">Strava connection</h1><p role="alert" className="mt-4">{error instanceof MarketplaceError ? error.message : 'Connections are temporarily unavailable. Please try again shortly.'}</p><StravaCoachSharing /></>; }
  return <StravaConnection initial={initial} outcome={strava} />;
}
