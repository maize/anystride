import { TrainingAthletes } from "@/components/TrainingAthletes";
import { accountActor } from "@/lib/account-data";
import { MarketplaceError } from "@/lib/marketplace-config";
import { readTrainingRoster } from "@/lib/training-coaching-store";
import { readTraining, trainingEnabled } from "@/lib/training-store";
import { shiftTrainingDate, trainingWeek } from "@/lib/training";
export const metadata = { title: "Athletes & coaches | Anystride" };
export default async function AthletesPage() {
  if (!trainingEnabled()) return <p>The saved training workspace is not open yet.</p>;
  const actor = await accountActor();
  const week = trainingWeek(new Date().toISOString().slice(0, 10));
  let roster;
  let library;
  try {
    roster = await readTrainingRoster(actor, week, shiftTrainingDate(week, 6));
    library = roster.isCoach ? (await readTraining(actor, week, shiftTrainingDate(week, 6))).templates : [];
  } catch (error) { return <p role="alert">{error instanceof MarketplaceError ? error.message : "Athletes and coaches are temporarily unavailable. Please try again shortly."}</p>; }
  return <TrainingAthletes initial={roster} library={library} />;
}
