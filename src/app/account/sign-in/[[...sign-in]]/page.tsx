import { AccountSignIn } from "@/components/AccountSignIn";
import { marketplaceEnabled } from "@/lib/marketplace-config";
import { AccountUnavailable } from "@/components/AccountUnavailable";

export default function SignInPage() {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  return <><h1 className="mb-8 text-3xl font-semibold">Sign in to your coaching account</h1><AccountSignIn /></>;
}
