export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

import {
  getRestroSessionCookieOptions,
  RESTRO_SESSION_COOKIE,
} from "@/lib/restroSession";

function logoutResponse() {
  const response = NextResponse.json(
    {
      ok: true,
      message: "Logged out successfully",
    },
    { status: 200 },
  );

  response.cookies.set(RESTRO_SESSION_COOKIE, "", {
    ...getRestroSessionCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });

  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST() {
  return logoutResponse();
}

export async function GET() {
  return logoutResponse();
}
