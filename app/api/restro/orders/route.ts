export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRestroSession } from "@/lib/restroSession";

function supabaseServer() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) throw new Error("Supabase server environment variables are missing");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  try {
    const session = await getRestroSession();
    if (!session) return NextResponse.json({ ok: false, error: "Session expired" }, { status: 401 });
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from("Orders")
      .select("*")
      .eq("RestroCode", session.restroCode)
      .order("CreatedAt", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, orders: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error: any) {
    console.error("RESTRO ORDERS GET ERROR", error);
    return NextResponse.json({ ok: false, error: error?.message || "Unable to load orders" }, { status: 500 });
  }
}
