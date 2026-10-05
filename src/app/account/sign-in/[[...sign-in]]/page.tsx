import Link from "next/link";
import { AccountSignIn } from "@/components/AccountSignIn";
import { marketplaceEnabled } from "@/lib/marketplace-config";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { checkoutReturnPath } from "@/lib/account-return";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  const next = checkoutReturnPath((await searchParams).next);
  const applying = next === "/account/services";
  const purchasing = next.startsWith("/account/checkout/");
  return <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
    <section>
      <p className="mb-4 text-sm font-semibold text-brand">Your Anystride account</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{applying ? "Let’s get back to your coaching." : purchasing ? "Your next step starts here." : "Welcome back. Keep moving forward."}</h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">{applying ? "Sign in to continue your application and build a home for your coaching services." : purchasing ? "Sign in to purchase your selected coaching service and keep everything together in your account." : "Your coaching, all in one place. Pick up where you left off."}</p>
      {!applying && !purchasing && <dl className="mt-8 hidden space-y-6 lg:block">
        <div><dt className="font-semibold">For runners</dt><dd className="mt-2 text-sm leading-relaxed text-muted-foreground">Find your purchases and the next steps from your coach.</dd></div>
        <div><dt className="font-semibold">For coaches</dt><dd className="mt-2 text-sm leading-relaxed text-muted-foreground">Manage your profile, services and sales.</dd></div>
      </dl>}
      <p className="mt-8 text-sm text-muted-foreground">Just here for a training plan? <Link href="/plans" className="underline underline-offset-4 hover:text-brand">Browse free plans</Link>. No account needed.</p>
    </section>
    <section aria-labelledby="signin-heading" className="min-w-0 rounded-2xl border border-border bg-muted p-6 sm:p-8">
      <h2 id="signin-heading" className="mb-4 text-2xl font-semibold">Sign in with email</h2>
      <AccountSignIn next={next} />
    </section>
  </div>;
}
