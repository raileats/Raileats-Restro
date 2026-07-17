"use client";

// components/restro/LedgerReceiptClient.tsx

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

type Props = {
  rdsId: string;
};

type Entry = {
  RDSId: number | string | null;
  OrderId: string | null;
  RestroCode: number | string | null;
  RestroName: string | null;
  StationCode: string | null;
  EntrySource: string | null;
  EntrySourceLabel?: string | null;
  Status: string | null;
  SubStatus: string | null;
  Remarks: string | null;
  DeliveryDate: string | null;
  DeliveryTime: string | null;
  PaymentMode: string | null;
  CouponCode: string | null;
  RestroPrice?: number | string | null;
  BasePrice?: number | string | null;
  DiscountedBasePrice?: number | string | null;
  TotalAmount?: number | string | null;
  SettlementAmount: number | string | null;
  Debit?: number | string | null;
  Credit?: number | string | null;
  PreviousBal: number | string | null;
  CurrentBal: number | string | null;
  PPDAmount?: number | string | null;
  CODAmount?: number | string | null;
  REDiscount?: number | string | null;
  OrderPenalty?: number | string | null;
  OrderCharges?: number | string | null;
  PlatformCharge?: number | string | null;
  GSTAmount?: number | string | null;
  Commission?: number | string | null;
  IGST?: number | string | null;
  RestroDiscount?: number | string | null;
  CreatedAt: string | null;
  CreatedAtFormatted?: string | null;
};

type ApiResponse = {
  ok: boolean;
  restro?: any;
  entry?: Entry;
  generatedAt?: string | null;
  error?: string;
};

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown) {
  return numberValue(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: unknown) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return match
    ? `${match[3]}-${match[2]}-${match[1]}`
    : text || "-";
}

function normalizeSource(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function badgeClass(value: unknown) {
  const source = normalizeSource(value);

  if (source === "creditnote") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (source === "debitnote") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (source === "paymentpaid") {
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
  }

  if (source === "paymentreceived") {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  if (source === "manual") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function LedgerReceiptClient({
  rdsId,
}: Props) {
  const [entry, setEntry] =
    useState<Entry | null>(
      null
    );

  const [restro, setRestro] =
    useState<any>(
      null
    );

  const [generatedAt, setGeneratedAt] =
    useState<string | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    let active = true;

    async function loadReceipt() {
      setLoading(true);
      setError(null);

      try {
        const response =
          await fetch(
            `/api/restro/ledger/receipt/${encodeURIComponent(
              rdsId
            )}`,
            {
              method: "GET",
              cache: "no-store",
              credentials: "include",
            }
          );

        const json: ApiResponse =
          await response.json();

        if (
          !response.ok ||
          !json.ok
        ) {
          throw new Error(
            json.error ||
            "Unable to load receipt"
          );
        }

        if (!active) return;

        setEntry(
          json.entry ||
          null
        );

        setRestro(
          json.restro ||
          null
        );

        setGeneratedAt(
          json.generatedAt ||
          null
        );
      } catch (
        loadError: any
      ) {
        if (!active) return;

        setError(
          loadError?.message ||
          "Unable to load receipt"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReceipt();

    return () => {
      active = false;
    };
  }, [rdsId]);

  const debit =
    numberValue(
      entry?.Debit
    );

  const credit =
    numberValue(
      entry?.Credit
    );

  const isDebit =
    debit > 0;

  const normalizedSource =
    normalizeSource(
      entry?.EntrySource
    );

  const isOrderEntry =
    normalizedSource ===
    "order";

  const isPaymentEntry =
    normalizedSource ===
      "paymentpaid" ||
    normalizedSource ===
      "paymentreceived";

  const isCreditNoteEntry =
    normalizedSource ===
    "creditnote";

  const isDebitNoteEntry =
    normalizedSource ===
    "debitnote";

  const detailRows: Array<
    [string, string]
  > = [];

  detailRows.push([
    isOrderEntry
      ? "Order ID"
      : isPaymentEntry
      ? "Payment Reference"
      : isCreditNoteEntry
      ? "Credit Note Reference"
      : isDebitNoteEntry
      ? "Debit Note Reference"
      : "Reference",
    entry?.OrderId || "-",
  ]);

  if (
    entry?.PaymentMode
  ) {
    detailRows.push([
      "Payment Mode",
      entry.PaymentMode,
    ]);
  }

  const statusText =
    [
      entry?.Status,
      entry?.SubStatus,
    ]
      .filter(Boolean)
      .join(" - ");

  if (statusText) {
    detailRows.push([
      "Status",
      statusText,
    ]);
  }

  if (isOrderEntry) {
    const deliveryText =
      [
        formatDate(
          entry?.DeliveryDate
        ),
        entry?.DeliveryTime,
      ]
        .filter(
          (value) =>
            value &&
            value !== "-"
        )
        .join(" • ");

    if (deliveryText) {
      detailRows.push([
        "Delivery",
        deliveryText,
      ]);
    }

    if (
      entry?.CouponCode
    ) {
      detailRows.push([
        "Coupon Code",
        entry.CouponCode,
      ]);
    }
  }

  const calculationRows = [
    [
      "Restaurant Price",
      entry?.RestroPrice,
    ],
    [
      "Base Price",
      entry?.BasePrice,
    ],
    [
      "Discounted Base Price",
      entry?.DiscountedBasePrice,
    ],
    [
      "Order Total",
      entry?.TotalAmount,
    ],
    [
      "PPD Amount",
      entry?.PPDAmount,
    ],
    [
      "COD Amount",
      entry?.CODAmount,
    ],
    [
      "Commission",
      entry?.Commission,
    ],
    [
      "GST Amount",
      entry?.GSTAmount,
    ],
    [
      "Platform Charge",
      entry?.PlatformCharge,
    ],
    [
      "Order Penalty",
      entry?.OrderPenalty,
    ],
    [
      "Order Charges",
      entry?.OrderCharges,
    ],
    [
      "IGST",
      entry?.IGST,
    ],
    [
      "Restaurant Discount",
      entry?.RestroDiscount,
    ],
    [
      "RE Discount",
      entry?.REDiscount,
    ],
  ].filter(
    (
      row
    ) =>
      numberValue(
        row[1]
      ) !== 0
  );

  return (
    <div className="receipt-screen flex h-full flex-col overflow-hidden bg-[#f7f9fc]">
      <div className="receipt-no-print flex-shrink-0 border-b border-slate-100 bg-white px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950">
              Ledger Entry
            </h1>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Receipt and balance details
            </p>
          </div>

          <Link
            href="/ledger"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600"
          >
            Back
          </Link>
        </div>
      </div>

      <main className="receipt-scroll flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-xs font-bold text-slate-400">
            Loading receipt...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-xs font-bold text-red-700">
            {error}
          </div>
        ) : !entry ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-14 text-center text-xs font-bold text-slate-400">
            Ledger entry not found
          </div>
        ) : (
          <div className="receipt-paper overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b-2 border-slate-900 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-2xl font-black text-slate-950">
                    RailEats
                  </div>

                  <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Vendor Ledger Receipt
                  </div>
                </div>

                <span
                  className={[
                    "rounded-lg border px-3 py-2 text-[10px] font-black",
                    badgeClass(
                      entry.EntrySource
                    ),
                  ].join(" ")}
                >
                  {entry.EntrySourceLabel ||
                    entry.EntrySource ||
                    "-"}
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <div className="text-[9px] font-black uppercase tracking-wider text-blue-600">
                  Restaurant
                </div>

                <div className="mt-1 text-base font-black text-slate-950">
                  {restro?.RestroCode ||
                    entry.RestroCode ||
                    "-"}
                  {restro?.RestroName
                    ? ` / ${restro.RestroName}`
                    : ""}
                </div>

                <div className="mt-1 text-xs font-semibold text-slate-500">
                  {[
                    restro?.StationCode,
                    restro?.StationName,
                  ]
                    .filter(Boolean)
                    .join(" - ") ||
                    "-"}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-center">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                  Transaction Amount
                </div>

                <div
                  className={[
                    "mt-2 text-3xl font-black",
                    isDebit
                      ? "text-red-700"
                      : "text-emerald-700",
                  ].join(" ")}
                >
                  {isDebit ? "-" : "+"}₹
                  {formatMoney(
                    isDebit
                      ? debit
                      : credit
                  )}
                </div>

                <div className="mt-2 text-[10px] font-semibold text-slate-400">
                  {entry.CreatedAtFormatted ||
                    entry.CreatedAt ||
                    "-"}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-[9px] font-black uppercase text-slate-400">
                    Previous Balance
                  </div>

                  <div className="mt-1 text-base font-black text-slate-900">
                    ₹{formatMoney(
                      entry.PreviousBal
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-[9px] font-black uppercase text-slate-400">
                    Current Balance
                  </div>

                  <div className="mt-1 text-base font-black text-slate-900">
                    ₹{formatMoney(
                      entry.CurrentBal
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                {detailRows.map(
                  (
                    row,
                    index
                  ) => (
                    <div
                      key={
                        String(
                          row[0]
                        )
                      }
                      className={[
                        "grid grid-cols-[120px_1fr] gap-3 px-4 py-3 text-xs",
                        index ===
                        detailRows.length -
                          1
                          ? ""
                          : "border-b border-slate-100",
                      ].join(" ")}
                    >
                      <div className="font-black text-slate-400">
                        {row[0]}
                      </div>

                      <div className="break-all text-right font-bold text-slate-800">
                        {row[1]}
                      </div>
                    </div>
                  )
                )}
              </div>

              {calculationRows.length >
              0 ? (
                <div className="mt-4">
                  <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Calculation Details
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    {calculationRows.map(
                      (
                        row,
                        index
                      ) => (
                        <div
                          key={
                            String(
                              row[0]
                            )
                          }
                          className={[
                            "flex items-center justify-between gap-3 px-4 py-3 text-xs",
                            index ===
                            calculationRows.length -
                              1
                              ? ""
                              : "border-b border-slate-100",
                          ].join(" ")}
                        >
                          <span className="font-bold text-slate-500">
                            {row[0]}
                          </span>

                          <span className="font-black text-slate-900">
                            ₹{formatMoney(
                              row[1]
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : null}

              {entry.Remarks ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="text-[9px] font-black uppercase tracking-wider text-amber-700">
                    Remarks
                  </div>

                  <div className="mt-2 text-xs font-semibold leading-5 text-slate-700">
                    {entry.Remarks}
                  </div>
                </div>
              ) : null}

              <div className="receipt-no-print mt-5 grid grid-cols-2 gap-3">
                <Link
                  href="/ledger"
                  className="flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600"
                >
                  Back to Ledger
                </Link>

                <button
                  type="button"
                  onClick={() =>
                    window.print()
                  }
                  className="h-11 rounded-xl bg-blue-600 text-[10px] font-black text-white"
                >
                  Print / Save PDF
                </button>
              </div>

              <div className="mt-5 text-center text-[9px] font-semibold text-slate-400">
                Generated: {generatedAt || "-"}
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          .receipt-no-print,
          nav,
          footer {
            display: none !important;
          }

          .receipt-screen {
            display: block !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
          }

          .receipt-scroll {
            overflow: visible !important;
            padding: 0 !important;
          }

          .receipt-paper {
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
