"use client";

// components/restro/LedgerClient.tsx

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
  totalOrders: number;
  totalCreditNotes: number;
  totalDebitNotes: number;
  totalPaymentPaid: number;
  totalPaymentReceived: number;
  totalManual: number;
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

const EMPTY_SUMMARY:
  LedgerSummary = {
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
    totalOrders: 0,
    totalCreditNotes: 0,
    totalDebitNotes: 0,
    totalPaymentPaid: 0,
    totalPaymentReceived: 0,
    totalManual: 0,
  };

function getCurrentMonth() {
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

function formatMoney(
  value: unknown
) {
  return numberValue(
    value
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatDate(
  value: string
) {
  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  return match
    ? `${match[3]}-${match[2]}-${match[1]}`
    : value;
}

function amountClass(
  value: unknown
) {
  const amount =
    numberValue(value);

  if (
    amount > 0
  ) {
    return "text-emerald-700";
  }

  if (
    amount < 0
  ) {
    return "text-red-700";
  }

  return "text-slate-900";
}

function entryClass(
  source: unknown
) {
  const value =
    String(
      source ?? ""
    )
      .toLowerCase()
      .replace(
        /[^a-z]/g,
        ""
      );

  if (
    value ===
    "creditnote"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    value ===
    "debitnote"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    value ===
    "paymentpaid"
  ) {
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
  }

  if (
    value ===
    "paymentreceived"
  ) {
    return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }

  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function LedgerClient() {
  const currentMonth =
    useMemo(
      getCurrentMonth,
      []
    );

  const [
    fromInput,
    setFromInput,
  ] =
    useState(
      currentMonth.from
    );

  const [
    toInput,
    setToInput,
  ] =
    useState(
      currentMonth.to
    );

  const [
    appliedFrom,
    setAppliedFrom,
  ] =
    useState(
      currentMonth.from
    );

  const [
    appliedTo,
    setAppliedTo,
  ] =
    useState(
      currentMonth.to
    );

  const [
    summary,
    setSummary,
  ] =
    useState(
      EMPTY_SUMMARY
    );

  const [
    rows,
    setRows,
  ] =
    useState<LedgerRow[]>(
      []
    );

  const [
    restro,
    setRestro,
  ] =
    useState<any>(
      null
    );

  const [
    generatedAt,
    setGeneratedAt,
  ] =
    useState<string | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    exporting,
    setExporting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const loadLedger =
    useCallback(
      async (
        from: string,
        to: string
      ) => {
        setLoading(
          true
        );

        setError(
          null
        );

        try {
          const params =
            new URLSearchParams(
              {
                from,
                to,
              }
            );

          const response =
            await fetch(
              `/api/restro/ledger?${params.toString()}`,
              {
                method:
                  "GET",
                cache:
                  "no-store",
                credentials:
                  "include",
              }
            );

          const json:
            ApiResponse =
            await response
              .json();

          if (
            !response.ok ||
            !json.ok
          ) {
            throw new Error(
              json.error ||
              "Unable to load ledger"
            );
          }

          setRestro(
            json.restro ||
            null
          );

          setSummary(
            json.summary ||
            EMPTY_SUMMARY
          );

          setRows(
            Array.isArray(
              json.rows
            )
              ? json.rows
              : []
          );

          setGeneratedAt(
            json.generatedAt ||
            null
          );

          setAppliedFrom(
            json.period
              ?.from ||
            from
          );

          setAppliedTo(
            json.period
              ?.to ||
            to
          );
        } catch (
          loadError: any
        ) {
          setError(
            loadError
              ?.message ||
            "Unable to load ledger"
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    loadLedger(
      currentMonth.from,
      currentMonth.to
    );
  }, [
    currentMonth.from,
    currentMonth.to,
    loadLedger,
  ]);

  function handleSubmit(
    event:
      FormEvent
  ) {
    event.preventDefault();

    if (
      !fromInput ||
      !toInput
    ) {
      setError(
        "From Date and To Date are required"
      );

      return;
    }

    if (
      fromInput >
      toInput
    ) {
      setError(
        "From Date, To Date se badi nahi ho sakti"
      );

      return;
    }

    loadLedger(
      fromInput,
      toInput
    );
  }

  async function handleExport() {
    if (
      exporting ||
      loading
    ) {
      return;
    }

    setExporting(
      true
    );

    setError(
      null
    );

    try {
      const params =
        new URLSearchParams(
          {
            from:
              appliedFrom,
            to:
              appliedTo,
          }
        );

      const response =
        await fetch(
          `/api/restro/ledger/export?${params.toString()}`,
          {
            method:
              "GET",
            cache:
              "no-store",
            credentials:
              "include",
          }
        );

      if (
        !response.ok
      ) {
        const json =
          await response
            .json()
            .catch(
              () => ({})
            );

        throw new Error(
          json.error ||
          "Unable to export ledger"
        );
      }

      const blob =
        await response
          .blob();

      const disposition =
        response.headers.get(
          "content-disposition"
        ) || "";

      const match =
        disposition.match(
          /filename="?([^"]+)"?/i
        );

      const fileName =
        match?.[1] ||
        "RailEats-Vendor-Ledger.csv";

      const url =
        URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href =
        url;

      anchor.download =
        fileName;

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();

      URL.revokeObjectURL(
        url
      );
    } catch (
      exportError: any
    ) {
      setError(
        exportError
          ?.message ||
        "Unable to export ledger"
      );
    } finally {
      setExporting(
        false
      );
    }
  }

  const sortedRows =
    useMemo(
      () =>
        [...rows].sort(
          (
            a,
            b
          ) => {
            const timeA =
              a.CreatedAt
                ? new Date(
                    a.CreatedAt
                  ).getTime()
                : 0;

            const timeB =
              b.CreatedAt
                ? new Date(
                    b.CreatedAt
                  ).getTime()
                : 0;

            if (
              timeA !==
              timeB
            ) {
              return (
                timeB -
                timeA
              );
            }

            return (
              numberValue(
                b.RDSId
              ) -
              numberValue(
                a.RDSId
              )
            );
          }
        ),
      [
        rows,
      ]
    );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f9fc]">
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-4 py-4">
        <h1 className="text-2xl font-black tracking-tight text-slate-950">
          Restaurant Ledger
        </h1>

        <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Balance, statements and settlement history
        </p>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        <form
          onSubmit={
            handleSubmit
          }
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                From
              </label>

              <input
                type="date"
                value={
                  fromInput
                }
                onChange={(
                  event
                ) =>
                  setFromInput(
                    event.target.value
                  )
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                To
              </label>

              <input
                type="date"
                value={
                  toInput
                }
                onChange={(
                  event
                ) =>
                  setToInput(
                    event.target.value
                  )
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 text-[11px] font-bold"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setFromInput(
                  currentMonth.from
                );

                setToInput(
                  currentMonth.to
                );

                loadLedger(
                  currentMonth.from,
                  currentMonth.to
                );
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white text-[10px] font-black text-slate-600"
            >
              This Month
            </button>

            <button
              type="submit"
              disabled={
                loading
              }
              className="h-10 rounded-xl bg-blue-600 text-[10px] font-black text-white disabled:opacity-50"
            >
              {loading
                ? "Loading..."
                : "Load"}
            </button>

            <button
              type="button"
              onClick={
                handleExport
              }
              disabled={
                loading ||
                exporting
              }
              className="h-10 rounded-xl bg-emerald-600 text-[10px] font-black text-white disabled:opacity-50"
            >
              {exporting
                ? "Exporting..."
                : "Excel"}
            </button>
          </div>
        </form>

        {error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-600">
            Restaurant
          </div>

          <div className="mt-1 text-base font-black text-slate-950">
            {restro
              ?.RestroCode ||
              "-"}
            {restro
              ?.RestroName
              ? ` / ${restro.RestroName}`
              : ""}
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-500">
            {[
              restro
                ?.StationCode,
              restro
                ?.StationName,
            ]
              .filter(Boolean)
              .join(" - ") ||
              "-"}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
            <div className="text-[10px] font-black uppercase text-cyan-700">
              Closing Balance
            </div>

            <div
              className={[
                "mt-1 text-xl font-black",
                amountClass(
                  summary.closingBalance
                ),
              ].join(" ")}
            >
              ₹{formatMoney(
                summary.closingBalance
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
            <div className="text-[10px] font-black uppercase text-violet-700">
              Net Movement
            </div>

            <div
              className={[
                "mt-1 text-xl font-black",
                amountClass(
                  summary.netMovement
                ),
              ].join(" ")}
            >
              ₹{formatMoney(
                summary.netMovement
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="text-[10px] font-black uppercase text-red-700">
              Total Debit
            </div>

            <div className="mt-1 text-lg font-black text-red-700">
              ₹{formatMoney(
                summary.totalDebit
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-[10px] font-black uppercase text-emerald-700">
              Total Credit
            </div>

            <div className="mt-1 text-lg font-black text-emerald-700">
              ₹{formatMoney(
                summary.totalCredit
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            [
              "Orders",
              summary.orderCount,
            ],
            [
              "Credit",
              summary.creditNoteCount,
            ],
            [
              "Debit",
              summary.debitNoteCount,
            ],
            [
              "Paid",
              summary.paymentPaidCount,
            ],
            [
              "Received",
              summary.paymentReceivedCount,
            ],
            [
              "Entries",
              summary.totalTransactions,
            ],
          ].map(
            (
              item
            ) => (
              <div
                key={
                  String(
                    item[0]
                  )
                }
                className="rounded-xl border border-slate-200 bg-white p-3 text-center"
              >
                <div className="text-[9px] font-black uppercase text-slate-400">
                  {item[0]}
                </div>

                <div className="mt-1 text-base font-black text-slate-900">
                  {item[1]}
                </div>
              </div>
            )
          )}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-black text-slate-950">
                Transactions
              </div>

              <div className="text-[9px] font-bold text-slate-400">
                {formatDate(
                  appliedFrom
                )}{" "}
                to{" "}
                {formatDate(
                  appliedTo
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                window.print()
              }
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[9px] font-black text-slate-600"
            >
              Print / PDF
            </button>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-xs font-bold text-slate-400">
              Loading ledger...
            </div>
          ) : sortedRows.length ===
            0 ? (
            <div className="px-4 py-12 text-center text-xs font-bold text-slate-400">
              No ledger records found
            </div>
          ) : (
            <div>
              {sortedRows.map(
                (
                  row,
                  index
                ) => (
                  <div
                    key={`${row.RDSId}-${index}`}
                    className="border-b border-slate-100 px-4 py-3 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span
                          className={[
                            "inline-flex rounded-md border px-2 py-1 text-[9px] font-black",
                            entryClass(
                              row.EntrySource
                            ),
                          ].join(" ")}
                        >
                          {row.EntrySourceLabel ||
                            row.EntrySource ||
                            "-"}
                        </span>

                        <div className="mt-2 truncate text-xs font-black text-slate-900">
                          {row.Particular ||
                            "-"}
                        </div>

                        <div className="mt-1 truncate text-[10px] font-semibold text-slate-500">
                          {row.OrderId ||
                            "-"}
                        </div>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        {numberValue(
                          row.Debit
                        ) >
                        0 ? (
                          <div className="text-sm font-black text-red-700">
                            -₹{formatMoney(
                              row.Debit
                            )}
                          </div>
                        ) : (
                          <div className="text-sm font-black text-emerald-700">
                            +₹{formatMoney(
                              row.Credit
                            )}
                          </div>
                        )}

                        <div
                          className={[
                            "mt-1 text-[10px] font-black",
                            amountClass(
                              row.CurrentBal
                            ),
                          ].join(" ")}
                        >
                          Bal ₹{formatMoney(
                            row.CurrentBal
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-[9px] font-semibold text-slate-400">
                      <span>
                        {row.CreatedAtFormatted ||
                          row.CreatedAt ||
                          "-"}
                      </span>

                      <span>
                        {row.PaymentMode ||
                          "-"}
                      </span>
                    </div>

                    {row.Remarks ? (
                      <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[9px] font-semibold text-slate-600">
                        {row.Remarks}
                      </div>
                    ) : null}
                  </div>
                )
              )}
            </div>
          )}
        </div>

        <div className="mt-3 text-center text-[9px] font-semibold text-slate-400">
          Generated:{" "}
          {generatedAt ||
            "-"}
        </div>
      </main>
    </div>
  );
}
