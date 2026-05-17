import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getUserEmail, DRIVE_COOKIE } from "@/lib/googleAuth";

/**
 * OAuth callback. Exchanges the authorization code for tokens, stores them in
 * an httpOnly cookie, and returns the user to the home page.
 *
 * Path is `/api/auth/callback/google` (the NextAuth-style convention) so it
 * matches redirect URIs already registered for this OAuth client.
 *
 * Note: the refresh token lives in a plain httpOnly cookie. Fine for a
 * single-user / beta deployment; a public product should encrypt it or move it
 * to a server-side session store.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/$/, "");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${base}/?drive=error`);
  }

  try {
    const tokens = await exchangeCode(code);
    const email = await getUserEmail(tokens);

    const res = NextResponse.redirect(`${base}/?drive=connected`);
    res.cookies.set(DRIVE_COOKIE, JSON.stringify({ ...tokens, email }), {
      httpOnly: true,
      sameSite: "lax",
      secure: base.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch (e) {
    console.error("OAuth callback failed", e);
    return NextResponse.redirect(`${base}/?drive=error`);
  }
}
