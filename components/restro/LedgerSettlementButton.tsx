"use client";

// components/restro/LedgerSettlementButton.tsx

import Link from "next/link";

export default function LedgerSettlementButton() {
  return (
    <Link
      href="/ledger/settlement"
      className="flex h-10 items-center justify-center rounded-xl bg-emerald-600 px-3 text-[10px] font-black text-white"
    >
      Request Settlement
    </Link>
  );
}
