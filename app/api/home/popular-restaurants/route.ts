import { NextResponse } from "next/server";
import { serviceClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const { data, error } = await serviceClient
      .from("RestroMaster")
      .select(
        "RestroCode, RestroName, StationCode, StationName, RestroDisplayPhoto, RaileatsStatus, IRCTCStatus"
      )
      .or("RaileatsStatus.eq.Active,IRCTCStatus.eq.Active")
      .order("RestroName", { ascending: true })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message, data: [] },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: data ?? [] },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unexpected server error",
        data: [],
      },
      { status: 500 }
    );
  }
}
