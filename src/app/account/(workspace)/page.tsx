import Link from "next/link";
import { CoachProfileMergeNotice } from "@/components/CoachProfileMergeNotice";
import { accountActor, accountCoach, accountView } from "@/lib/account-data";
import { AccountHeading, AccountStatus } from "@/components/AccountUI";
import { trainingEnabled } from "@/lib/training-access";

const textLink = "inline-flex min-h-12 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export default async function AccountPage() {
  const [actor, coach, view] = await Promise.all([accountActor(), accountCoach(), accountView()]);
  const approved = coach?.status === "approved";
  const training = trainingEnabled();
  if (view === "coach") return <>
    <AccountHeading title={approved ? "Your coaching workspace" : "Set up your coaching"}>{approved ? "Manage your athletes, build their training and run your coaching business." : "Introduce your coaching and prepare your profile. Athlete tools become available after approval."}</AccountHeading>
    <CoachProfileMergeNotice actor={actor} />
    {!approved && <section aria-labelledby="coach-setup-heading" className="rounded-xl bg-muted p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-4"><h2 id="coach-setup-heading" className="text-2xl font-semibold">{coach?.status === "pending" ? "Prepare your profile while we review" : coach ? "Your application needs attention" : "Start with your coaching introduction"}</h2>{coach && <AccountStatus status={coach.status} />}</div>
      <p className="mt-4 max-w-xl text-muted-foreground">{coach?.status === "pending" ? "Save your introduction and preview your profile privately. You can publish, invite athletes and build plans after approval." : coach ? "Open your application to review its status and the available next steps." : "Tell us who you coach and share your experience. Your application is reviewed before your profile appears in the directory."}</p>
      <Link href={coach?.status === "pending" ? "/account/storefront" : "/account/services"} prefetch={false} className="action-primary mt-6">{coach?.status === "pending" ? "Prepare my profile →" : coach ? "View application →" : "Start coach application →"}</Link>
      {coach?.status === "pending" && <Link href="/account/services" prefetch={false} className={`${textLink} ml-6`}>View application</Link>}
    </section>}
    {approved && <>
      {training && <section aria-labelledby="athlete-heading" className="rounded-xl bg-muted p-6 sm:p-8">
        <h2 id="athlete-heading" className="text-3xl font-semibold tracking-tight">Your athletes and their next week</h2>
        <p className="mt-4 max-w-xl text-muted-foreground">Create an invitation, copy its message and send it to your athlete. Once they accept, open their calendar to add workouts or assign a plan.</p>
        <Link href="/account/athletes" prefetch={false} className="action-primary mt-6">Open my athletes →</Link>
        <Link href="/account/plans" prefetch={false} className={`${textLink} ml-6`}>Build a training plan</Link>
        <p className="mt-4 text-sm text-muted-foreground">A storefront, payouts and Strava are optional for planning training.</p>
      </section>}
      <section aria-labelledby="business-heading" className="mt-8">
        <h2 id="business-heading" className="text-xl font-semibold">Your coaching business</h2>
        <p className="mt-2 text-sm text-muted-foreground">Prepare your public profile, manage your offers and review client purchases.</p>
        <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
          <li><Link href="/account/storefront" prefetch={false} className={textLink}>Profile & payout setup</Link></li>
          <li><Link href="/account/services" prefetch={false} className={textLink}>Services & enquiries</Link></li>
          <li><Link href="/account/orders" prefetch={false} className={textLink}>My sales</Link></li>
        </ul>
      </section>
    </>}
    {actor.admin && <section aria-labelledby="review-heading" className="mt-8 border-t border-border pt-8"><h2 id="review-heading" className="text-lg font-semibold">Administration</h2><Link href="/account/review" prefetch={false} className={`${textLink} mt-2`}>Open admin reviews →</Link></section>}
  </>;
  return <>
    <AccountHeading title="Your running">Follow your training, stay in touch with your coach and record how each run went.</AccountHeading>
    {training ? <>
      <div className="grid gap-4 md:grid-cols-3">
        <section aria-labelledby="calendar-heading" className="rounded-xl bg-muted p-6 sm:p-8 md:col-span-2">
          <h2 id="calendar-heading" className="text-3xl font-semibold tracking-tight">Your training calendar</h2>
          <p className="mt-4 max-w-lg text-muted-foreground">See your planned workouts and completed runs. Training assigned by your coach appears here.</p>
          <Link href="/account/training" prefetch={false} className="action-primary mt-6">Open my calendar →</Link>
        </section>
        <section aria-labelledby="strava-heading" className="rounded-xl border border-border p-6 sm:p-8">
          <h2 id="strava-heading" className="text-2xl font-semibold">Your activities</h2>
          <p className="mt-4 text-sm text-muted-foreground">Connect Strava and choose which coaches can see your synced activities.</p>
          <Link href="/account/connections" prefetch={false} className={`${textLink} mt-4`}>Manage Strava →</Link>
          <p className="mt-4 text-xs text-muted-foreground">Sharing is off until you enable it.</p>
        </section>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2"><Link href="/account/athletes" prefetch={false} className={textLink}>My coaches & invitations →</Link><Link href="/plans" className={textLink}>Browse free plans →</Link></div>
    </> : <section className="rounded-xl bg-muted p-6 sm:p-8"><h2 className="text-2xl font-semibold">Find your next training plan</h2><p className="mt-4 text-muted-foreground">Browse free running plans and find a coach for your next goal.</p><Link href="/plans" className={`${textLink} mt-4`}>Browse training plans →</Link></section>}
    <section aria-labelledby="coaching-heading" className="mt-8 border-t border-border pt-8">
      <h2 id="coaching-heading" className="text-xl font-semibold">Your coaching</h2>
      <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
        <li><Link href="/account/coaching" prefetch={false} className={textLink}>My coaching requests</Link></li>
        <li><Link href="/account/orders" prefetch={false} className={textLink}>My purchases</Link></li>
        <li><Link href="/account/explore" prefetch={false} className={textLink}>Find a coach</Link></li>
      </ul>
    </section>
  </>;
}
