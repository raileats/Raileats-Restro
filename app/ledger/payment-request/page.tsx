// app/ledger/payment-request/page.tsx

import RestroPaymentRequestClient from "@/components/restro/RestroPaymentRequestClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PaymentRequestPage() {
  return <RestroPaymentRequestClient />;
}
