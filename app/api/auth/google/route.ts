import { NextResponse } from "next/server";
import { getConsentUrl, isOAuthConfigured } from "@/lib/googleAuth";

/** Starts the OAuth flow — redirects the user to Google's consent screen. */
export async function GET() {
  if (!isOAuthConfigured()) {
    return NextResponse.json(
      { error: "Google Drive integration is not configured on this server." },
      { status: 503 }
    );
  }
  return NextResponse.redirect(getConsentUrl());
}
