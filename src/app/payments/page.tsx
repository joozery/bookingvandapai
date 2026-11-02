import { Suspense } from 'react';
import PaymentPortal from '@/components/PaymentPortal';

export default function PaymentsPage() {
  return <Suspense fallback={<p className="p-10 text-center text-purple-700">กำลังเตรียมหน้าชำระเงิน…</p>}><PaymentPortal /></Suspense>;
}
