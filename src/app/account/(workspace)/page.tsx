import Link from "next/link";
import { accountActor, accountCoach } from "@/lib/account-data";
import { AccountHeading, AccountStatus } from "@/components/AccountUI";
import { trainingEnabled } from "@/lib/training-access";

const taskLink = "group block rounded-xl p-6 transition-colors duration-200 ease-stride hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-8";
const textLink = "inline-flex min-h-12 items-center text-sm font-semibold text-brand underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export default async function AccountPage() {
  const [actor, coach] = await Promise.all([accountActor(), accountCoach()]);
  const approved = coach?.status === "approved";
  const training = trainingEnabled();
  return <>
    <AccountHeading title={approved ? "Your training & athletes" : "Your training"}>
      {approved ? "Open an athlete’s calendar, build a plan, or check your own training." : "Open your calendar, manage your coaching and connect your activities."}
    </AccountHeading>

    {approved && training && <section aria-labelledby="coach-start-heading" className="mb-8 rounded-xl bg-muted p-6 sm:p-8">
      <p className="text-sm font-semibold text-brand">Coach workspace</p>
      <h2 id="coach-start-heading" className="mt-2 text-2xl font-semibold">Start with an athlete and their first week</h2>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground">Create an invitation, copy the message and send it to your athlete. Once they accept, open their calendar to add a workout or assign a plan. You can prepare plans while you wait.</p>
      <Link href="/account/athletes" prefetch={false} className="action-primary mt-6">Manage athlete invitations →</Link>
      <Link href="/account/plans" prefetch={false} className={`${textLink} ml-6`}>Build a training plan</Link>
      <p className="mt-4 text-sm text-muted-foreground">No storefront, payment setup or Strava connection is needed to plan training.</p>
    </section>}

    {coach?.status === "pending" && <section aria-labelledby="coach-setup-heading" className="mb-8 rounded-xl bg-muted p-6 sm:p-8">
      <p className="text-sm font-semibold text-brand">Coach application under review</p>
      <h2 id="coach-setup-heading" className="mt-2 text-2xl font-semibold">Prepare your profile while you wait</h2>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground">Save your coaching introduction and preview your profile privately. After approval, you can publish it, invite athletes and build training plans.</p>
      <Link href="/account/storefront" prefetch={false} className="action-primary mt-6">Continue profile setup →</Link>
      <Link href="/account/services" prefetch={false} className={`${textLink} ml-6`}>View application</Link>
    </section>}

    {training ? <>
      <div className="grid gap-4 md:grid-cols-3">
        <section aria-labelledby="calendar-heading" className="rounded-xl bg-muted p-6 sm:p-8 md:col-span-2">
          <p className="text-sm font-medium text-muted-foreground">For your running</p>
          <h2 id="calendar-heading" className="mt-2 text-3xl font-semibold tracking-tight">Training calendar</h2>
          <p className="mt-4 max-w-lg text-muted-foreground">See your planned workouts and completed runs. Add a session, record how it went, or match a Strava activity to a workout.</p>
          <Link href="/account/training" prefetch={false} className="action-primary mt-6 px-3 py-2">Open my calendar <span aria-hidden="true">→</span></Link>
          <p className="mt-4 text-sm text-muted-foreground">Workouts and plans assigned by your coach appear here.</p>
        </section>
        <section aria-labelledby="strava-heading" className="flex flex-col rounded-xl border border-border p-6 sm:p-8">
          <p className="text-sm font-medium text-muted-foreground">Your activities</p>
          <h2 id="strava-heading" className="mt-2 text-2xl font-semibold tracking-tight">Strava connection</h2>
          <p className="mt-4 text-sm text-muted-foreground">Connect or refresh Strava, check your sync status and choose which coaches can see your activities.</p>
          <Link href="/account/connections" prefetch={false} className={`${textLink} mt-4`}>Manage Strava <span aria-hidden="true" className="ml-2">→</span></Link>
          <p className="mt-auto pt-4 text-xs text-muted-foreground">Sharing with a coach is off until you enable it.</p>
        </section>
      </div>

      <section aria-labelledby="training-tools-heading" className="mt-8">
        <h2 id="training-tools-heading" className="text-xl font-semibold">{approved ? "Coach tools" : "Coaches & plans"}</h2>
        <div className="mt-4 grid divide-y divide-border border-y border-border md:grid-cols-2 md:divide-x md:divide-y-0">
          <Link href="/account/athletes" prefetch={false} className={taskLink}>
            <h3 className="text-2xl font-semibold tracking-tight group-hover:text-brand">{approved ? "Athletes" : "My coaches"} <span aria-hidden="true">→</span></h3>
            <p className="mt-3 text-sm text-muted-foreground">{approved ? "Invite athletes, open their calendars and assign workouts. Your own coach invitations are here too." : "Accept a coach’s invitation or manage who can access your training calendar."}</p>
          </Link>
          <Link href={approved ? "/account/plans" : "/plans"} prefetch={false} className={taskLink}>
            <h3 className="text-2xl font-semibold tracking-tight group-hover:text-brand">{approved ? "Training plans" : "Free training plans"} <span aria-hidden="true">→</span></h3>
            <p className="mt-3 text-sm text-muted-foreground">{approved ? "Build multiweek plans, reuse structured workouts and assign a plan to your athletes." : "Browse running plans from 5K to the marathon. Plans your coach assigns are already in your calendar."}</p>
          </Link>
        </div>
      </section>
    </> : <section className="rounded-xl bg-muted p-6 sm:p-8">
      <h2 className="text-2xl font-semibold">Free training plans</h2>
      <p className="mt-3 text-muted-foreground">The saved training workspace is not open yet. You can still browse running plans and find a coach.</p>
      <Link href="/plans" className={`${textLink} mt-4`}>Browse training plans →</Link>
    </section>}

    <section aria-labelledby="coaching-account-heading" className="mt-8">
      <h2 id="coaching-account-heading" className="text-xl font-semibold">{approved ? "Coaching business" : "Coaching & purchases"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{approved ? "Manage your services and sales separately from your athletes’ training." : "Find a coach, check replies to your enquiries or view an order."}</p>
      <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-2">
        {approved ? <>
          <li><Link href="/account/services" prefetch={false} className={textLink}>Services & enquiries</Link></li>
          <li><Link href="/account/storefront" prefetch={false} className={textLink}>My storefront</Link></li>
          <li><Link href="/account/orders" prefetch={false} className={textLink}>Purchases & sales</Link></li>
          <li><Link href="/account/coaching" prefetch={false} className={textLink}>My coaching requests</Link></li>
          <li><Link href="/account/explore" prefetch={false} className={textLink}>Find coaching</Link></li>
        </> : <>
          <li><Link href="/account/explore" prefetch={false} className={textLink}>Find coaching</Link></li>
          <li><Link href="/account/coaching" prefetch={false} className={textLink}>My coaching requests</Link></li>
          <li><Link href="/account/orders" prefetch={false} className={textLink}>My purchases</Link></li>
        </>}
      </ul>
    </section>

    {!approved && <section aria-labelledby="coach-application-heading" className="mt-8 border-t border-border pt-8">
      <div className="flex flex-wrap items-center gap-4"><h2 id="coach-application-heading" className="text-xl font-semibold">{coach ? "Your coach application" : "Do you coach runners?"}</h2>{coach && <AccountStatus status={coach.status} />}</div>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{coach?.status === "pending" ? "Your application is awaiting review. Once approved, you can invite athletes and build training plans. Your own training calendar is available now." : coach ? "Open your application to review its status. Athlete management and plan building are available to approved coaches." : "Apply for a coach account to manage athletes, build training plans and offer coaching services."}</p>
      <Link href="/account/services" prefetch={false} className={`${textLink} mt-2`}>{coach ? "View my application" : "Apply as a coach"} <span aria-hidden="true" className="ml-2">→</span></Link>
    </section>}
    {actor.admin && <section aria-labelledby="review-heading" className="mt-8 border-t border-border pt-8"><h2 id="review-heading" className="text-lg font-semibold">Administration</h2><Link href="/account/review" prefetch={false} className={`${textLink} mt-2`}>Open admin reviews <span aria-hidden="true" className="ml-2">→</span></Link></section>}
  </>;
}
