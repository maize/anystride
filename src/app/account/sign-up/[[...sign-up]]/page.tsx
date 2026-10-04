import Link from "next/link";
import { AccountSignIn } from "@/components/AccountSignIn";
import { marketplaceEnabled } from "@/lib/marketplace-config";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { checkoutReturnPath } from "@/lib/account-return";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  const query = await searchParams;
  const destination = checkoutReturnPath(query.next);
  const purchasing = destination.startsWith("/account/checkout/");
  const coaching = !purchasing && query.as !== "athlete";
  const next = coaching ? "/account/services" : destination;
  return <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
    <section>
      <p className="mb-4 text-sm font-semibold text-brand">{coaching ? "For independent coaches" : "For your running"}</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{coaching ? "Your coaching. Your own storefront." : purchasing ? "Your coach is one step closer." : "Find support for your next goal."}</h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">{coaching ? "Give runners one place to meet you, explore your services and buy your coaching. Start with a free account and a short application." : "Create a free account to buy coaching, keep your purchase details and get the instructions for getting started."}</p>

      <p className="mt-6 text-sm text-muted-foreground">{coaching ? <>Looking for a coach instead? <Link href="/account/sign-up?as=athlete" className="underline underline-offset-4">Create an athlete account</Link></> : <>Want to sell your coaching? <Link href="/account/sign-up" className="underline underline-offset-4">Apply as a coach</Link></>}</p>
    </section>
    <section aria-labelledby="signup-heading" className="rounded-2xl border border-border bg-muted p-6 sm:p-8">
      <p className="text-sm text-muted-foreground">{coaching ? "Step 1 of 3" : "Your free account"}</p>
      <h2 id="signup-heading" className="mt-2 mb-6 text-2xl font-semibold">{coaching ? "Start with your email" : "Create your account"}</h2>
      <AccountSignIn createAccount next={next} />
      {coaching && <p className="mt-6 border-t border-border pt-6 text-sm text-muted-foreground">Signing up does not publish a profile or connect a bank account. You’ll see the sales commission before setting up payouts.</p>}
    </section>
    {coaching && <ol className="grid gap-8 border-t border-border pt-8 sm:grid-cols-3 lg:col-span-2">
        {[["01", "Verify your email", "A secure email link brings you back to your application. No password to remember."], ["02", "Tell us about your coaching", "Share your approach and experience. An Anystride admin reviews your application before you can publish."], ["03", "Build your storefront", "After approval, add your services and connect payouts. Services are reviewed before they go on sale."]].map(([number,title,detail]) => <li key={number} className="flex gap-4"><span className="text-sm tabular-nums text-brand" aria-hidden="true">{number}</span><div><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p></div></li>)}
      </ol>}
  </div>;
}
