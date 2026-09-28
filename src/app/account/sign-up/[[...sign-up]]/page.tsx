import { AccountSignIn } from "@/components/AccountSignIn";
import { marketplaceEnabled } from "@/lib/marketplace-config";
import { AccountUnavailable } from "@/components/AccountUnavailable";

export default function SignUpPage() {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  return <><h1 className="mb-4 text-3xl font-semibold">Create your coaching account</h1><p className="mb-8 text-muted-foreground">An account lets you request coaching or apply as a coach. Creating one does not approve a listing or purchase a service.</p><AccountSignIn createAccount /></>;
}
