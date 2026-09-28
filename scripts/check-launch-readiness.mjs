import nextEnv from "@next/env";
import { pathToFileURL } from "node:url";

/** Report configuration presence only. Never print credentials or claim that
 * installed keys prove a working deployment, database, or payment flow. */
export function launchReadiness(env) {
  const accounts = ["MARKETPLACE_APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "MARKETPLACE_ADMIN_USER_IDS"];
  const databaseSource = env.MARKETPLACE_DATABASE_SOURCE || "MARKETPLACE_DATABASE_URL";
  const databaseConfigured = ["POSTGRES_URL", "MARKETPLACE_DATABASE_URL"].includes(databaseSource) && Boolean(env[databaseSource]?.trim());
  const stripe = ["STRIPE_SECRET_KEY", "STRIPE_PLATFORM_ACCOUNT_ID", "STRIPE_WEBHOOK_SECRET", "STRIPE_APP_URL", "PAYMENTS_ADMIN_TOKEN", "PAYMENTS_DATABASE_URL"];
  return {
    accountPilot: { enabled: env.MARKETPLACE_MODE === "pilot",
      missing: [...accounts.filter((key) => !env[key]?.trim()), ...(databaseConfigured ? [] : ["MARKETPLACE_DATABASE_SOURCE / selected database URL"])],
      databaseConfigured, closedPilot: Boolean(env.MARKETPLACE_PILOT_EMAILS?.trim()), providerCAConfigured: Boolean(env.MARKETPLACE_DATABASE_CA?.trim()),
    },
    stripeSandbox: {
      enabled: env.STRIPE_PAYMENTS_MODE === "test",
      missing: stripe.filter((key) => !env[key]?.trim()),
      testKey: /^sk_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY ?? ""),
      operatorTokenStrong: (env.PAYMENTS_ADMIN_TOKEN?.length ?? 0) >= 32,
      offersConfigured: (() => { try { const offers = JSON.parse(env.STRIPE_TEST_OFFERS ?? "[]"); return Array.isArray(offers) && offers.length > 0; } catch { return false; } })(),
    },
    livePayments: { supported: false, reason: "Live checkout is deliberately disabled in this release." },
    requiredVerification: ["Apply each migration to its intended database.", "Verify Supabase email sign in and ownership with two real test users.", "Complete a Stripe sandbox checkout and confirm the signed webhook record.", "Agree payment terms, fees, refunds, coach onboarding and access delivery before a live-payment release."],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", { info() {}, error() {} });
  console.log(JSON.stringify(launchReadiness(process.env), null, 2));
  // This command is a launch gate, not a generic build health check.
  process.exitCode = 2;
}
