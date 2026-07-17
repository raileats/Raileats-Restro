// app/api/restro/settlement/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRestroSession } from "@/lib/restroSession";

const MINIMUM_SETTLEMENT = 1000;

function supabaseServer() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

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

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: unknown) {
  return Math.round(numberValue(value) * 100) / 100;
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function formatIndiaDateTime(value: unknown) {
  const text = cleanText(value);

  if (!text) return null;

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) return text;

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

async function getAuthenticatedRestroCode() {
  const session = await getRestroSession();

  if (!session) {
    return null;
  }

  const restroCode = Number(session.restroCode);

  if (!Number.isFinite(restroCode) || restroCode <= 0) {
    return null;
  }

  return restroCode;
}

export async function GET() {
  try {
    const restroCode = await getAuthenticatedRestroCode();

    if (!restroCode) {
      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          error: "Session expired",
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        }
      );
    }

    const supabase = supabaseServer();

    const [
      restroResult,
      balanceResult,
      pendingResult,
      requestsResult,
    ] = await Promise.all([
      supabase
        .from("RestroMaster")
        .select(`
          RestroCode,
          RestroName,
          StationCode,
          StationName
        `)
        .eq("RestroCode", restroCode)
        .maybeSingle(),

      supabase
        .from("RestroRDS")
        .select(`
          RDSId,
          CurrentBal,
          CreatedAt
        `)
        .eq("RestroCode", restroCode)
        .order("RDSId", { ascending: false })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("SettlementRequests")
        .select("Amount")
        .eq("RestroCode", restroCode)
        .in("Status", ["Pending", "Approved"]),

      supabase
        .from("SettlementRequests")
        .select(`
          Id,
          RequestNo,
          RestroCode,
          RestroName,
          RequestDate,
          Amount,
          CurrentBalance,
          AvailableBalanceBeforeRequest,
          PendingAmountBeforeRequest,
          Status,
          VendorRemarks,
          AdminRemarks,
          ApprovedDate,
          RejectedDate,
          PaidDate,
          UTR,
          LedgerRDSId,
          CreatedAt,
          UpdatedAt
        `)
        .eq("RestroCode", restroCode)
        .order("Id", { ascending: false })
        .limit(100),
    ]);

    if (restroResult.error) throw new Error(restroResult.error.message);
    if (balanceResult.error) throw new Error(balanceResult.error.message);
    if (pendingResult.error) throw new Error(pendingResult.error.message);
    if (requestsResult.error) throw new Error(requestsResult.error.message);

    if (!restroResult.data) {
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

    const currentBalance = roundMoney(
      balanceResult.data?.CurrentBal ?? 0
    );

    const pendingAmount = roundMoney(
      (pendingResult.data || []).reduce(
        (total, row) => total + numberValue(row.Amount),
        0
      )
    );

    const availableBalance = roundMoney(
      Math.max(currentBalance - pendingAmount, 0)
    );

    const requests = (requestsResult.data || []).map((row) => ({
      ...row,
      Amount: roundMoney(row.Amount),
      CurrentBalance: roundMoney(row.CurrentBalance),
      AvailableBalanceBeforeRequest: roundMoney(
        row.AvailableBalanceBeforeRequest
      ),
      PendingAmountBeforeRequest: roundMoney(
        row.PendingAmountBeforeRequest
      ),
      RequestDateFormatted: formatIndiaDateTime(
        row.RequestDate || row.CreatedAt
      ),
      ApprovedDateFormatted: formatIndiaDateTime(row.ApprovedDate),
      RejectedDateFormatted: formatIndiaDateTime(row.RejectedDate),
      PaidDateFormatted: formatIndiaDateTime(row.PaidDate),
      UpdatedAtFormatted: formatIndiaDateTime(row.UpdatedAt),
    }));

    return NextResponse.json(
      {
        ok: true,
        authenticated: true,
        minimumSettlement: MINIMUM_SETTLEMENT,
        restro: restroResult.data,
        summary: {
          currentBalance,
          pendingAmount,
          availableBalance,
          activeRequestCount: (pendingResult.data || []).length,
          totalRequestCount: requests.length,
        },
        requests,
        generatedAt: formatIndiaDateTime(new Date()),
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      }
    );
  } catch (error: any) {
    console.error("VENDOR SETTLEMENT GET ERROR =>", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to load settlement requests",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const restroCode = await getAuthenticatedRestroCode();

    if (!restroCode) {
      return NextResponse.json(
        {
          ok: false,
          authenticated: false,
          error: "Session expired",
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        }
      );
    }

    const body = await req.json().catch(() => ({}));

    const amount = roundMoney(body?.amount);
    const remarks = cleanText(body?.remarks).slice(0, 500);

    if (amount < MINIMUM_SETTLEMENT) {
      return NextResponse.json(
        {
          ok: false,
          error: `Minimum settlement amount ₹${MINIMUM_SETTLEMENT} required`,
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    const supabase = supabaseServer();

    const { data, error } = await supabase.rpc(
      "create_vendor_settlement_request",
      {
        p_restro_code: restroCode,
        p_amount: amount,
        p_vendor_remarks: remarks || null,
      }
    );

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Settlement request submitted successfully",
        request: data,
      },
      {
        status: 201,
        headers: noStoreHeaders(),
      }
    );
  } catch (error: any) {
    console.error("VENDOR SETTLEMENT POST ERROR =>", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to submit settlement request",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      }
    );
  }
}
