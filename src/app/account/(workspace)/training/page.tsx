import { trainingReference } from "@/lib/training-input";
import { TrainingWorkspace } from "@/components/TrainingWorkspace";
import { accountActor } from "@/lib/account-data";
import { MarketplaceError } from "@/lib/marketplace-config";
import { readTraining, trainingEnabled } from "@/lib/training-store";
import { isTrainingDate, shiftTrainingDate, trainingWeek } from "@/lib/training";

export const metadata = { title: "Your training calendar | Anystride" };

export default async function TrainingPage({ searchParams }: { searchParams: Promise<{ date?: string; athlete?: string }> }) {
  if (!trainingEnabled()) return <><h1 className="text-3xl font-semibold">Your training</h1><p className="mt-4 text-muted-foreground">The saved training workspace is not open yet. Free plans and your local progress remain available in the plan library.</p></>;
  const actor = await accountActor();
  const { date, athlete } = await searchParams;
  const week = trainingWeek(isTrainingDate(date) ? date : new Date().toISOString().slice(0, 10));
  let snapshot;
  let relationshipId;
  try {
    relationshipId = athlete ? trainingReference(athlete) : undefined;
    snapshot = await readTraining(actor, week, shiftTrainingDate(week, 6), relationshipId);
  } catch (error) {
    return <><h1 className="text-3xl font-semibold">Your training</h1><p role="alert" className="mt-4">{error instanceof MarketplaceError ? error.message : "Your training calendar is temporarily unavailable. Please try again shortly."}</p></>;
  }
  return <TrainingWorkspace initial={snapshot} initialWeek={week} relationshipId={relationshipId} />;
}
