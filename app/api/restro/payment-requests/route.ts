// app/api/restro/payment-requests/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getRestroSession } from "@/lib/restroSession";

const BUCKET = "payment-proofs";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

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

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function cleanAmount(value: unknown) {
  const parsed = Number(
    cleanText(value)
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? Math.round(Math.abs(parsed) * 100) / 100
    : 0;
}

function normalizeMode(value: unknown) {
  const key = cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (key === "NEFT") return "NEFT";
  if (key === "RTGS") return "RTGS";
  if (key === "IMPS") return "IMPS";
  if (key === "UPI") return "UPI";
  if (key === "BANKTRANSFER" || key === "TRANSFER") return "BANK TRANSFER";
  if (key === "CHEQUE" || key === "CHECK") return "CHEQUE";
  if (key === "CASH") return "CASH";

  return null;
}

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) {
    return fromName;
  }

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "application/pdf") return "pdf";

  return "bin";
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

async function authenticatedRestroCode() {
  const session = await getRestroSession();
  const code = Number(session?.restroCode);

  return Number.isFinite(code) && code > 0 ? code : null;
}

export async function GET() {
  try {
    const restroCode = await authenticatedRestroCode();

    if (!restroCode) {
      return NextResponse.json(
        { ok: false, error: "Session expired" },
        { status: 401, headers: noStoreHeaders() }
      );
    }

    const supabase = supabaseServer();

    const { data, error } = await supabase
      .from("RestroPaymentRequests")
      .select(`
        Id,
        RequestNo,
        Amount,
        PaymentDate,
        PaymentMode,
        BankName,
        UTR,
        ReferenceNo,
        ScreenshotPath,
        ScreenshotName,
        Status,
        VendorRemarks,
        AdminRemarks,
        RequestedAt,
        ReceivedAt,
        RejectedAt,
        LedgerRDSId,
        RERDSId,
        SettlementId,
        CreatedAt,
        UpdatedAt
      `)
      .eq("RestroCode", restroCode)
      .order("Id", { ascending: false })
      .limit(100);

    if (error) {
      throw new Error(error.message);
    }

    const rows = await Promise.all(
      (data || []).map(async (row: any) => {
        let screenshotUrl: string | null = null;

        if (row.ScreenshotPath) {
          const signed = await supabase.storage
            .from(BUCKET)
            .createSignedUrl(row.ScreenshotPath, 60 * 30);

          screenshotUrl = signed.data?.signedUrl || null;
        }

        return {
          ...row,
          ScreenshotUrl: screenshotUrl,
          RequestedAtFormatted: formatIndiaDateTime(
            row.RequestedAt || row.CreatedAt
          ),
          ReceivedAtFormatted: formatIndiaDateTime(row.ReceivedAt),
          RejectedAtFormatted: formatIndiaDateTime(row.RejectedAt),
          UpdatedAtFormatted: formatIndiaDateTime(row.UpdatedAt),
        };
      })
    );

    return NextResponse.json(
      { ok: true, rows },
      { status: 200, headers: noStoreHeaders() }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to load payment requests",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}

export async function POST(req: NextRequest) {
  let uploadedPath = "";

  try {
    const restroCode = await authenticatedRestroCode();

    if (!restroCode) {
      return NextResponse.json(
        { ok: false, error: "Session expired" },
        { status: 401, headers: noStoreHeaders() }
      );
    }

    const form = await req.formData();

    const amount = cleanAmount(form.get("amount"));
    const paymentDate = cleanText(form.get("paymentDate"));
    const paymentMode = normalizeMode(form.get("paymentMode"));
    const bankName = cleanText(form.get("bankName")).slice(0, 150);
    const utr = cleanText(form.get("utr"))
      .replace(/\s+/g, "")
      .slice(0, 100);
    const referenceNo = cleanText(form.get("referenceNo")).slice(0, 100);
    const remarks = cleanText(form.get("remarks")).slice(0, 500);
    const file = form.get("screenshot");

    if (amount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Valid payment amount is required" },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      return NextResponse.json(
        { ok: false, error: "Valid payment date is required" },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    if (!paymentMode) {
      return NextResponse.json(
        { ok: false, error: "Valid payment mode is required" },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    if (!utr) {
      return NextResponse.json(
        { ok: false, error: "UTR / Transaction ID is required" },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json(
        { ok: false, error: "Payment screenshot is required" },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { ok: false, error: "Screenshot must be 5 MB or smaller" },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Only JPG, PNG, WEBP or PDF proof is allowed",
        },
        { status: 400, headers: noStoreHeaders() }
      );
    }

    const supabase = supabaseServer();

    const { data: restro, error: restroError } = await supabase
      .from("RestroMaster")
      .select("RestroCode, RestroName")
      .eq("RestroCode", restroCode)
      .maybeSingle();

    if (restroError) throw new Error(restroError.message);
    if (!restro) throw new Error("Restaurant not found");

    const duplicate = await supabase
      .from("RestroPaymentRequests")
      .select("Id, RequestNo, Status")
      .eq("RestroCode", restroCode)
      .ilike("UTR", utr)
      .maybeSingle();

    if (duplicate.error && duplicate.error.code !== "PGRST116") {
      throw new Error(duplicate.error.message);
    }

    if (duplicate.data) {
      return NextResponse.json(
        {
          ok: false,
          error: `This UTR is already submitted as ${
            duplicate.data.RequestNo || duplicate.data.Id
          }`,
        },
        { status: 409, headers: noStoreHeaders() }
      );
    }

    const timestamp = Date.now();
    uploadedPath = `${restroCode}/${timestamp}-${utr}.${extensionFor(file)}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const upload = await supabase.storage
      .from(BUCKET)
      .upload(uploadedPath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const insert = await supabase
      .from("RestroPaymentRequests")
      .insert({
        RestroCode: restroCode,
        RestroName: restro.RestroName,
        Amount: amount,
        PaymentDate: paymentDate,
        PaymentMode: paymentMode,
        BankName: bankName || null,
        UTR: utr,
        ReferenceNo: referenceNo || null,
        ScreenshotPath: uploadedPath,
        ScreenshotName: file.name,
        ScreenshotMimeType: file.type,
        Status: "Requested",
        VendorRemarks: remarks || null,
      })
      .select("Id")
      .single();

    if (insert.error) {
      await supabase.storage.from(BUCKET).remove([uploadedPath]);
      uploadedPath = "";
      throw new Error(insert.error.message);
    }

    const requestNo =
      `RP${new Date().toISOString().slice(2, 10).replace(/-/g, "")}` +
      String(insert.data.Id).padStart(6, "0");

    const update = await supabase
      .from("RestroPaymentRequests")
      .update({ RequestNo: requestNo })
      .eq("Id", insert.data.Id);

    if (update.error) {
      throw new Error(update.error.message);
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Payment proof submitted for confirmation",
        requestNo,
      },
      { status: 201, headers: noStoreHeaders() }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unable to submit payment proof",
      },
      { status: 500, headers: noStoreHeaders() }
    );
  }
}
