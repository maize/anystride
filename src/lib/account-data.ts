import "server-only";
import { cookies, headers } from "next/headers";
import { accountViewCookie, accountViewHeader, resolveAccountView } from "./account-view";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireMarketplaceActor } from "./marketplace-auth";
import { MarketplaceError } from "./marketplace-config";
import { marketplaceDashboard, marketplaceCoachSummary } from "./marketplace-store";

// Shared only within a render. Every page verifies identity, including direct URLs.
export const accountActor = cache(async () => {
  try { return await requireMarketplaceActor(); }
  catch (error) {
    if (error instanceof MarketplaceError && error.status === 401) redirect("/account/sign-in");
    throw error;
  }
});

export const accountData = cache(async () => {
  const actor = await accountActor();
  return marketplaceDashboard(actor, { includeReviews: false });
});

// The account shell needs only the coach role, not the full service catalogue.
export const accountCoach = cache(async () => marketplaceCoachSummary(await accountActor()));

// View selection never changes approval, sharing grants or account permissions.
export const accountView = cache(async () => {
  const [requestHeaders, savedCookies, coach] = await Promise.all([headers(), cookies(), accountCoach()]);
  return resolveAccountView(requestHeaders.get(accountViewHeader), savedCookies.get(accountViewCookie)?.value, Boolean(coach));
});
