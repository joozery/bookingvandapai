import { Users, Calendar, Clock, UserCheck } from 'lucide-react';
import { formatThaiDate } from '@/lib/dateFormat';
import { dayKey, parseCalendarDay } from '@/lib/tripCalendar';
import type { Trip, Van } from './types';

export default function TripStaffTable({ trips, vans }: { trips: Trip[]; vans: Van[] }) {
  return (
    <section aria-labelledby="trip-staff-heading" className="min-w-0 overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-sm">
      <div className="border-b border-purple-100 p-4">
        <h3 id="trip-staff-heading" className="flex items-center gap-2 text-sm font-black text-slate-800">
          <Users className="h-4 w-4 text-purple-600" />
          ตารางทริปและสตาฟ
        </h3>
        <p className="mt-1 text-xs text-slate-500">{trips.length} ทริป · แสดงตามตัวกรองด้านบน · สตาฟจากข้อมูลประจำรถ</p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto" role="region" aria-label="ตารางรายชื่อทริปและสตาฟ" tabIndex={0}>
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-purple-50 text-xs text-purple-900">
            <tr>
              <th scope="col" className="px-4 py-3">ทริป</th>
              <th scope="col" className="px-4 py-3">วันเดินทาง</th>
              <th scope="col" className="px-4 py-3">ไกด์ประจำทริป</th>
              <th scope="col" className="px-4 py-3">สตาฟประจำรถ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-100">
            {trips.map(trip => {
              const start = parseCalendarDay(trip.departureDate);
              const duration = Number(trip.durationDays);
              const end = start !== null && Number.isSafeInteger(duration) && duration > 1 ? dayKey(start + duration - 1) : null;
              const tripVans = vans.filter(van => van.tripId === trip.id).sort((a, b) => a.vanNumber - b.vanNumber);
              return (
                <tr key={trip.id} className="align-top hover:bg-purple-50/40">
                  <th scope="row" className="max-w-xs break-words px-4 py-4 font-bold text-slate-800">{trip.name}</th>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    <p className="whitespace-nowrap">{formatThaiDate(trip.departureDate)}</p>
                    {end && <p className="mt-1 whitespace-nowrap">ถึง {formatThaiDate(end)}</p>}
                    <p className="mt-1">เวลาออกเดินทาง {trip.departureTime || 'ยังไม่ระบุ'}{trip.departureTime ? ' น.' : ''}</p>
                  </td>
                  <td className="max-w-48 break-words px-4 py-4 text-slate-700">{trip.guideName?.trim() || 'ยังไม่ระบุ'}</td>
                  <td className="px-4 py-4">
                    {tripVans.length === 0 ? <span className="text-xs text-slate-500">ยังไม่มีรถในทริปนี้</span> : (
                      <ul className="space-y-2">
                        {tripVans.map(van => {
                          const staff = [...new Set(van.seats.filter(seat => seat.type === 'staff').map(seat => seat.staffName?.trim() || seat.passengerName?.trim()).filter(Boolean))];
                          return (
                            <li key={van.id} className="max-w-xs rounded-lg bg-purple-50/70 px-3 py-2 text-xs">
                              <span className="font-bold text-purple-800">รถคันที่ {van.vanNumber}</span>
                              <span className="mt-1 block break-words text-slate-700">{staff.length ? staff.join(', ') : 'ยังไม่ระบุสตาฟ'}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
            {trips.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">ไม่พบทริปที่ตรงกับตัวกรอง</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden divide-y divide-purple-100">
        {trips.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">ไม่พบทริปที่ตรงกับตัวกรอง</div>
        ) : (
          trips.map(trip => {
            const start = parseCalendarDay(trip.departureDate);
            const duration = Number(trip.durationDays);
            const end = start !== null && Number.isSafeInteger(duration) && duration > 1 ? dayKey(start + duration - 1) : null;
            const tripVans = vans.filter(van => van.tripId === trip.id).sort((a, b) => a.vanNumber - b.vanNumber);
            return (
              <div key={trip.id} className="p-4 space-y-3 bg-white">
                <h4 className="font-bold text-slate-800 text-sm leading-snug">{trip.name}</h4>
                
                <div className="grid grid-cols-2 gap-2 text-xs bg-purple-50/50 p-2.5 rounded-xl border border-purple-100">
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 block flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-purple-500" /> วันเดินทาง
                    </span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{formatThaiDate(trip.departureDate)}</span>
                    {end && <span className="text-[10px] text-slate-500 block">ถึง {formatThaiDate(end)}</span>}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-purple-700 block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-500" /> เวลาออกเดินทาง
                    </span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{trip.departureTime || 'ยังไม่ระบุ'}{trip.departureTime ? ' น.' : ''}</span>
                  </div>
                  <div className="col-span-2 border-t border-purple-100 pt-1.5 mt-0.5">
                    <span className="text-[10px] font-bold text-purple-700 block flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-purple-500" /> ไกด์ประจำทริป
                    </span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{trip.guideName?.trim() || 'ยังไม่ระบุ'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">สตาฟประจำรถ</span>
                  {tripVans.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">ยังไม่มีรถในทริปนี้</span>
                  ) : (
                    <div className="space-y-1.5">
                      {tripVans.map(van => {
                        const staff = [...new Set(van.seats.filter(seat => seat.type === 'staff').map(seat => seat.staffName?.trim() || seat.passengerName?.trim()).filter(Boolean))];
                        return (
                          <div key={van.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-purple-50/70 text-xs">
                            <span className="font-bold text-purple-800 shrink-0">รถคันที่ {van.vanNumber}</span>
                            <span className="text-slate-700 font-medium text-right break-words">{staff.length ? staff.join(', ') : 'ยังไม่ระบุสตาฟ'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
