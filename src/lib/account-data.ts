import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireMarketplaceActor } from "./marketplace-auth";
import { MarketplaceError } from "./marketplace-config";
import { marketplaceDashboard } from "./marketplace-store";

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
