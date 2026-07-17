"use client";

// components/restro/LedgerStatementClient.tsx

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

type LedgerSummary = {
  openingBalance: number;
  closingBalance: number;
  netMovement: number;
  totalDebit: number;
  totalCredit: number;
  totalTransactions: number;
  orderCount: number;
  creditNoteCount: number;
  debitNoteCount: number;
  paymentPaidCount: number;
  paymentReceivedCount: number;
  manualCount: number;
};

type ApiResponse = {
  ok: boolean;
  period?: {
    from: string;
    to: string;
  };
  restro?: any;
  summary?: LedgerSummary;
  rows?: LedgerRow[];
  generatedAt?: string | null;
  error?: string;
};

const EMPTY_SUMMARY: LedgerSummary = {
  openingBalance: 0,
  closingBalance: 0,
  netMovement: 0,
  totalDebit: 0,
  totalCredit: 0,
  totalTransactions: 0,
  orderCount: 0,
  creditNoteCount: 0,
  debitNoteCount: 0,
  paymentPaidCount: 0,
  paymentReceivedCount: 0,
  manualCount: 0,
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

function formatDate(value: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  return match
    ? `${match[3]}-${match[2]}-${match[1]}`
    : value || "-";
}

function getCurrentMonthValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const values: Record<string, string> = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}`;
}

function monthRange(monthValue: string) {
  const match = monthValue.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

function amountSignClass(debit: unknown, credit: unknown) {
  if (numberValue(debit) > 0) {
    return "text-red-700";
  }

  if (numberValue(credit) > 0) {
    return "text-emerald-700";
  }

  return "text-slate-700";
}

export default function LedgerStatementClient() {
  const currentMonthValue = useMemo(getCurrentMonthValue, []);
  const initialRange = useMemo(
    () => monthRange(currentMonthValue)!,
    [currentMonthValue]
  );

  const [monthInput, setMonthInput] = useState(currentMonthValue);
  const [fromInput, setFromInput] = useState(initialRange.from);
  const [toInput, setToInput] = useState(initialRange.to);

  const [appliedFrom, setAppliedFrom] = useState(initialRange.from);
  const [appliedTo, setAppliedTo] = useState(initialRange.to);

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [restro, setRestro] = useState<any>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatement = useCallback(async (from: string, to: string) => {
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
        throw new Error(json.error || "Unable to load statement");
      }

      setRestro(json.restro || null);
      setSummary(json.summary || EMPTY_SUMMARY);
      setRows(Array.isArray(json.rows) ? json.rows : []);
      setGeneratedAt(json.generatedAt || null);
      setAppliedFrom(json.period?.from || from);
      setAppliedTo(json.period?.to || to);
    } catch (loadError: any) {
      setRestro(null);
      setSummary(EMPTY_SUMMARY);
      setRows([]);
      setGeneratedAt(null);
      setError(loadError?.message || "Unable to load statement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatement(initialRange.from, initialRange.to);
  }, [initialRange.from, initialRange.to, loadStatement]);

  function handleMonthChange(value: string) {
    setMonthInput(value);

    const range = monthRange(value);

    if (!range) {
      return;
    }

    setFromInput(range.from);
    setToInput(range.to);
  }

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

    loadStatement(fromInput, toInput);
  }

  const statementRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const timeA = a.CreatedAt ? new Date(a.CreatedAt).getTime() : 0;
        const timeB = b.CreatedAt ? new Date(b.CreatedAt).getTime() : 0;

        if (timeA !== timeB) {
          return timeA - timeB;
        }

        return numberValue(a.RDSId) - numberValue(b.RDSId);
      }),
    [rows]
  );

  return (
    <div className="statement-screen min-h-full bg-slate-100">
      <div className="statement-toolbar sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-950">
              Ledger Statement
            </h1>

            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Professional print and PDF statement
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="/ledger"
              className="flex h-9 items-center rounded-lg border border-slate-200 px-3 text-[10px] font-black text-slate-600"
            >
              Back
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || !!error}
              className="h-9 rounded-lg bg-blue-600 px-3 text-[10px] font-black text-white disabled:opacity-50"
            >
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <div className="statement-controls mx-auto max-w-7xl px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-[9px] font-black uppercase text-slate-500">
                Month
              </label>

              <input
                type="month"
                value={monthInput}
                onChange={(event) => handleMonthChange(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-blue-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-[9px] font-black uppercase text-slate-500">
                From
              </label>

              <input
                type="date"
                value={fromInput}
                onChange={(event) => setFromInput(event.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-blue-400"
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
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-blue-400"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="h-10 w-full rounded-xl bg-slate-900 text-xs font-black text-white disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load Statement"}
              </button>
            </div>
          </div>
        </form>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <main className="statement-paper mx-auto mb-8 max-w-7xl bg-white shadow-xl">
        <header className="border-b-2 border-slate-900 px-8 py-7">
          <div className="flex items-start justify-between gap-8">
            <div>
              <div className="text-3xl font-black tracking-tight text-slate-950">
                RailEats
              </div>

              <div className="mt-1 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Vendor Ledger Statement
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-black uppercase text-slate-400">
                Statement Period
              </div>

              <div className="mt-1 text-sm font-black text-slate-900">
                {formatDate(appliedFrom)} to {formatDate(appliedTo)}
              </div>

              <div className="mt-1 text-[9px] font-semibold text-slate-400">
                Generated: {generatedAt || "-"}
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-8 border-b border-slate-200 px-8 py-6">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Restaurant
            </div>

            <div className="mt-2 text-lg font-black text-slate-950">
              {restro?.RestroCode || "-"}
              {restro?.RestroName ? ` / ${restro.RestroName}` : ""}
            </div>

            <div className="mt-1 text-xs font-semibold text-slate-500">
              {[restro?.StationCode, restro?.StationName]
                .filter(Boolean)
                .join(" - ") || "-"}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-[9px] font-black uppercase text-slate-400">
                Opening Balance
              </div>

              <div className="mt-1 text-base font-black text-slate-950">
                ₹{formatMoney(summary.openingBalance)}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-[9px] font-black uppercase text-slate-400">
                Closing Balance
              </div>

              <div className="mt-1 text-base font-black text-slate-950">
                ₹{formatMoney(summary.closingBalance)}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-4 border-b border-slate-200">
          <div className="border-r border-slate-200 px-6 py-4">
            <div className="text-[9px] font-black uppercase text-slate-400">
              Total Debit
            </div>

            <div className="mt-1 text-base font-black text-red-700">
              ₹{formatMoney(summary.totalDebit)}
            </div>
          </div>

          <div className="border-r border-slate-200 px-6 py-4">
            <div className="text-[9px] font-black uppercase text-slate-400">
              Total Credit
            </div>

            <div className="mt-1 text-base font-black text-emerald-700">
              ₹{formatMoney(summary.totalCredit)}
            </div>
          </div>

          <div className="border-r border-slate-200 px-6 py-4">
            <div className="text-[9px] font-black uppercase text-slate-400">
              Net Movement
            </div>

            <div className="mt-1 text-base font-black text-slate-950">
              ₹{formatMoney(summary.netMovement)}
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="text-[9px] font-black uppercase text-slate-400">
              Entries
            </div>

            <div className="mt-1 text-base font-black text-slate-950">
              {summary.totalTransactions}
            </div>
          </div>
        </section>

        <section>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-3 py-3 text-[8px] font-black uppercase">
                    Date
                  </th>
                  <th className="px-3 py-3 text-[8px] font-black uppercase">
                    Entry
                  </th>
                  <th className="px-3 py-3 text-[8px] font-black uppercase">
                    Reference
                  </th>
                  <th className="px-3 py-3 text-[8px] font-black uppercase">
                    Payment
                  </th>
                  <th className="px-3 py-3 text-right text-[8px] font-black uppercase">
                    Debit
                  </th>
                  <th className="px-3 py-3 text-right text-[8px] font-black uppercase">
                    Credit
                  </th>
                  <th className="px-3 py-3 text-right text-[8px] font-black uppercase">
                    Balance
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-xs font-bold text-slate-400"
                    >
                      Loading statement...
                    </td>
                  </tr>
                ) : statementRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-xs font-bold text-slate-400"
                    >
                      No ledger records found
                    </td>
                  </tr>
                ) : (
                  statementRows.map((row, index) => (
                    <tr
                      key={`${row.RDSId}-${index}`}
                      className="border-b border-slate-100 align-top"
                    >
                      <td className="whitespace-nowrap px-3 py-3 text-[9px] font-semibold text-slate-500">
                        {row.CreatedAtFormatted || row.CreatedAt || "-"}
                      </td>

                      <td className="px-3 py-3">
                        <div className="text-[9px] font-black text-slate-900">
                          {row.EntrySourceLabel || row.EntrySource || "-"}
                        </div>

                        {row.Remarks ? (
                          <div className="mt-1 max-w-[220px] text-[8px] leading-4 text-slate-400">
                            {row.Remarks}
                          </div>
                        ) : null}
                      </td>

                      <td className="break-all px-3 py-3 text-[9px] font-bold text-slate-700">
                        {row.OrderId || "-"}
                      </td>

                      <td className="px-3 py-3 text-[9px] font-bold text-slate-600">
                        {row.PaymentMode || "-"}
                      </td>

                      <td
                        className={[
                          "px-3 py-3 text-right text-[9px] font-black",
                          amountSignClass(row.Debit, 0),
                        ].join(" ")}
                      >
                        {numberValue(row.Debit) > 0
                          ? `₹${formatMoney(row.Debit)}`
                          : "-"}
                      </td>

                      <td
                        className={[
                          "px-3 py-3 text-right text-[9px] font-black",
                          amountSignClass(0, row.Credit),
                        ].join(" ")}
                      >
                        {numberValue(row.Credit) > 0
                          ? `₹${formatMoney(row.Credit)}`
                          : "-"}
                      </td>

                      <td className="px-3 py-3 text-right text-[9px] font-black text-slate-950">
                        ₹{formatMoney(row.CurrentBal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot>
                <tr className="bg-slate-50">
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-right text-[9px] font-black uppercase text-slate-500"
                  >
                    Statement Total
                  </td>

                  <td className="px-3 py-4 text-right text-[10px] font-black text-red-700">
                    ₹{formatMoney(summary.totalDebit)}
                  </td>

                  <td className="px-3 py-4 text-right text-[10px] font-black text-emerald-700">
                    ₹{formatMoney(summary.totalCredit)}
                  </td>

                  <td className="px-3 py-4 text-right text-[10px] font-black text-slate-950">
                    ₹{formatMoney(summary.closingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <footer className="grid grid-cols-2 gap-8 border-t border-slate-200 px-8 py-8">
          <div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Important Note
            </div>

            <p className="mt-2 max-w-xl text-[9px] leading-5 text-slate-500">
              This statement is generated from the RailEats vendor ledger.
              Please report any mismatch with the relevant Order ID, payment
              reference and statement period.
            </p>
          </div>

          <div className="text-right">
            <div className="mt-8 inline-block min-w-[180px] border-t border-slate-400 pt-2 text-center text-[9px] font-black text-slate-600">
              Authorised Statement
            </div>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          body {
            background: #ffffff !important;
          }

          nav,
          footer:not(.statement-paper footer),
          .statement-toolbar,
          .statement-controls {
            display: none !important;
          }

          .statement-screen {
            min-height: auto !important;
            background: #ffffff !important;
          }

          .statement-paper {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
          }

          .statement-paper header,
          .statement-paper section,
          .statement-paper footer {
            break-inside: avoid;
          }

          .statement-paper tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
