import { adminWith, forbidden } from '@/lib/adminAuth';
import { filterPayments, loadAdminPayments } from '@/lib/adminPayments';
import { listLegacyBookingCandidates, type LegacyBookingCandidate } from '@/lib/legacyPayments';
import { buildPaymentWorkbook } from '@/lib/paymentReport';

export const dynamic = 'force-dynamic';

function legacyRows(candidates: LegacyBookingCandidate[]) {
  return candidates.map(candidate => {
    const paidSatang = Math.max(0, candidate.totalSatang - candidate.balanceSatang);
    const state = candidate.paymentExempt
      ? 'paid'
      : candidate.balanceSatang === 0
        ? 'paid'
        : paidSatang > 0
          ? 'partial'
          : 'unpaid';
    const stateLabel = candidate.paymentExempt
      ? 'ยกเว้นค่าใช้จ่าย'
      : state === 'paid'
        ? 'ชำระครบถ้วน'
        : state === 'partial'
          ? 'ชำระบางส่วน'
          : 'รอชำระ';
    return {
      id: `booking:${candidate.bookingId}`,
      tripId: candidate.tripId,
      tripName: candidate.tripName,
      departureAt: Date.parse(`${candidate.departureDate}T00:00:00+07:00`),
      balanceDueAt: candidate.balanceDueAt || 0,
      createdAt: candidate.payments[0]?.paidAt || Date.now(),
      plan: 'full' as const,
      state: state as 'paid' | 'partial' | 'unpaid',
      stateLabel,
      totalSatang: candidate.totalSatang,
      paidSatang,
      balanceSatang: candidate.balanceSatang,
      overpaidSatang: candidate.overpaidSatang,
      openInvoiceSatang: 0,
      creditUsedSatang: 0,
      cashPaidSatang: paidSatang,
      userId: candidate.lineUserId,
      userName: candidate.lineUserName,
      booking: {
        id: candidate.bookingId,
        fullName: candidate.fullName,
        nickname: candidate.nickname,
        phone: candidate.phone,
        seatLabel: candidate.seatLabel,
        vanNumber: candidate.vanNumber,
        status: 'approved',
        paymentOrderId: candidate.paymentOrderId,
      },
      receipts: candidate.payments.map(payment => ({
        transRef: payment.transRef || `manual-${payment.id}`,
        paidAt: payment.paidAt,
        recordedAt: payment.recordedAt || payment.paidAt,
        amountSatang: payment.amountSatang,
        payerName: payment.payerName || '',
        payerBank: payment.payerBank || '',
        registrantName: payment.registrantName || candidate.fullName,
        seatLabel: payment.seatLabel || candidate.seatLabel,
        reviewRequired: !!payment.reviewRequired,
        source: payment.source || 'manual',
        slipKey: payment.receiptKey,
        method: payment.method,
        note: payment.note,
      })),
      adjustments: candidate.adjustments,
      seatHistory: [],
      lastVerification: null,
    };
  });
}

async function loadAllLegacyCandidates(options: { q: string; tripId: string; tripStatus: 'active' | 'completed' | 'all' }): Promise<LegacyBookingCandidate[]> {
  const first = await listLegacyBookingCandidates({ ...options, page: 1, pageSize: 50 });
  if (first.total <= first.rows.length) return first.rows as LegacyBookingCandidate[];
  const rows = [...first.rows];
  for (let page = 2; rows.length < first.total; page += 1) {
    const next = await listLegacyBookingCandidates({ ...options, page, pageSize: 50 });
    rows.push(...next.rows);
    if (!next.rows.length) break;
  }
  return rows as LegacyBookingCandidate[];
}

/** Excel (.xlsx) report of the payments matching the same filters as the admin list. */
export async function GET(request: Request) {
  try {
    if (!await adminWith(['payments'], 'view')) return forbidden('ไม่มีสิทธิ์ส่งออกข้อมูลการชำระเงิน');
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state') || 'received';
    const tripStatus = (searchParams.get('tripStatus') || 'active') as 'active' | 'completed' | 'all';
    const rows = state === 'bookings'
      ? legacyRows(await loadAllLegacyCandidates({ q: searchParams.get('q') || '', tripId: searchParams.get('tripId') || '', tripStatus }))
      : filterPayments(await loadAdminPayments(Date.now(), { tripStatus }), {
        q: searchParams.get('q') || '', tripId: searchParams.get('tripId') || '', state,
      });
    const file = await buildPaymentWorkbook(rows);
    const date = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payments-${date}.xlsx"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[admin-payments:export]', error instanceof Error ? error.message : error);
    return Response.json({ success: false, error: 'ส่งออกรายงานไม่สำเร็จ' }, { status: 500 });
  }
}
