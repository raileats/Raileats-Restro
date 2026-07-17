// app/ledger/receipt/[rdsId]/page.tsx

import LedgerReceiptClient from "@/components/restro/LedgerReceiptClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LedgerReceiptPage({
  params,
}: {
  params: Promise<{
    rdsId: string;
  }>;
}) {
  const { rdsId } = await params;

  return (
    <LedgerReceiptClient
      rdsId={rdsId}
    />
  );
}
