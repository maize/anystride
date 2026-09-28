import "server-only";
import { accountAuthClient } from "./supabase-server";
import { MarketplaceError, marketplaceAdmin, marketplaceInvited, marketplaceOrigin } from "./marketplace-config";

export interface MarketplaceActor { id: string; email: string; admin: boolean }

export async function requireMarketplaceActor(): Promise<MarketplaceActor> {
  marketplaceOrigin();
  const supabase = await accountAuthClient();
  // A fresh Auth-server lookup, not an unverified cookie or getSession() user.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error && (!error.status || error.status >= 500)) throw new MarketplaceError("Account verification is temporarily unavailable.");
  if (error || !user) throw new MarketplaceError("Sign in to continue.", 401);
  if (!user.email || !user.email_confirmed_at || user.is_anonymous) {
    throw new MarketplaceError("Verify your account email before continuing.", 403);
  }
  if (!marketplaceInvited(user.email)) throw new MarketplaceError("This account is not invited to the coaching pilot.", 403);
  return { id: user.id, email: user.email.toLowerCase(), admin: marketplaceAdmin(user.id) };
}
