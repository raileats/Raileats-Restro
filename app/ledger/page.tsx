"use client";

// app/ledger/page.tsx

import Link from "next/link";

export default function LedgerPage() {
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

      <main className="flex-1 overflow-y-auto px-4 py-5">
        <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-blue-600">
            Secure Ledger
          </div>

          <h2 className="mt-3 text-2xl font-black text-slate-950">
            Vendor Ledger setup is next
          </h2>

          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
            Secure session aur common navigation successfully active hain.
            Agle phase me yahan current balance, orders, credit/debit notes,
            payments, statement download aur receipts aayenge.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-400">
                Current Balance
              </div>

              <div className="mt-2 text-xl font-black text-slate-300">
                ₹0.00
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-400">
                This Month
              </div>

              <div className="mt-2 text-xl font-black text-slate-300">
                Coming next
              </div>
            </div>
          </div>

          <Link
            href="/orders"
            className="mt-6 flex h-12 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-100"
          >
            Back to Orders
          </Link>
        </div>
      </main>
    </div>
  );
}
