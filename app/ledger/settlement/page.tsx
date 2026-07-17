// app/ledger/settlement/page.tsx

import LedgerSettlementClient from "@/components/restro/LedgerSettlementClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LedgerSettlementPage() {
  return <LedgerSettlementClient />;
}
