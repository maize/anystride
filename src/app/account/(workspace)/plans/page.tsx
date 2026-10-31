import Link from "next/link";
import { TrainingPlans } from "@/components/TrainingPlans";
import { accountActor, accountCoach } from "@/lib/account-data";
import { MarketplaceError } from "@/lib/marketplace-config";
import { readTrainingPlans } from "@/lib/training-plans-store";
import { readTrainingRoster } from "@/lib/training-coaching-store";
import { readTraining, trainingEnabled } from "@/lib/training-store";
import { shiftTrainingDate, trainingWeek } from "@/lib/training";
export const metadata = { title: "Training plan library | Anystride" };
export default async function PlansPage() {
  if (!trainingEnabled()) return <p>The saved training workspace is not open yet.</p>;
  const actor = await accountActor();
  const coach = await accountCoach();
  if (coach?.status !== "approved") return <><h1 className="text-3xl font-semibold">Training plan library</h1><p className="mt-4 text-muted-foreground">Approved coaches can build and assign multiweek plans here. Workouts your coach assigns appear in <Link href="/account/training" prefetch={false} className="text-brand underline">your training calendar</Link>.</p><Link href="/account/services" className="mt-4 inline-block text-brand underline">Set up your coach profile</Link></>;
  const today = new Date().toISOString().slice(0, 10); const week = trainingWeek(today);
  let library, training, roster;
  try { [library, training, roster] = await Promise.all([readTrainingPlans(actor), readTraining(actor, week, shiftTrainingDate(week, 6)), readTrainingRoster(actor, week, shiftTrainingDate(week, 6))]); }
  catch (e) { return <p role="alert">{e instanceof MarketplaceError ? e.message : "Your plan library is temporarily unavailable. Please try again shortly."}</p>; }
  return <TrainingPlans initial={library} workouts={training.templates} athletes={roster.athletes} today={today} />;
}
