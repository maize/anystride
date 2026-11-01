import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSignIn } from "@/components/AccountSignIn";
import { AccountEntryChoice } from "@/components/AccountEntryChoice";
import { requireMarketplaceActor } from "@/lib/marketplace-auth";
import { marketplaceEnabled, MarketplaceError } from "@/lib/marketplace-config";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { checkoutReturnPath } from "@/lib/account-return";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  const query = await searchParams;
  const next = checkoutReturnPath(query.next);
  if (query.as === "coach" || next === "/account/coach" || next.startsWith("/account/services")) redirect(`/coaching/apply${next.includes("?claim=") ? `?claim=${next.split("?claim=")[1]}` : ""}`);
  let actor;
  try { actor = await requireMarketplaceActor(); }
  catch (error) { if (!(error instanceof MarketplaceError) || error.status !== 401) throw error; }
  const purchasing = next.startsWith("/account/checkout/");
  const invited = next === "/account/athletes";
  const choosing = !purchasing && !invited && next !== "/account/runner" && !["runner", "athlete"].includes(query.as ?? "");
  if (actor) redirect(choosing ? "/account" : `/account/runner${next === "/account" || next === "/account/runner" ? "" : `?next=${encodeURIComponent(next)}`}`);
  if (choosing) return <AccountEntryChoice />;
  return <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
    <section>
      <p className="mb-4 text-sm font-semibold text-brand">Runner account</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{invited ? "Connect with your coach." : purchasing ? "Your coach is one step closer." : "Your running, in one place."}</h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">{invited ? "Use the email address your coach invited. After verifying your email, review the invitation and choose whether to share your calendar." : purchasing ? "Sign up or sign in to continue with your selected coaching service. Your selection is saved." : "Open your training calendar, follow your coach’s plan and keep your coaching purchases together."}</p>
      <Link href="/coaching/apply" className="mt-6 inline-flex min-h-12 items-center text-sm font-semibold text-brand underline underline-offset-4">Looking to manage athletes? Use coach sign in →</Link>
    </section>
    <section aria-labelledby="signin-heading" className="min-w-0 rounded-2xl border border-border bg-muted p-6 sm:p-8">
      <h2 id="signin-heading" className="mb-4 text-2xl font-semibold">Continue with email</h2>
      <AccountSignIn unified next={next === "/account" ? "/account/runner" : next} />
    </section>
  </div>;
}
