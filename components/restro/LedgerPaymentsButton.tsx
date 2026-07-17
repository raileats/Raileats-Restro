"use client";

// components/restro/LedgerPaymentsButton.tsx

import Link from "next/link";

export default function LedgerPaymentsButton() {
  return (
    <Link
      href="/ledger/payments"
      className="flex h-10 items-center justify-center rounded-xl bg-fuchsia-600 px-3 text-[10px] font-black text-white"
    >
      Payment History
    </Link>
  );
}
