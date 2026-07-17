// app/api/restro/ledger/receipt/[rdsId]/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRestroSession } from "@/lib/restroSession";

function supabaseServer() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
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

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: unknown) {
  return Math.round(numberValue(value) * 100) / 100;
}

function normalizeSource(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function sourceLabel(value: unknown) {
  const source = normalizeSource(value);

  if (source === "order") return "Order";
  if (source === "creditnote") return "Credit Note";
  if (source === "debitnote") return "Debit Note";
  if (source === "paymentpaid") return "Payment Paid";
  if (source === "paymentreceived") return "Payment Received";
  if (source === "manual") return "Manual";

  return cleanText(value) || "-";
}

function formatIndiaDateTime(value: unknown) {
  const text = cleanText(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return text;
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export async function GET(
  _req: NextRequest,
  context: {
    params: Promise<{
      rdsId: string;
    }>;
  }
) {
  try {
    const session = await getRestroSession();

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error: "Session expired",
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        }
      );
    }

    const restroCode = Number(session.restroCode);
    const { rdsId: rawRdsId } = await context.params;
    const rdsId = Number(rawRdsId);

    if (!Number.isFinite(restroCode) || restroCode <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid restaurant session",
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        }
      );
    }

    if (!Number.isFinite(rdsId) || rdsId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid ledger entry",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const supabase = supabaseServer();

    const { data: restro, error: restroError } = await supabase
      .from("RestroMaster")
      .select(`
        RestroCode,
        RestroName,
        StationCode,
        StationName,
        State
      `)
      .eq("RestroCode", restroCode)
      .maybeSingle();

    if (restroError) {
      throw new Error(restroError.message);
    }

    if (!restro) {
      return NextResponse.json(
        {
          ok: false,
          error: "Restaurant not found",
        },
        {
          status: 404,
          headers: noStoreHeaders(),
        }
      );
    }

    const { data: row, error: rowError } = await supabase
      .from("RestroRDS")
      .select(`
        RDSId,
        RestroCode,
        OrderId,
        RestroName,
        StationCode,
        Status,
        SubStatus,
        Remarks,
        EntrySource,
        DeliveryDate,
        DeliveryTime,
        PaymentMode,
        CouponCode,
        SettlementAmount,
        PreviousBal,
        CurrentBal,
        PPDAmount,
        CODAmount,
        REDiscount,
        OrderCharges,
        PlatformCharge,
        GSTAmount,
        Commission,
        IGST,
        RestroDiscount,
        CouponDiscount,
        CreatedAt
      `)
      .eq("RDSId", rdsId)
      .eq("RestroCode", restroCode)
      .maybeSingle();

    if (rowError) {
      throw new Error(rowError.message);
    }

    if (!row) {
      return NextResponse.json(
        {
          ok: false,
          error: "Ledger entry not found",
        },
        {
          status: 404,
          headers: noStoreHeaders(),
        }
      );
    }

    const amount = roundMoney(row.SettlementAmount);

    return NextResponse.json(
      {
        ok: true,
        restro,
        entry: {
          ...row,
          EntrySourceLabel: sourceLabel(row.EntrySource),
          Debit: amount < 0 ? Math.abs(amount) : 0,
          Credit: amount > 0 ? amount : 0,
          SettlementAmount: amount,
          PreviousBal: roundMoney(row.PreviousBal),
          CurrentBal: roundMoney(row.CurrentBal),
          CreatedAtFormatted: formatIndiaDateTime(row.CreatedAt),
        },
        generatedAt: formatIndiaDateTime(new Date()),
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error: any) {
    console.error("LEDGER RECEIPT ERROR =>", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to load ledger entry",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}
