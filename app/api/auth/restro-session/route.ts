export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getRestroSession } from "@/lib/restroSession";

function supabaseServer() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  if (!url || !key) {
    throw new Error("Supabase server environment variables are missing");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function safeRestroData(row: any) {
  return {
    RestroCode: row.RestroCode,
    RestroName: row.RestroName ?? null,
    StationCode: row.StationCode ?? null,
    StationName: row.StationName ?? null,
    State: row.State ?? null,
    RestroLoginMobile: String(row.RestroLoginMobile ?? "")
      .replace(/\D/g, "")
      .slice(-10),
    RestroUserName:
      row.RestroUserName ?? row.RestroUsername ?? row.UserName ?? null,
    OwnerName: row.OwnerName ?? null,
    RestroDisplayPhoto: row.RestroDisplayPhoto ?? null,
  };
}

export async function GET() {
  try {
    const session = await getRestroSession();

    if (!session) {
      return NextResponse.json(
        { ok: false, authenticated: false, error: "Session expired" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    const supabase = supabaseServer();

    const { data: restro, error } = await supabase
      .from("RestroMaster")
      .select(
        `
          RestroCode,
          RestroName,
          StationCode,
          StationName,
          State,
          RestroLoginMobile,
          RestroUserName,
          RestroUsername,
          UserName,
          OwnerName,
          RestroDisplayPhoto
        `,
      )
      .eq("RestroCode", session.restroCode)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("RESTRO SESSION DATABASE ERROR =>", error);
      return NextResponse.json(
        { ok: false, authenticated: false, error: "Unable to load session" },
        { status: 500 },
      );
    }

    if (!restro) {
      return NextResponse.json(
        { ok: false, authenticated: false, error: "Restaurant not found" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        authenticated: true,
        restro: safeRestroData(restro),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error: any) {
    console.error("RESTRO SESSION ERROR =>", error);

    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        error: error?.message || "Unable to verify session",
      },
      { status: 500 },
    );
  }
}
