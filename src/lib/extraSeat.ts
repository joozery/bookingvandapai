import type { Seat } from './db';

export const extraSeatId = (vanId: string) => `${vanId}-seat-extra`;

export function setExtraSeat(seats: Seat[], vanId: string, enabled: boolean): Seat[] {
  const existing = seats.find(seat => seat.id === extraSeatId(vanId));
  if (enabled) {
    if (existing) return seats;
    return [...seats, {
      id: extraSeatId(vanId), label: 'เสริม', type: 'customer',
      status: 'available', row: 4, col: 1.5,
    }];
  }
  if (existing && (existing.status !== 'available' || existing.bookingId)) {
    throw new Error('ไม่สามารถปิดเบาะเสริมที่มีการจองหรือรออนุมัติได้');
  }
  return seats.filter(seat => seat.id !== extraSeatId(vanId));
}
