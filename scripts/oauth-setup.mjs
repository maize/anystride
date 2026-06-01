#!/usr/bin/env node
/**
 * One-time helper to obtain a Google OAuth **refresh token** for the GA4 Data API,
 * authorizing as your own Google account (which already has GA access).
 *
 * Prereqs:
 *   1. Google Cloud → APIs & Services → enable "Google Analytics Data API".
 *   2. Configure the OAuth consent screen. To get a NON-expiring refresh token:
 *      - Workspace account: set User type = Internal, or
 *      - Personal account: PUBLISH the app (Production). Apps left in "Testing"
 *        issue refresh tokens that expire after 7 days.
 *      Add scope: .../auth/analytics.readonly
 *   3. Create an OAuth client ID of type **Desktop app**. Copy its client id/secret.
 *
 * Run:
 *   GOOGLE_OAUTH_CLIENT_ID=xxx GOOGLE_OAUTH_CLIENT_SECRET=yyy node scripts/oauth-setup.mjs
 *
 * A browser opens; approve access; the refresh token prints in this terminal.
 * Put GOOGLE_OAUTH_CLIENT_ID / _SECRET / _REFRESH_TOKEN into Vercel env vars.
 */
import http from "node:http";
import { exec } from "node:child_process";
import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || process.argv[2];
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || process.argv[3];

if (!clientId || !clientSecret) {
  console.error(
    "Usage: GOOGLE_OAUTH_CLIENT_ID=… GOOGLE_OAUTH_CLIENT_SECRET=… node scripts/oauth-setup.mjs",
  );
  process.exit(1);
}

const PORT = 53682;
const redirectUri = `http://localhost:${PORT}/oauth2callback`;
const oauth = new OAuth2Client(clientId, clientSecret, redirectUri);

const authUrl = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // force a refresh_token every time
  scope: ["https://www.googleapis.com/auth/analytics.readonly"],
});

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.url.startsWith("/oauth2callback")) {
    res.writeHead(404).end();
    return;
  }
  const code = new URL(req.url, redirectUri).searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("Missing code");
    return;
  }
  try {
    const { tokens } = await oauth.getToken(code);
    res
      .writeHead(200, { "Content-Type": "text/html" })
      .end("<h2>Done — check your terminal, then close this tab.</h2>");
    if (tokens.refresh_token) {
      console.log("\n✅ REFRESH TOKEN (set as GOOGLE_OAUTH_REFRESH_TOKEN):\n");
      console.log(tokens.refresh_token + "\n");
    } else {
      console.log(
        "\n⚠️ No refresh_token returned. Revoke prior access at " +
          "https://myaccount.google.com/permissions and re-run.\n",
      );
    }
  } catch (err) {
    res.writeHead(500).end("Token exchange failed: " + String(err));
    console.error(err);
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  console.log("\nOpening your browser to authorize…");
  console.log("If it doesn't open, visit:\n" + authUrl + "\n");
  exec(`open "${authUrl}"`);
});
