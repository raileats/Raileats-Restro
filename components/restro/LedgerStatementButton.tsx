"use client";

// components/restro/LedgerStatementButton.tsx

import Link from "next/link";

export default function LedgerStatementButton() {
  return (
    <Link
      href="/ledger/statement"
      className="flex h-10 items-center justify-center rounded-xl bg-violet-600 px-3 text-[10px] font-black text-white"
    >
      PDF Statement
    </Link>
  );
}
