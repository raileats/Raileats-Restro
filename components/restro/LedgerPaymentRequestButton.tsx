"use client";

import Link from "next/link";

export default function LedgerPaymentRequestButton() {
  return (
    <Link
      href="/ledger/payment-request"
      className="flex h-10 items-center justify-center rounded-xl bg-cyan-600 px-3 text-[10px] font-black text-white"
    >
      Report Payment
    </Link>
  );
}
