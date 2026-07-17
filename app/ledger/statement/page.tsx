// app/ledger/statement/page.tsx

import LedgerStatementClient from "@/components/restro/LedgerStatementClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LedgerStatementPage() {
  return <LedgerStatementClient />;
}
