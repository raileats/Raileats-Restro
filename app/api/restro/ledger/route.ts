// app/api/restro/ledger/route.ts

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

type RestroRdsRow = {
  RDSId: number | string | null;
  RestroCode: number | string | null;
  OrderId: string | null;
  RestroName: string | null;
  StationCode: string | null;
  Status: string | null;
  SubStatus: string | null;
  Remarks: string | null;
  EntrySource: string | null;
  DeliveryDate: string | null;
  DeliveryTime: string | null;
  PaymentMode: string | null;
  CouponCode: string | null;
  SettlementAmount: number | string | null;
  PreviousBal: number | string | null;
  CurrentBal: number | string | null;
  CreatedAt: string | null;
};

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

function roundMoney(
  value: unknown
) {
  return (
    Math.round(
      numberValue(value) *
        100
    ) / 100
  );
}

function normalizeDate(
  value: unknown
) {
  const text =
    cleanText(value);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      text
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${text}T00:00:00+05:30`
    );

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : text;
}

function getIndiaCurrentMonth() {
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

  const lastDay =
    new Date(
      Date.UTC(
        year,
        month,
        0
      )
    ).getUTCDate();

  const monthText =
    String(
      month
    ).padStart(
      2,
      "0"
    );

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

function indiaDateStartToUtcIso(
  value: string
) {
  return new Date(
    `${value}T00:00:00+05:30`
  ).toISOString();
}

function indiaDateEndToUtcIso(
  value: string
) {
  return new Date(
    `${value}T23:59:59.999+05:30`
  ).toISOString();
}

function formatIndiaDateTime(
  value: unknown
) {
  const text =
    cleanText(value);

  if (!text) {
    return null;
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return text;
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

function normalizeSource(
  value: unknown
) {
  return cleanText(
    value
  )
    .toLowerCase()
    .replace(
      /[^a-z]/g,
      ""
    );
}

function sourceLabel(
  value: unknown
) {
  const source =
    normalizeSource(
      value
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

  if (
    source ===
    "manual"
  ) {
    return "Manual";
  }

  return cleanText(
    value
  ) || "-";
}

function particular(
  row: RestroRdsRow
) {
  return [
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
    .join(" - ");
}

async function fetchAllRows({
  restroCode,
  fromUtc,
  toUtc,
}: {
  restroCode: number;
  fromUtc: string;
  toUtc: string;
}) {
  const supabase =
    supabaseServer();

  const pageSize =
    1000;

  let fromIndex =
    0;

  const rows:
    RestroRdsRow[] =
    [];

  while (true) {
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
            CreatedAt
          `
        )
        .eq(
          "RestroCode",
          restroCode
        )
        .gte(
          "CreatedAt",
          fromUtc
        )
        .lte(
          "CreatedAt",
          toUtc
        )
        .order(
          "RDSId",
          {
            ascending:
              true,
          }
        )
        .range(
          fromIndex,
          fromIndex +
            pageSize -
            1
        );

    if (error) {
      throw new Error(
        error.message
      );
    }

    const batch =
      Array.isArray(
        data
      )
        ? (
            data as
              RestroRdsRow[]
          )
        : [];

    rows.push(
      ...batch
    );

    if (
      batch.length <
      pageSize
    ) {
      break;
    }

    fromIndex +=
      pageSize;
  }

  return rows;
}

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",
    Pragma:
      "no-cache",
    Expires:
      "0",
  };
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
          authenticated: false,
          error:
            "Session expired",
        },
        {
          status: 401,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const restroCode =
      Number(
        session.restroCode
      );

    const currentMonth =
      getIndiaCurrentMonth();

    const fromDate =
      normalizeDate(
        req.nextUrl
          .searchParams
          .get("from")
      ) ||
      currentMonth.from;

    const toDate =
      normalizeDate(
        req.nextUrl
          .searchParams
          .get("to")
      ) ||
      currentMonth.to;

    if (
      fromDate >
      toDate
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "From Date, To Date se badi nahi ho sakti",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        }
      );
    }

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
            StationName,
            State
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

    if (!restro) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Restaurant not found",
        },
        {
          status: 404,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const fromUtc =
      indiaDateStartToUtcIso(
        fromDate
      );

    const toUtc =
      indiaDateEndToUtcIso(
        toDate
      );

    const {
      data:
        previousRow,
      error:
        previousError,
    } =
      await supabase
        .from(
          "RestroRDS"
        )
        .select(
          `
            RDSId,
            CurrentBal,
            CreatedAt
          `
        )
        .eq(
          "RestroCode",
          restroCode
        )
        .lt(
          "CreatedAt",
          fromUtc
        )
        .order(
          "RDSId",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (
      previousError
    ) {
      throw new Error(
        previousError.message
      );
    }

    const rows =
      await fetchAllRows(
        {
          restroCode,
          fromUtc,
          toUtc,
        }
      );

    const openingBalance =
      roundMoney(
        previousRow
          ?.CurrentBal ??
        (
          rows.length
            ? rows[0]
                .PreviousBal
            : 0
        )
      );

    let orderCount =
      0;

    let creditNoteCount =
      0;

    let debitNoteCount =
      0;

    let paymentPaidCount =
      0;

    let paymentReceivedCount =
      0;

    let manualCount =
      0;

    let totalOrders =
      0;

    let totalCreditNotes =
      0;

    let totalDebitNotes =
      0;

    let totalPaymentPaid =
      0;

    let totalPaymentReceived =
      0;

    let totalManual =
      0;

    const ledgerRows =
      rows.map(
        (
          row
        ) => {
          const amount =
            roundMoney(
              row.SettlementAmount
            );

          const source =
            normalizeSource(
              row.EntrySource
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

          if (
            source ===
            "order"
          ) {
            orderCount +=
              1;

            totalOrders +=
              amount;
          } else if (
            source ===
            "creditnote"
          ) {
            creditNoteCount +=
              1;

            totalCreditNotes +=
              amount;
          } else if (
            source ===
            "debitnote"
          ) {
            debitNoteCount +=
              1;

            totalDebitNotes +=
              Math.abs(
                amount
              );
          } else if (
            source ===
            "paymentpaid"
          ) {
            paymentPaidCount +=
              1;

            totalPaymentPaid +=
              Math.abs(
                amount
              );
          } else if (
            source ===
            "paymentreceived"
          ) {
            paymentReceivedCount +=
              1;

            totalPaymentReceived +=
              Math.abs(
                amount
              );
          } else {
            manualCount +=
              1;

            totalManual +=
              amount;
          }

          return {
            ...row,

            EntrySourceLabel:
              sourceLabel(
                row.EntrySource
              ),

            Particular:
              particular(
                row
              ),

            SettlementAmount:
              amount,

            Debit:
              roundMoney(
                debit
              ),

            Credit:
              roundMoney(
                credit
              ),

            PreviousBal:
              roundMoney(
                row.PreviousBal
              ),

            CurrentBal:
              roundMoney(
                row.CurrentBal
              ),

            CreatedAtFormatted:
              formatIndiaDateTime(
                row.CreatedAt
              ),
          };
        }
      );

    const netMovement =
      roundMoney(
        ledgerRows.reduce(
          (
            total,
            row
          ) =>
            total +
            numberValue(
              row.SettlementAmount
            ),
          0
        )
      );

    const closingBalance =
      roundMoney(
        ledgerRows.length
          ? ledgerRows[
              ledgerRows.length -
              1
            ].CurrentBal
          : openingBalance
      );

    const totalDebit =
      roundMoney(
        ledgerRows.reduce(
          (
            total,
            row
          ) =>
            total +
            numberValue(
              row.Debit
            ),
          0
        )
      );

    const totalCredit =
      roundMoney(
        ledgerRows.reduce(
          (
            total,
            row
          ) =>
            total +
            numberValue(
              row.Credit
            ),
          0
        )
      );

    return NextResponse.json(
      {
        ok: true,
        authenticated: true,

        period: {
          from:
            fromDate,
          to:
            toDate,
        },

        restro,

        summary: {
          openingBalance,
          closingBalance,
          netMovement,
          totalDebit,
          totalCredit,
          totalTransactions:
            ledgerRows.length,

          orderCount,
          creditNoteCount,
          debitNoteCount,
          paymentPaidCount,
          paymentReceivedCount,
          manualCount,

          totalOrders:
            roundMoney(
              totalOrders
            ),

          totalCreditNotes:
            roundMoney(
              totalCreditNotes
            ),

          totalDebitNotes:
            roundMoney(
              totalDebitNotes
            ),

          totalPaymentPaid:
            roundMoney(
              totalPaymentPaid
            ),

          totalPaymentReceived:
            roundMoney(
              totalPaymentReceived
            ),

          totalManual:
            roundMoney(
              totalManual
            ),
        },

        rows:
          ledgerRows,

        generatedAt:
          formatIndiaDateTime(
            new Date()
          ),
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      }
    );
  } catch (
    error: any
  ) {
    console.error(
      "VENDOR LEDGER ERROR =>",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unable to load ledger",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      }
    );
  }
}
