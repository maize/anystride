import { accountActor } from '@/lib/account-data';
import { trainingReference } from '@/lib/training-input';
import { CoachStravaActivities } from '@/components/CoachStravaActivities';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Shared Strava activities | Anystride' };
export default async function CoachActivitiesPage({ params }: { params: Promise<{ relationship: string }> }) {
  await accountActor();
  const { relationship } = await params;
  try { trainingReference(relationship); } catch { notFound(); }
  return <CoachStravaActivities key={relationship} relationship={relationship} />;
}
