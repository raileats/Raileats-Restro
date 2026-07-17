"use client";

// components/restro/LedgerSettlementClient.tsx

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type SettlementRequest = {
  Id: number | string;
  RequestNo: string | null;
  Amount: number | string;
  CurrentBalance: number | string;
  Status: string;
  VendorRemarks: string | null;
  AdminRemarks: string | null;
  UTR: string | null;
  LedgerRDSId: number | string | null;
  RequestDateFormatted: string | null;
  ApprovedDateFormatted: string | null;
  RejectedDateFormatted: string | null;
  PaidDateFormatted: string | null;
  UpdatedAtFormatted: string | null;
};

type SettlementResponse = {
  ok: boolean;
  minimumSettlement?: number;
  restro?: any;
  summary?: {
    currentBalance: number;
    pendingAmount: number;
    availableBalance: number;
    activeRequestCount: number;
    totalRequestCount: number;
  };
  requests?: SettlementRequest[];
  generatedAt?: string | null;
  error?: string;
  message?: string;
};

const EMPTY_SUMMARY = {
  currentBalance: 0,
  pendingAmount: 0,
  availableBalance: 0,
  activeRequestCount: 0,
  totalRequestCount: 0,
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

function statusClasses(status: unknown) {
  const value = String(status ?? "").toLowerCase();

  if (value === "paid") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "approved") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (value === "rejected" || value === "cancelled") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function LedgerSettlementClient() {
  const [restro, setRestro] = useState<any>(null);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [requests, setRequests] = useState<SettlementRequest[]>([]);
  const [minimumSettlement, setMinimumSettlement] = useState(1000);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const [amountInput, setAmountInput] = useState("");
  const [remarksInput, setRemarksInput] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettlement = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/restro/settlement", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const json: SettlementResponse = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Unable to load settlement");
      }

      setRestro(json.restro || null);
      setSummary(json.summary || EMPTY_SUMMARY);
      setRequests(Array.isArray(json.requests) ? json.requests : []);
      setMinimumSettlement(numberValue(json.minimumSettlement) || 1000);
      setGeneratedAt(json.generatedAt || null);
    } catch (loadError: any) {
      setError(loadError?.message || "Unable to load settlement");
      setRestro(null);
      setSummary(EMPTY_SUMMARY);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettlement();
  }, [loadSettlement]);

  const enteredAmount = useMemo(
    () => numberValue(amountInput),
    [amountInput]
  );

  const canSubmit =
    !loading &&
    !submitting &&
    enteredAmount >= minimumSettlement &&
    enteredAmount <= summary.availableBalance;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (enteredAmount < minimumSettlement) {
      setError(
        `Minimum settlement amount ₹${formatMoney(
          minimumSettlement
        )} required`
      );
      return;
    }

    if (enteredAmount > summary.availableBalance) {
      setError(
        `Available settlement balance sirf ₹${formatMoney(
          summary.availableBalance
        )} hai`
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/restro/settlement", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: enteredAmount,
          remarks: remarksInput,
        }),
      });

      const json: SettlementResponse = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(
          json.error || "Unable to submit settlement request"
        );
      }

      setSuccess(
        json.message || "Settlement request submitted successfully"
      );
      setAmountInput("");
      setRemarksInput("");
      await loadSettlement();
    } catch (submitError: any) {
      setError(
        submitError?.message || "Unable to submit settlement request"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f9fc]">
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950">
              Settlement Request
            </h1>

            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Request payout from available ledger balance
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
        {error ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-bold text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700">
            {success}
          </div>
        ) : null}

        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-[9px] font-black uppercase tracking-wider text-blue-600">
            Restaurant
          </div>

          <div className="mt-1 text-base font-black text-slate-950">
            {loading
              ? "Loading..."
              : `${restro?.RestroCode || "-"}${
                  restro?.RestroName ? ` / ${restro.RestroName}` : ""
                }`}
          </div>

          <div className="mt-1 text-xs font-semibold text-slate-500">
            {[restro?.StationCode, restro?.StationName]
              .filter(Boolean)
              .join(" - ") || "-"}
          </div>
        </section>

        <section className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-[9px] font-black uppercase text-slate-400">
              Current Balance
            </div>

            <div className="mt-1 text-lg font-black text-slate-950">
              ₹{formatMoney(summary.currentBalance)}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="text-[9px] font-black uppercase text-amber-700">
              Pending Requests
            </div>

            <div className="mt-1 text-lg font-black text-amber-700">
              ₹{formatMoney(summary.pendingAmount)}
            </div>

            <div className="mt-1 text-[9px] font-bold text-amber-600">
              {summary.activeRequestCount} active
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-[9px] font-black uppercase text-emerald-700">
              Available Settlement
            </div>

            <div className="mt-1 text-lg font-black text-emerald-700">
              ₹{formatMoney(summary.availableBalance)}
            </div>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="text-sm font-black text-slate-950">
            New Settlement Request
          </div>

          <div className="mt-1 text-[9px] font-bold text-slate-400">
            Minimum settlement ₹{formatMoney(minimumSettlement)}
          </div>

          <label className="mt-4 block text-[9px] font-black uppercase text-slate-500">
            Settlement Amount
          </label>

          <div className="mt-1 flex h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400">
            <span className="text-sm font-black text-slate-500">₹</span>

            <input
              type="number"
              min={minimumSettlement}
              max={Math.max(summary.availableBalance, 0)}
              step="0.01"
              inputMode="decimal"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder="Enter amount"
              className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-black text-slate-950 outline-none"
            />

            <button
              type="button"
              onClick={() =>
                setAmountInput(
                  summary.availableBalance > 0
                    ? String(summary.availableBalance)
                    : ""
                )
              }
              disabled={summary.availableBalance < minimumSettlement}
              className="text-[9px] font-black uppercase text-blue-600 disabled:text-slate-300"
            >
              Maximum
            </button>
          </div>

          <label className="mt-4 block text-[9px] font-black uppercase text-slate-500">
            Remarks
          </label>

          <textarea
            value={remarksInput}
            onChange={(event) =>
              setRemarksInput(event.target.value.slice(0, 500))
            }
            rows={3}
            placeholder="Optional settlement remarks"
            className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-semibold outline-none focus:border-blue-400"
          />

          <div className="mt-1 text-right text-[8px] font-bold text-slate-400">
            {remarksInput.length}/500
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-3 h-11 w-full rounded-xl bg-emerald-600 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Submitting..." : "Request Settlement"}
          </button>

          {!loading &&
          summary.availableBalance < minimumSettlement ? (
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-[10px] font-bold text-slate-500">
              Settlement request ke liye minimum available balance ₹
              {formatMoney(minimumSettlement)} hona chahiye.
            </div>
          ) : null}
        </form>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-black text-slate-950">
              Request History
            </div>

            <div className="mt-0.5 text-[9px] font-bold text-slate-400">
              Latest requests first
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-xs font-bold text-slate-400">
              Loading settlement requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="px-4 py-12 text-center text-xs font-bold text-slate-400">
              No settlement request found
            </div>
          ) : (
            requests.map((request) => (
              <article
                key={String(request.Id)}
                className="border-b border-slate-100 px-4 py-4 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-all text-xs font-black text-blue-700">
                      {request.RequestNo || `Request #${request.Id}`}
                    </div>

                    <div className="mt-1 text-[10px] font-semibold text-slate-400">
                      {request.RequestDateFormatted || "-"}
                    </div>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="text-base font-black text-slate-950">
                      ₹{formatMoney(request.Amount)}
                    </div>

                    <span
                      className={[
                        "mt-2 inline-flex rounded-md border px-2 py-1 text-[9px] font-black",
                        statusClasses(request.Status),
                      ].join(" ")}
                    >
                      {request.Status || "Pending"}
                    </span>
                  </div>
                </div>

                {request.UTR ? (
                  <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-bold text-emerald-700">
                    UTR: {request.UTR}
                  </div>
                ) : null}

                {request.VendorRemarks ? (
                  <div className="mt-3 text-[10px] font-semibold leading-5 text-slate-600">
                    <span className="font-black text-slate-500">
                      Your Remarks:
                    </span>{" "}
                    {request.VendorRemarks}
                  </div>
                ) : null}

                {request.AdminRemarks ? (
                  <div className="mt-2 text-[10px] font-semibold leading-5 text-slate-600">
                    <span className="font-black text-slate-500">
                      Admin Remarks:
                    </span>{" "}
                    {request.AdminRemarks}
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {request.ApprovedDateFormatted ? (
                    <div className="rounded-xl bg-blue-50 px-3 py-2">
                      <div className="text-[8px] font-black uppercase text-blue-500">
                        Approved
                      </div>
                      <div className="mt-1 text-[9px] font-bold text-blue-800">
                        {request.ApprovedDateFormatted}
                      </div>
                    </div>
                  ) : null}

                  {request.PaidDateFormatted ? (
                    <div className="rounded-xl bg-emerald-50 px-3 py-2">
                      <div className="text-[8px] font-black uppercase text-emerald-500">
                        Paid
                      </div>
                      <div className="mt-1 text-[9px] font-bold text-emerald-800">
                        {request.PaidDateFormatted}
                      </div>
                    </div>
                  ) : null}

                  {request.RejectedDateFormatted ? (
                    <div className="rounded-xl bg-red-50 px-3 py-2">
                      <div className="text-[8px] font-black uppercase text-red-500">
                        Rejected
                      </div>
                      <div className="mt-1 text-[9px] font-bold text-red-800">
                        {request.RejectedDateFormatted}
                      </div>
                    </div>
                  ) : null}
                </div>

                {request.LedgerRDSId ? (
                  <Link
                    href={`/ledger/receipt/${encodeURIComponent(
                      String(request.LedgerRDSId)
                    )}`}
                    className="mt-3 block text-right text-[9px] font-black text-blue-700"
                  >
                    View Payment Receipt →
                  </Link>
                ) : null}
              </article>
            ))
          )}
        </section>

        <div className="mt-3 text-center text-[9px] font-semibold text-slate-400">
          Generated: {generatedAt || "-"}
        </div>
      </main>
    </div>
  );
}
