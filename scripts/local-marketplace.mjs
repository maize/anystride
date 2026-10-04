import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

// Explicit local setup only: never falls back to Vercel or production credentials.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const mode = process.argv[2];
if (!["setup", "dev", "demo"].includes(mode)) throw new Error("Use: node scripts/local-marketplace.mjs setup|dev|demo");
const extraPilotEmails = (process.env.LOCAL_MARKETPLACE_TEST_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);
if (extraPilotEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
  throw new Error("LOCAL_MARKETPLACE_TEST_EMAILS contains an invalid email address.");
}
const stripeSandbox = process.env.LOCAL_MARKETPLACE_STRIPE_SANDBOX === "on";
const stripeSandboxEnv = stripeSandbox ? {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_PLATFORM_ACCOUNT_ID: process.env.STRIPE_PLATFORM_ACCOUNT_ID,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_TEST_OFFERS: process.env.STRIPE_TEST_OFFERS,
  STRIPE_TEST_SERVICE_BINDINGS: process.env.STRIPE_TEST_SERVICE_BINDINGS,
} : {};
if (stripeSandbox && (
  !/^sk_test_[A-Za-z0-9]+$/.test(stripeSandboxEnv.STRIPE_SECRET_KEY || "") ||
  !/^acct_[A-Za-z0-9]+$/.test(stripeSandboxEnv.STRIPE_PLATFORM_ACCOUNT_ID || "") ||
  !/^whsec_[A-Za-z0-9]+$/.test(stripeSandboxEnv.STRIPE_WEBHOOK_SECRET || "") ||
  !stripeSandboxEnv.STRIPE_TEST_OFFERS || !stripeSandboxEnv.STRIPE_TEST_SERVICE_BINDINGS
)) throw new Error("Local Stripe sandbox settings are incomplete or are not test-mode values.");
if (!/^project_id\s*=\s*"anystride-local"\s*$/m.test(readFileSync(join(root, "supabase/config.toml"), "utf8")) ||
    existsSync(join(root, "supabase/.temp/project-ref"))) {
  throw new Error("Use the unlinked anystride-local project only.");
}
const dockerHost = `unix://${join(homedir(), ".colima/anystride/docker.sock")}`;
const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], {
  cwd: root, env: { ...process.env, DOCKER_HOST: dockerHost }, stdio: ["ignore", "pipe", "ignore"],
}).toString());
const database = new URL(status.DB_URL);
const api = new URL(status.API_URL);
if (database.protocol !== "postgresql:" || database.hostname !== "127.0.0.1" || database.port !== "54322" ||
    database.pathname !== "/postgres" || api.origin !== "http://127.0.0.1:54321") {
  throw new Error("Refusing non-local Supabase endpoints.");
}
const databases = [
  ["anystride_marketplace_test", ["002_marketplace.sql", "005_imported_coach_reviews.sql", "006_coach_storefronts.sql"]],
  ["anystride_payments_test", ["001_test_payments.sql", "004_test_workspaces.sql"]],
];
const localUrl = (name) => { const url = new URL(database); url.pathname = `/${name}`; return url.toString(); };
const authPool = new Pool({ connectionString: database.toString(), max: 1, connectionTimeoutMillis: 5000 });
try {
  if (mode === "setup") {
    for (const [name, migrations] of databases) {
      const found = await authPool.query("SELECT 1 FROM pg_database WHERE datname=$1", [name]);
      // Database identifiers are fixed above, never supplied by a caller.
      if (!found.rowCount) await authPool.query(`CREATE DATABASE ${name}`);
      const pool = new Pool({ connectionString: localUrl(name), max: 1, connectionTimeoutMillis: 5000 });
      try {
        for (const migration of migrations) await pool.query(readFileSync(join(root, "db/migrations", migration), "utf8"));
        console.log(`${name}: schema ready (local only).`);
      } finally { await pool.end(); }
    }
  } else if (mode === "demo") {
    const { seedStorefrontDemo } = await import("./storefront-demo.mjs");
    const pool = new Pool({ connectionString: localUrl("anystride_marketplace_test"), max: 1, connectionTimeoutMillis: 5000 });
    try { await seedStorefrontDemo(pool); }
    finally { await pool.end(); }
    console.log("Fictional storefront: http://localhost:3010/coaching/with/morgan-ellis-demo (local only; payments off).");
  } else {
    const reviewer = await authPool.query(
      "SELECT id FROM auth.users WHERE lower(email)=$1 AND email_confirmed_at IS NOT NULL AND is_anonymous=false",
      ["matthias.e.link@gmail.com"],
    );
    // Keep OS settings, but prevent Next's normal .env loading from importing
    // any hosted credentials or analytics settings into this local process.
    const env = Object.fromEntries(["PATH", "HOME", "USER", "LOGNAME", "TMPDIR", "SHELL", "LANG", "TERM", "LC_ALL"]
      .filter((key) => process.env[key] !== undefined).map((key) => [key, process.env[key]]));
    for (const name of [".env.example", ".env", ".env.local", ".env.development", ".env.development.local"]) {
      const path = join(root, name);
      if (!existsSync(path)) continue;
      for (const match of readFileSync(path, "utf8").matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) env[match[1]] = "";
    }
    Object.assign(env, {
      NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1",
      MARKETPLACE_MODE: "pilot", MARKETPLACE_APP_URL: "http://localhost:3010",
      MARKETPLACE_DATABASE_SOURCE: "MARKETPLACE_DATABASE_URL",
      MARKETPLACE_DATABASE_URL: localUrl("anystride_marketplace_test"),
      PAYMENTS_DATABASE_URL: localUrl("anystride_payments_test"),
      NEXT_PUBLIC_SUPABASE_URL: api.origin,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
      MARKETPLACE_PILOT_EMAILS: [
        "matthias.e.link@gmail.com",
        "matthias.e.link+coach@gmail.com",
        ...extraPilotEmails,
      ].join(","),
      MARKETPLACE_ADMIN_USER_IDS: reviewer.rows.map((row) => row.id).join(","),
      MARKETPLACE_REVIEW_NOTIFICATIONS: "off",
      MARKETPLACE_SANDBOX_WORKSPACES: stripeSandbox ? "on" : "off",
      STRIPE_PAYMENTS_MODE: stripeSandbox ? "test" : "off",
      STRIPE_WEBHOOK_MODE: "off",
      STRIPE_APP_URL: "http://localhost:3010",
      STRIPE_PLATFORM_ACCOUNT_ID: stripeSandboxEnv.STRIPE_PLATFORM_ACCOUNT_ID || "",
      STRIPE_SECRET_KEY: stripeSandboxEnv.STRIPE_SECRET_KEY || "",
      STRIPE_WEBHOOK_SECRET: stripeSandboxEnv.STRIPE_WEBHOOK_SECRET || "",
      STRIPE_TEST_OFFERS: stripeSandboxEnv.STRIPE_TEST_OFFERS || "[]",
      STRIPE_TEST_SERVICE_BINDINGS: stripeSandboxEnv.STRIPE_TEST_SERVICE_BINDINGS || "[]",
    });
    if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) throw new Error("Missing local auth key.");
    console.log(`Local marketplace: http://localhost:3010/account; reviewer ${reviewer.rowCount ? "configured" : "must sign in, then restart"}.`);
    console.log(`Email stays in http://127.0.0.1:54324. Stripe sandbox ${stripeSandbox ? "is ON" : "and external notifications are OFF"}.`);
    const child = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3010"], { cwd: root, env, stdio: "inherit" });
    for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
    child.on("exit", (code) => { process.exitCode = code ?? 0; });
  }
} finally { await authPool.end(); }
