import "server-only";

export class MarketplaceError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}

export function marketplaceEnabled() {
  return process.env.MARKETPLACE_MODE === "pilot" && Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    marketplaceDatabaseUrl() && process.env.MARKETPLACE_APP_URL,
  );
}

export function marketplaceDatabaseUrl() {
  // Existing Anystride storage must be selected explicitly, never as a fallback.
  const source = process.env.MARKETPLACE_DATABASE_SOURCE;
  if (source === "POSTGRES_URL") return process.env.POSTGRES_URL;
  if (!source || source === "MARKETPLACE_DATABASE_URL") return process.env.MARKETPLACE_DATABASE_URL;
  return undefined;
}

export function marketplaceInvited(email: string) {
  const configured = process.env.MARKETPLACE_PILOT_EMAILS;
  if (!configured?.trim()) return true;
  return configured.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean).includes(email.trim().toLowerCase());
}

export function marketplaceOrigin() {
  if (!marketplaceEnabled()) throw new MarketplaceError("Coaching accounts are not open yet.");
  let url: URL;
  try { url = new URL(process.env.MARKETPLACE_APP_URL!); }
  catch { throw new MarketplaceError("Coaching account setup is incomplete."); }
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) throw new MarketplaceError("Coaching account setup is incomplete.");
  return url.origin;
}

export function marketplaceAdmin(userId: string) {
  // Never trust client-editable metadata, email domains or a role from the body.
  return (process.env.MARKETPLACE_ADMIN_USER_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean).includes(userId);
}
