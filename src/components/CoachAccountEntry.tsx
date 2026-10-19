import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSignIn } from "./AccountSignIn";
import { AccountUnavailable } from "./AccountUnavailable";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { marketplaceCoachSummary } from "@/lib/marketplace-store";
import { marketplaceEnabled, MarketplaceError } from "@/lib/marketplace-config";
import { checkoutReturnPath } from "@/lib/account-return";

export async function CoachAccountEntry({ claim = "" }: { claim?: string }) {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  const next = checkoutReturnPath(claim ? `/account/services?claim=${claim}` : "/account/services");
  let actor;
  try { actor = await requireMarketplaceActor(); }
  catch (error) { if (!(error instanceof MarketplaceError) || error.status !== 401) throw error; }
  if (actor) {
    const coach = await marketplaceCoachSummary(actor);
    redirect(coach?.status === "approved" ? "/account" : next);
  }
  return <div className="mx-auto max-w-5xl px-5 py-12">
    <Link href="/coaches" className="action-link">← Back to coaches</Link>
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
      <section><p className="text-sm font-semibold text-brand">For running coaches</p>
        <h1 className="text-hero-gradient mt-4 text-4xl font-semibold tracking-tight">Your coach account</h1>
        <p className="mt-6 max-w-md text-lg text-muted-foreground">Sign up or sign in with your email. New coaches complete a short profile for review. Once approved by Anystride, you’ll be listed under Coaches.</p>
        {claim && <p className="mt-4 text-sm text-muted-foreground">Claiming an existing listing? We’ll include the profile reference in your application so we can verify ownership.</p>}
        <p className="mt-6 text-sm text-muted-foreground">Already a coach here? Use your existing email to open your account.</p>
      </section>
      <section aria-labelledby="coach-email-heading" className="rounded-2xl border border-border bg-muted p-6 sm:p-8">
        <h2 id="coach-email-heading" className="mb-4 text-2xl font-semibold">Sign up or sign in</h2>
        <AccountSignIn unified next={next} />
      </section>
    </div>
  </div>;
}
