// app/ledger/payments/page.tsx

import LedgerPaymentsClient from "@/components/restro/LedgerPaymentsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LedgerPaymentsPage() {
  return <LedgerPaymentsClient />;
}
