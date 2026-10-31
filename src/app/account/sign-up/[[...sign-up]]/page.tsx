import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSignIn } from "@/components/AccountSignIn";
import { marketplaceEnabled } from "@/lib/marketplace-config";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { checkoutReturnPath } from "@/lib/account-return";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string; as?: string }> }) {
  const query = await searchParams;
  const next = checkoutReturnPath(query.next);
  const purchasing = next.startsWith("/account/checkout/");
  const invited = next === "/account/athletes";
  if (!purchasing && !invited && (query.as !== "athlete" || next.startsWith("/account/services"))) {
    redirect(`/coaching/apply${next.includes("?claim=") ? `?claim=${next.split("?claim=")[1]}` : ""}`);
  }
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  return <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-16">
    <section>
      <p className="mb-4 text-sm font-semibold text-brand">For your running</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{invited ? "Connect with your coach." : purchasing ? "Your coach is one step closer." : "Find support for your next goal."}</h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">{invited ? "Use the email address your coach invited. After verifying your email, you can review the invitation and choose whether to share your training calendar." : "Create a free account to buy coaching, keep your purchase details and get the instructions for getting started."}</p>
      <p className="mt-6 text-sm text-muted-foreground">Are you a coach? <Link href="/coaching/apply" className="underline underline-offset-4">Coach sign up or sign in</Link></p>
    </section>
    <section aria-labelledby="signup-heading" className="rounded-2xl border border-border bg-muted p-6 sm:p-8">
      <h2 id="signup-heading" className="mb-6 text-2xl font-semibold">Create your account</h2>
      <AccountSignIn createAccount unified={invited} next={next} />
    </section>
  </div>;
}
