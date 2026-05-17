import { NextResponse } from "next/server";
import { DRIVE_COOKIE } from "@/lib/googleAuth";

/** Forgets the user's Drive tokens. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DRIVE_COOKIE);
  return res;
}
