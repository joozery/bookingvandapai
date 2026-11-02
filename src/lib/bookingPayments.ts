import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getMongoDb } from './mongodb';
import { ticketPayment, type TicketPayment } from './ticketPayment';
import type { PaymentOrder } from './paymentStore';

type Booking = { id: string; tripId: string; lineUserId: string; paymentOrderId?: string };
export async function bookingPayments(bookings: Booking[]): Promise<Map<string, TicketPayment>> {
  const result = new Map<string, TicketPayment>();
  if (!bookings.length) return result;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) return result;
  const db = await getMongoDb();
  let canViewAll = false;
  if (user.role === 'admin') {
    const admin = await db.collection('admins').findOne({ id: user.id, isBlocked: { $ne: true } });
    canViewAll = !!admin && (admin.username === 'admin' || ['bookings', 'checkin'].some(permission => admin.permissions?.includes(permission)));
  }
  const visible = bookings.filter(booking => booking.lineUserId === user.id || canViewAll);
  if (!visible.length) return result;
  const pairs = new Map(visible.map(booking => [`${booking.lineUserId}:${booking.tripId}`, { userId: booking.lineUserId, tripId: booking.tripId }]));
  const orders = await db.collection<PaymentOrder>('paymentOrders').find({ $or: [...pairs.values()], status: { $in: ['deposit_paid', 'paid'] } }, { projection: { id: 1, userId: 1, tripId: 1, totalSatang: 1, paidSatang: 1, balanceDueAt: 1, status: 1 } }).toArray();
  for (const booking of visible) {
    // Transfers from older booking records can resolve by owner + trip when
    // their replacement booking does not carry paymentOrderId yet.
    const order = orders.find(order => order.userId === booking.lineUserId && order.tripId === booking.tripId && (!booking.paymentOrderId || order.id === booking.paymentOrderId));
    const summary = order && ticketPayment(order);
    if (summary) result.set(booking.id, summary);
  }
  return result;
}
