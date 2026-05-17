import { google } from "googleapis";

/**
 * Google OAuth 2.0 helpers for the "save to your own Google Drive" feature.
 *
 * Scope is `drive.file` only — the app can see and manage just the files it
 * creates, never the rest of the user's Drive. That keeps the consent screen
 * low-friction and avoids Google's restricted-scope security assessment.
 */

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** Name of the httpOnly cookie holding the user's Drive tokens. */
export const DRIVE_COOKIE = "p2n_gdrive";

export interface GoogleTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  email?: string | null;
}

/** True once the developer has set up an OAuth client ID/secret. */
export function isOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
}

function getRedirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  // NextAuth-style path — matches redirect URIs already registered in GCP.
  return `${base}/api/auth/callback/google`;
}

export function createOAuthClient() {
  return new google.auth.OAuth2({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri: getRedirectUri(),
  });
}

/** URL of the Google consent screen the user is sent to. */
export function getConsentUrl(): string {
  return createOAuthClient().generateAuthUrl({
    access_type: "offline", // needed to receive a refresh token
    prompt: "consent",
    scope: SCOPES,
  });
}

/** Exchanges the `code` from the OAuth callback for tokens. */
export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const { tokens } = await createOAuthClient().getToken(code);
  return tokens;
}

/** An OAuth client primed with a user's tokens (auto-refreshes access token). */
export function clientFromTokens(tokens: GoogleTokens) {
  const client = createOAuthClient();
  client.setCredentials(tokens);
  return client;
}

/** Looks up which Google account the tokens belong to (for display). */
export async function getUserEmail(tokens: GoogleTokens): Promise<string | null> {
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: clientFromTokens(tokens) });
    const me = await oauth2.userinfo.get();
    return me.data.email || null;
  } catch {
    return null;
  }
}
