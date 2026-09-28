import "server-only";
import { X509Certificate } from "node:crypto";
import { MarketplaceError, marketplaceDatabaseUrl } from "./marketplace-config";

export function marketplaceDatabaseConfig() {
  let database: URL;
  try { database = new URL(marketplaceDatabaseUrl() ?? ""); }
  catch { throw new MarketplaceError("Coaching database is not configured."); }
  if (!["postgres:", "postgresql:"].includes(database.protocol) || !database.hostname || database.pathname === "/" || !database.pathname) {
    throw new MarketplaceError("Invalid coaching database configuration.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(database.hostname);
  for (const key of [...database.searchParams.keys()]) {
    if (key.startsWith("ssl")) database.searchParams.delete(key);
  }
  const ca = process.env.MARKETPLACE_DATABASE_CA?.trim();
  if (ca) {
    try {
      if (ca.length > 16384 || !new X509Certificate(ca).ca) throw new Error("Not a CA certificate");
    } catch { throw new MarketplaceError("Invalid coaching database CA certificate."); }
  }
  return { connectionString: database.toString(), ssl: local ? false as const : { rejectUnauthorized: true, ...(ca ? { ca } : {}) } };
}
