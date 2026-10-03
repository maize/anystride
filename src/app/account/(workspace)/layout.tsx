import { accountActor, accountData } from "@/lib/account-data";
import { marketplaceEnabled, MarketplaceError } from "@/lib/marketplace-config";
import { AccountSignOut } from "@/components/AccountSignIn";
import { AccountUnavailable } from "@/components/AccountUnavailable";
import { AccountNavigation } from "@/components/AccountNavigation";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  if (!marketplaceEnabled()) return <AccountUnavailable />;
  // Redirects from the identity helper must propagate through Next.js.
  let actor;
  try { actor = await accountActor(); }
  catch (error) {
    if (!(error instanceof MarketplaceError)) throw error;
    return <><h1 className="text-3xl font-semibold">Your account</h1><p role="alert" className="my-4">{error.message}</p><AccountSignOut /></>;
  }
  const data = await accountData();
  const role = data.coach?.status === "approved" ? "Athlete · Coach" : data.coach ? "Athlete · Coach applicant" : "Athlete";
  return <>
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><p className="text-sm text-muted-foreground">Signed in as</p><p className="mt-1 break-all text-lg font-semibold">{actor.email}</p><p className="mt-2 text-sm text-muted-foreground">{role}{actor.admin ? " · Administrator" : ""}</p></div>
      <AccountSignOut />
    </header>
    <AccountNavigation admin={actor.admin} />
    <div className="pt-8 pb-4">{children}</div>
  </>;
}
