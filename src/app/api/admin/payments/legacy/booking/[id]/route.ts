import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { setLegacyBookingPaymentExempt } from '@/lib/legacyPayments';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(['payments:edit']);
  if (admin instanceof Response) return admin;
  try {
    const { id } = await params;
    const body = await request.json() as { paymentExempt?: boolean };
    if (typeof body.paymentExempt !== 'boolean') return NextResponse.json({ success: false, error: 'paymentExempt must be boolean' }, { status: 400 });
    await setLegacyBookingPaymentExempt(id, body.paymentExempt);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'update failed' }, { status: 500 });
  }
}
