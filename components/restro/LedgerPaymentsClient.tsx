"use client";

// components/restro/LedgerPaymentsClient.tsx

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type LedgerRow = {
  RDSId: number | string | null;
  OrderId: string | null;
  EntrySource: string | null;
  EntrySourceLabel?: string | null;
  Particular?: string | null;
  PaymentMode: string | null;
  Remarks: string | null;
  Debit?: number | string | null;
  Credit?: number | string | null;
  PreviousBal?: number | string | null;
  CurrentBal: number | string | null;
  CreatedAt: string | null;
  CreatedAtFormatted?: string | null;
};

type ApiResponse = {
  ok: boolean;
  period?: {
    from: string;
    to: string;
  };
  restro?: any;
  rows?: LedgerRow[];
  generatedAt?: string | null;
  error?: string;
};

type PaymentFilter = "all" | "paid" | "received";

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

function formatDate(value: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return match
    ? `${match[3]}-${match[2]}-${match[1]}`
    : value || "-";
}

function normalizeSource(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function getCurrentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  const year = Number(values.year);
  const month = Number(values.month);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

function isPaymentEntry(row: LedgerRow) {
  const source = normalizeSource(row.EntrySource);

  return source === "paymentpaid" || source === "paymentreceived";
}

function paymentType(row: LedgerRow) {
  const source = normalizeSource(row.EntrySource);

  if (source === "paymentpaid") {
    return "paid";
  }

  if (source === "paymentreceived") {
    return "received";
  }

  return "other";
}

function paymentTitle(row: LedgerRow) {
  const type = paymentType(row);

  if (type === "paid") {
    return "Settlement Paid";
  }

  if (type === "received") {
    return "Payment Received";
  }

  return row.EntrySourceLabel || row.EntrySource || "Payment";
}

function getPaymentAmount(row: LedgerRow) {
  const debit = numberValue(row.Debit);
  const credit = numberValue(row.Credit);

  if (debit > 0) {
    return {
      amount: debit,
      sign: "-",
      kind: "paid",
    };
  }

  return {
    amount: credit,
    sign: "+",
    kind: "received",
  };
}

export default function LedgerPaymentsClient() {
  const currentMonth = useMemo(getCurrentMonth, []);

  const [fromInput, setFromInput] = useState(currentMonth.from);
  const [toInput, setToInput] = useState(currentMonth.to);
  const [appliedFrom, setAppliedFrom] = useState(currentMonth.from);
  const [appliedTo, setAppliedTo] = useState(currentMonth.to);

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [restro, setRestro] = useState<any>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] =
    useState<PaymentFilter>("all");

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        from,
        to,
      });

      const response = await fetch(
        `/api/restro/ledger?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }
      );

      const json: ApiResponse = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Unable to load payment history");
      }

      setRestro(json.restro || null);
      setRows(
        (Array.isArray(json.rows) ? json.rows : []).filter(isPaymentEntry)
      );
      setGeneratedAt(json.generatedAt || null);
      setAppliedFrom(json.period?.from || from);
      setAppliedTo(json.period?.to || to);
    } catch (loadError: any) {
      setRestro(null);
      setRows([]);
      setGeneratedAt(null);
      setError(loadError?.message || "Unable to load payment history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments(currentMonth.from, currentMonth.to);
  }, [currentMonth.from, currentMonth.to, loadPayments]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!fromInput || !toInput) {
      setError("From Date and To Date are required");
      return;
    }

    if (fromInput > toInput) {
      setError("From Date, To Date se badi nahi ho sakti");
      return;
    }

    loadPayments(fromInput, toInput);
  }

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const timeA = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
        const timeB = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;

        if (timeA !== timeB) {
          return timeB - timeA;
        }

        return numberValue(b.RDSId) - numberValue(a.RDSId);
      }),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return sortedRows.filter((row) => {
      const type = paymentType(row);

      if (activeFilter !== "all" && type !== activeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        row.OrderId,
        row.EntrySource,
        row.EntrySourceLabel,
        row.Particular,
        row.PaymentMode,
        row.Remarks,
        row.CreatedAtFormatted,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .join(" ");

      return haystack.includes(query);
    });
  }, [activeFilter, searchText, sortedRows]);

  const paymentSummary = useMemo(() => {
    let totalPaid = 0;
    let totalReceived = 0;
    let paidCount = 0;
    let receivedCount = 0;

    for (const row of rows) {
      const type = paymentType(row);
      const amount = getPaymentAmount(row).amount;

      if (type === "paid") {
        totalPaid += amount;
        paidCount += 1;
      }

      if (type === "received") {
        totalReceived += amount;
        receivedCount += 1;
      }
    }

    return {
      totalPaid,
      totalReceived,
      paidCount,
      receivedCount,
      totalEntries: rows.length,
      netPayment: totalReceived - totalPaid,
    };
  }, [rows]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f9fc]">
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950">
              Payment History
            </h1>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Settlement paid and payment received
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

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[9px] font-black uppercase text-slate-500">
                From
              </label>

              <input
                type="date"
                value={fromInput}
                onChange={(event) => setFromInput(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-black uppercase text-slate-500">
                To
              </label>

              <input
                type="date"
                value={toInput}
                onChange={(event) => setToInput(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-3 h-10 w-full rounded-xl bg-blue-600 text-[10px] font-black text-white disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load Payments"}
          </button>
        </form>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-[9px] font-black uppercase tracking-wider text-blue-600">
            Restaurant
          </div>

          <div className="mt-1 text-base font-black text-slate-950">
            {restro?.RestroCode || "-"}
            {restro?.RestroName ? ` / ${restro.RestroName}` : ""}
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-500">
            {[restro?.StationCode, restro?.StationName]
              .filter(Boolean)
              .join(" - ") || "-"}
          </div>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="text-[9px] font-black uppercase text-red-700">
              Settlement Paid
            </div>

            <div className="mt-1 text-lg font-black text-red-700">
              ₹{formatMoney(paymentSummary.totalPaid)}
            </div>

            <div className="mt-1 text-[9px] font-bold text-red-500">
              {paymentSummary.paidCount} entries
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-[9px] font-black uppercase text-emerald-700">
              Payment Received
            </div>

            <div className="mt-1 text-lg font-black text-emerald-700">
              ₹{formatMoney(paymentSummary.totalReceived)}
            </div>

            <div className="mt-1 text-[9px] font-bold text-emerald-500">
              {paymentSummary.receivedCount} entries
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[9px] font-black uppercase text-violet-700">
              Net Payment Movement
            </span>

            <span className="text-sm font-black text-slate-950">
              ₹{formatMoney(paymentSummary.netPayment)}
            </span>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search reference, remarks or payment mode"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold outline-none focus:border-blue-400"
          />

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              ["all", "All"],
              ["paid", "Paid"],
              ["received", "Received"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter(key as PaymentFilter)}
                className={[
                  "h-8 rounded-lg border text-[10px] font-black",
                  activeFilter === key
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-black text-slate-950">
              Payment Transactions
            </div>

            <div className="mt-0.5 text-[9px] font-bold text-slate-400">
              {formatDate(appliedFrom)} to {formatDate(appliedTo)}
              {visibleRows.length !== rows.length
                ? ` • ${visibleRows.length} shown`
                : ""}
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-xs font-bold text-slate-400">
              Loading payment history...
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="px-4 py-12 text-center text-xs font-bold text-slate-400">
              No payment records found
            </div>
          ) : (
            visibleRows.map((row, index) => {
              const payment = getPaymentAmount(row);
              const rdsId = String(row.RDSId ?? "").trim();

              const card = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={[
                          "inline-flex rounded-md border px-2 py-1 text-[9px] font-black",
                          payment.kind === "paid"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        ].join(" ")}
                      >
                        {paymentTitle(row)}
                      </span>

                      <div className="mt-2 break-all text-[10px] font-black text-blue-700">
                        {row.OrderId || "No reference"}
                      </div>

                      <div className="mt-1 text-[10px] font-semibold text-slate-400">
                        {row.CreatedAtFormatted || row.CreatedAt || "-"}
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div
                        className={[
                          "text-base font-black",
                          payment.kind === "paid"
                            ? "text-red-700"
                            : "text-emerald-700",
                        ].join(" ")}
                      >
                        {payment.sign}₹{formatMoney(payment.amount)}
                      </div>

                      {row.PaymentMode ? (
                        <span className="mt-2 inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-black text-slate-600">
                          {row.PaymentMode}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-[8px] font-black uppercase text-slate-400">
                        Previous Balance
                      </div>

                      <div className="mt-1 text-xs font-black text-slate-900">
                        ₹{formatMoney(row.PreviousBal)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-[8px] font-black uppercase text-slate-400">
                        Current Balance
                      </div>

                      <div className="mt-1 text-xs font-black text-slate-900">
                        ₹{formatMoney(row.CurrentBal)}
                      </div>
                    </div>
                  </div>

                  {row.Remarks ? (
                    <div className="mt-3 text-[10px] font-semibold leading-5 text-slate-600">
                      <span className="font-black text-slate-500">
                        Remarks:
                      </span>{" "}
                      {row.Remarks}
                    </div>
                  ) : null}

                  {rdsId ? (
                    <div className="mt-3 text-right text-[9px] font-black text-blue-700">
                      View Receipt →
                    </div>
                  ) : null}
                </>
              );

              return rdsId ? (
                <Link
                  key={`${row.RDSId}-${index}`}
                  href={`/ledger/receipt/${encodeURIComponent(rdsId)}`}
                  className="block border-b border-slate-100 px-4 py-4 transition hover:bg-slate-50 active:bg-slate-100 last:border-b-0"
                >
                  {card}
                </Link>
              ) : (
                <article
                  key={`${row.RDSId}-${index}`}
                  className="border-b border-slate-100 px-4 py-4 last:border-b-0"
                >
                  {card}
                </article>
              );
            })
          )}
        </section>

        <div className="mt-3 text-center text-[9px] font-semibold text-slate-400">
          Generated: {generatedAt || "-"}
        </div>
      </main>
    </div>
  );
}
