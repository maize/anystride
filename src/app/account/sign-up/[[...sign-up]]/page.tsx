import { AccountSignIn } from "@/components/AccountSignIn";
import { marketplaceEnabled } from "@/lib/marketplace-config";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { checkoutReturnPath } from "@/lib/account-return";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  const next = checkoutReturnPath((await searchParams).next);
  return <><h1 className="mb-4 text-3xl font-semibold">Create your coaching account</h1><p className="mb-8 text-muted-foreground">Save your purchases, connect with your coach, or offer your own services. Creating an account doesn’t charge you.</p><AccountSignIn createAccount next={next} /></>;
}
