import { AccountSignIn } from "@/components/AccountSignIn";
import { marketplaceEnabled } from "@/lib/marketplace-config";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { checkoutReturnPath } from "@/lib/account-return";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  const next = checkoutReturnPath((await searchParams).next);
  return <><h1 className="mb-8 text-3xl font-semibold">{next === "/account" ? "Sign in to your coaching account" : "Sign in to continue your purchase"}</h1><AccountSignIn next={next} /></>;
}
