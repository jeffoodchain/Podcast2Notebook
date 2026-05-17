import { NextRequest, NextResponse } from "next/server";
import { DRIVE_COOKIE, isOAuthConfigured } from "@/lib/googleAuth";

/** Tells the frontend whether Drive is configured and the user is connected. */
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(DRIVE_COOKIE)?.value;
  let connected = false;
  let email: string | null = null;

  if (cookie) {
    try {
      const data = JSON.parse(cookie);
      connected = !!(data.refresh_token || data.access_token);
      email = data.email || null;
    } catch {
      // malformed cookie — treat as not connected
    }
  }

  return NextResponse.json({ configured: isOAuthConfigured(), connected, email });
}
