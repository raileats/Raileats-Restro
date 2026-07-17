// app/api/restro/ledger/export/route.ts

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@supabase/supabase-js";

import {
  getRestroSession,
} from "@/lib/restroSession";

function supabaseServer() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  if (!url || !key) {
    throw new Error(
      "Supabase server environment variables are missing"
    );
  }

  return createClient(
    url,
    key,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function cleanText(
  value: unknown
) {
  return String(
    value ?? ""
  ).trim();
}

function numberValue(
  value: unknown
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function normalizeDate(
  value: unknown
) {
  const text =
    cleanText(value);

  return /^\d{4}-\d{2}-\d{2}$/.test(
    text
  )
    ? text
    : null;
}

function currentMonth() {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Kolkata",
        year:
          "numeric",
        month:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const values:
    Record<string, string> =
    {};

  for (
    const part of parts
  ) {
    values[
      part.type
    ] =
      part.value;
  }

  const year =
    Number(
      values.year
    );

  const month =
    Number(
      values.month
    );

  const monthText =
    String(
      month
    ).padStart(
      2,
      "0"
    );

  const lastDay =
    new Date(
      Date.UTC(
        year,
        month,
        0
      )
    ).getUTCDate();

  return {
    from:
      `${year}-${monthText}-01`,

    to:
      `${year}-${monthText}-${String(
        lastDay
      ).padStart(
        2,
        "0"
      )}`,
  };
}

function csvCell(
  value: unknown
) {
  const text =
    String(
      value ?? ""
    )
      .replace(
        /\r?\n/g,
        " "
      )
      .replace(
        /"/g,
        '""'
      );

  return `"${text}"`;
}

function sourceLabel(
  value: unknown
) {
  const source =
    cleanText(
      value
    )
      .toLowerCase()
      .replace(
        /[^a-z]/g,
        ""
      );

  if (
    source ===
    "order"
  ) {
    return "Order";
  }

  if (
    source ===
    "creditnote"
  ) {
    return "Credit Note";
  }

  if (
    source ===
    "debitnote"
  ) {
    return "Debit Note";
  }

  if (
    source ===
    "paymentpaid"
  ) {
    return "Payment Paid";
  }

  if (
    source ===
    "paymentreceived"
  ) {
    return "Payment Received";
  }

  return cleanText(
    value
  ) || "Manual";
}

function formatIndiaDateTime(
  value: unknown
) {
  const date =
    new Date(
      String(
        value ?? ""
      )
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return cleanText(
      value
    );
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone:
        "Asia/Kolkata",
      day:
        "2-digit",
      month:
        "2-digit",
      year:
        "numeric",
      hour:
        "2-digit",
      minute:
        "2-digit",
      second:
        "2-digit",
      hour12:
        false,
    }
  ).format(date);
}

export async function GET(
  req: NextRequest
) {
  try {
    const session =
      await getRestroSession();

    if (!session) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Session expired",
        },
        {
          status: 401,
        }
      );
    }

    const defaults =
      currentMonth();

    const fromDate =
      normalizeDate(
        req.nextUrl
          .searchParams
          .get("from")
      ) ||
      defaults.from;

    const toDate =
      normalizeDate(
        req.nextUrl
          .searchParams
          .get("to")
      ) ||
      defaults.to;

    if (
      fromDate >
      toDate
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid date range",
        },
        {
          status: 400,
        }
      );
    }

    const restroCode =
      Number(
        session.restroCode
      );

    const supabase =
      supabaseServer();

    const {
      data:
        restro,
      error:
        restroError,
    } =
      await supabase
        .from(
          "RestroMaster"
        )
        .select(
          `
            RestroCode,
            RestroName,
            StationCode,
            StationName
          `
        )
        .eq(
          "RestroCode",
          restroCode
        )
        .maybeSingle();

    if (
      restroError
    ) {
      throw new Error(
        restroError.message
      );
    }

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "RestroRDS"
        )
        .select(
          `
            RDSId,
            OrderId,
            EntrySource,
            Status,
            SubStatus,
            PaymentMode,
            Remarks,
            SettlementAmount,
            PreviousBal,
            CurrentBal,
            CreatedAt
          `
        )
        .eq(
          "RestroCode",
          restroCode
        )
        .gte(
          "CreatedAt",
          new Date(
            `${fromDate}T00:00:00+05:30`
          ).toISOString()
        )
        .lte(
          "CreatedAt",
          new Date(
            `${toDate}T23:59:59.999+05:30`
          ).toISOString()
        )
        .order(
          "RDSId",
          {
            ascending:
              true,
          }
        )
        .limit(
          10000
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const rows =
      Array.isArray(
        data
      )
        ? data
        : [];

    const csvRows:
      string[] =
      [];

    csvRows.push(
      [
        "RailEats Vendor Ledger",
      ]
        .map(
          csvCell
        )
        .join(",")
    );

    csvRows.push(
      [
        "Restaurant",
        `${restro?.RestroCode ?? restroCode} / ${restro?.RestroName ?? ""}`,
      ]
        .map(
          csvCell
        )
        .join(",")
    );

    csvRows.push(
      [
        "Station",
        [
          restro?.StationCode,
          restro?.StationName,
        ]
          .filter(Boolean)
          .join(" - "),
      ]
        .map(
          csvCell
        )
        .join(",")
    );

    csvRows.push(
      [
        "Period",
        `${fromDate} to ${toDate}`,
      ]
        .map(
          csvCell
        )
        .join(",")
    );

    csvRows.push("");

    csvRows.push(
      [
        "Date & Time",
        "Entry",
        "Particular",
        "Reference",
        "Payment Mode",
        "Remarks",
        "Debit",
        "Credit",
        "Previous Balance",
        "Current Balance",
      ]
        .map(
          csvCell
        )
        .join(",")
    );

    for (
      const row of rows
    ) {
      const amount =
        numberValue(
          row.SettlementAmount
        );

      const debit =
        amount < 0
          ? Math.abs(
              amount
            )
          : 0;

      const credit =
        amount > 0
          ? amount
          : 0;

      csvRows.push(
        [
          formatIndiaDateTime(
            row.CreatedAt
          ),
          sourceLabel(
            row.EntrySource
          ),
          [
            sourceLabel(
              row.EntrySource
            ),
            cleanText(
              row.Status
            ),
            cleanText(
              row.SubStatus
            ),
          ]
            .filter(Boolean)
            .join(" - "),
          row.OrderId,
          row.PaymentMode,
          row.Remarks,
          debit
            ? debit.toFixed(
                2
              )
            : "",
          credit
            ? credit.toFixed(
                2
              )
            : "",
          numberValue(
            row.PreviousBal
          ).toFixed(
            2
          ),
          numberValue(
            row.CurrentBal
          ).toFixed(
            2
          ),
        ]
          .map(
            csvCell
          )
          .join(",")
      );
    }

    const csv =
      "\uFEFF" +
      csvRows.join(
        "\r\n"
      );

    const fileName =
      `RailEats-Ledger-${restroCode}-${fromDate}-to-${toDate}.csv`;

    return new NextResponse(
      csv,
      {
        status: 200,

        headers: {
          "Content-Type":
            "text/csv; charset=utf-8",

          "Content-Disposition":
            `attachment; filename="${fileName}"`,

          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "VENDOR LEDGER EXPORT ERROR =>",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to export ledger",
      },
      {
        status: 500,
      }
    );
  }
}
