export type TicketPayment = {
  orderId: string; totalSatang: number; paidSatang: number; remainingSatang: number;
  balanceDueAt: number; status: 'outstanding' | 'paid';
};
export function ticketPayment(order: { id: string; totalSatang: number; paidSatang: number; balanceDueAt: number; status: string }): TicketPayment | null {
  if (!['deposit_paid', 'paid'].includes(order.status) || !Number.isSafeInteger(order.totalSatang) || order.totalSatang <= 0 || !Number.isSafeInteger(order.paidSatang) || order.paidSatang <= 0 || order.paidSatang > order.totalSatang) return null;
  const remainingSatang = order.totalSatang - order.paidSatang;
  return { orderId: order.id, totalSatang: order.totalSatang, paidSatang: order.paidSatang, remainingSatang, balanceDueAt: order.balanceDueAt, status: remainingSatang === 0 ? 'paid' : 'outstanding' };
}
export function ticketPaymentHref(orderId: string) {
  return `/payments?orderId=${encodeURIComponent(orderId)}&pay=balance`;
}
