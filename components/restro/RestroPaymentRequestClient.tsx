"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Row = {
  Id: number | string;
  RequestNo: string | null;
  Amount: number;
  PaymentDate: string;
  PaymentMode: string;
  BankName: string | null;
  UTR: string;
  ReferenceNo: string | null;
  ScreenshotUrl: string | null;
  ScreenshotName: string | null;
  Status: string;
  VendorRemarks: string | null;
  AdminRemarks: string | null;
  RequestedAtFormatted: string | null;
  ReceivedAtFormatted: string | null;
  RejectedAtFormatted: string | null;
  LedgerRDSId: number | string | null;
};

function money(value: unknown) {
  const n = Number(value);
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function todayIndia() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

function statusClass(status: string) {
  if (status === "Received") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "Rejected") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function RestroPaymentRequestClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIndia());
  const [paymentMode, setPaymentMode] = useState("NEFT");
  const [bankName, setBankName] = useState("");
  const [utr, setUtr] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/restro/payment-requests", {
        cache: "no-store",
        credentials: "include",
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Unable to load payment requests");
      }

      setRows(Array.isArray(json.rows) ? json.rows : []);
    } catch (e: any) {
      setRows([]);
      setError(e?.message || "Unable to load payment requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (Number(amount) <= 0) {
      setError("Valid payment amount is required");
      return;
    }

    if (!utr.trim()) {
      setError("UTR / Transaction ID is required");
      return;
    }

    if (!screenshot) {
      setError("Payment screenshot is required");
      return;
    }

    setSaving(true);

    try {
      const form = new FormData();
      form.set("amount", amount);
      form.set("paymentDate", paymentDate);
      form.set("paymentMode", paymentMode);
      form.set("bankName", bankName);
      form.set("utr", utr);
      form.set("referenceNo", referenceNo);
      form.set("remarks", remarks);
      form.set("screenshot", screenshot);

      const response = await fetch("/api/restro/payment-requests", {
        method: "POST",
        body: form,
        credentials: "include",
      });

      const json = await response.json();

      if (!response.ok || !json.ok) {
        throw new Error(json.error || "Unable to submit payment proof");
      }

      setSuccess(
        `${json.message || "Payment submitted"}${
          json.requestNo ? ` (${json.requestNo})` : ""
        }`
      );
      setAmount("");
      setPaymentDate(todayIndia());
      setPaymentMode("NEFT");
      setBankName("");
      setUtr("");
      setReferenceNo("");
      setRemarks("");
      setScreenshot(null);
      setInputKey((value) => value + 1);
      await load();
    } catch (e: any) {
      setError(e?.message || "Unable to submit payment proof");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#f7f9fc]">
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-950">
              Report Payment
            </h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Submit UTR and payment proof to RailEats
            </p>
          </div>

          <Link
            href="/ledger"
            className="rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600"
          >
            Back
          </Link>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4">
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

        <form
          onSubmit={submit}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="text-sm font-black text-slate-950">
            Payment Confirmation Request
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">
                Amount *
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
              />
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
              >
                {[
                  "NEFT",
                  "RTGS",
                  "IMPS",
                  "UPI",
                  "BANK TRANSFER",
                  "CHEQUE",
                  "CASH",
                ].map((mode) => (
                  <option key={mode}>{mode}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black uppercase text-slate-500">
                Bank Name
              </label>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
              />
            </div>
          </div>

          <label className="mt-3 block text-[9px] font-black uppercase text-slate-500">
            UTR / Transaction ID *
          </label>
          <input
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
          />

          <label className="mt-3 block text-[9px] font-black uppercase text-slate-500">
            Additional Reference
          </label>
          <input
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold"
          />

          <label className="mt-3 block text-[9px] font-black uppercase text-slate-500">
            Payment Screenshot / PDF *
          </label>
          <input
            key={inputKey}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold"
          />
          <div className="mt-1 text-[9px] font-semibold text-slate-400">
            JPG, PNG, WEBP or PDF • Maximum 5 MB
          </div>

          <label className="mt-3 block text-[9px] font-black uppercase text-slate-500">
            Remarks
          </label>
          <textarea
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value.slice(0, 500))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
          />

          <button
            type="submit"
            disabled={saving}
            className="mt-4 h-11 w-full rounded-xl bg-cyan-600 text-xs font-black text-white disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit Payment Proof"}
          </button>
        </form>

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-black">Payment Request History</div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400">
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-xs font-bold text-slate-400">
              No payment request found
            </div>
          ) : (
            rows.map((row) => (
              <article
                key={String(row.Id)}
                className="border-b border-slate-100 p-4 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-black text-blue-700">
                      {row.RequestNo || `#${row.Id}`}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold text-slate-400">
                      {row.RequestedAtFormatted || "-"}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-base font-black">
                      ₹{money(row.Amount)}
                    </div>
                    <span
                      className={`mt-1 inline-flex rounded-lg border px-2 py-1 text-[9px] font-black ${statusClass(
                        row.Status
                      )}`}
                    >
                      {row.Status}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <div className="text-[8px] font-black uppercase text-slate-400">
                      UTR
                    </div>
                    <div className="mt-1 break-all text-[10px] font-bold">
                      {row.UTR}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <div className="text-[8px] font-black uppercase text-slate-400">
                      Mode
                    </div>
                    <div className="mt-1 text-[10px] font-bold">
                      {row.PaymentMode}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {row.ScreenshotUrl ? (
                    <a
                      href={row.ScreenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-black text-blue-700"
                    >
                      View Proof
                    </a>
                  ) : (
                    <span />
                  )}

                  {row.LedgerRDSId ? (
                    <Link
                      href={`/ledger/receipt/${row.LedgerRDSId}`}
                      className="text-[10px] font-black text-emerald-700"
                    >
                      View Ledger Receipt →
                    </Link>
                  ) : null}
                </div>

                {row.AdminRemarks ? (
                  <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[10px] font-semibold text-slate-700">
                    Admin: {row.AdminRemarks}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
