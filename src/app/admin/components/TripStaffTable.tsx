import { Users, Calendar, Clock, UserCheck, Pencil, Trash2, Link2, Check } from 'lucide-react';
import { formatThaiDate } from '@/lib/dateFormat';
import { dayKey, parseCalendarDay } from '@/lib/tripCalendar';
import { cn } from '@/lib/utils';
import { getTripTheme } from '@/lib/tripThemes';
import type { Trip, Van } from './types';

interface TripStaffTableProps {
  trips: Trip[];
  vans: Van[];
  onEdit?: (trip: Trip) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: 'active' | 'completed') => Promise<void>;
  canToggleCompleted?: boolean;
  onCopyLink?: (id: string) => void;
  copiedId?: string | null;
}

export default function TripStaffTable({
  trips,
  vans,
  onEdit,
  onDelete,
  onStatusChange,
  canToggleCompleted = true,
  onCopyLink,
  copiedId,
}: TripStaffTableProps) {
  return (
    <section aria-labelledby="trip-staff-heading" className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/50 p-4">
        <h3 id="trip-staff-heading" className="flex items-center gap-2 text-sm font-black text-slate-800">
          <Users className="h-4 w-4 text-violet-600" />
          ตารางทริปและสตาฟ
        </h3>
        <p className="mt-1 text-xs text-slate-500">{trips.length} ทริป · แสดงตามตัวกรองด้านบน · สตาฟจากข้อมูลประจำรถ</p>
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block overflow-x-auto" role="region" aria-label="ตารางรายชื่อทริปและสตาฟ" tabIndex={0}>
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="bg-slate-100/80 text-xs font-bold text-slate-700 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-4 py-3">ทริป</th>
              <th scope="col" className="px-4 py-3">วันเดินทาง</th>
              <th scope="col" className="px-4 py-3">สตาฟประจำทริป</th>
              <th scope="col" className="px-4 py-3">สตาฟประจำรถ</th>
              <th scope="col" className="px-4 py-3 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {trips.map((trip, idx) => {
              const theme = getTripTheme(idx);
              const start = parseCalendarDay(trip.departureDate);
              const duration = Number(trip.durationDays);
              const end = start !== null && Number.isSafeInteger(duration) && duration > 1 ? dayKey(start + duration - 1) : null;
              const tripVans = vans.filter(van => van.tripId === trip.id).sort((a, b) => a.vanNumber - b.vanNumber);
              return (
                <tr key={trip.id} className={cn("align-middle transition hover:bg-slate-50/80 border-l-4", theme.borderLeft)}>
                  <th scope="row" className="max-w-xs break-words px-4 py-4 font-bold">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", theme.dotBg)} />
                      <span className={theme.titleColor}>{trip.name}</span>
                    </div>
                  </th>
                  <td className="px-4 py-4 text-xs text-slate-600">
                    <p className="whitespace-nowrap font-medium">{formatThaiDate(trip.departureDate)}</p>
                    {end && <p className="mt-1 whitespace-nowrap text-slate-500">ถึง {formatThaiDate(end)}</p>}
                    <p className="mt-1">เวลาออกเดินทาง {trip.departureTime || 'ยังไม่ระบุ'}{trip.departureTime ? ' น.' : ''}</p>
                  </td>
                  <td className="max-w-48 break-words px-4 py-4 font-medium text-slate-700">{trip.guideName?.trim() || 'ยังไม่ระบุ'}</td>
                  <td className="px-4 py-4">
                    {tripVans.length === 0 ? <span className="text-xs text-slate-500">ยังไม่มีรถในทริปนี้</span> : (
                      <ul className="space-y-2">
                        {tripVans.map(van => {
                          const staff = [...new Set(van.seats.filter(seat => seat.type === 'staff').map(seat => seat.staffName?.trim() || seat.passengerName?.trim()).filter(Boolean))];
                          return (
                            <li key={van.id} className={cn("max-w-xs rounded-lg px-3 py-2 text-xs border", theme.vanBg)}>
                              <span className={cn("font-bold", theme.vanTitle)}>รถคันที่ {van.vanNumber}</span>
                              <span className="mt-1 block break-words text-slate-700">{staff.length ? staff.join(', ') : 'ยังไม่ระบุสตาฟ'}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right align-middle shrink-0">
                    <div className="flex items-center justify-end gap-1.5">
                      {onCopyLink && (
                        <button
                          type="button"
                          onClick={() => onCopyLink(trip.id)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition",
                            copiedId === trip.id
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : theme.shareBtn
                          )}
                          title="แชร์ลิ้งก์เพื่อจองที่นั่ง"
                        >
                          {copiedId === trip.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                          <span>{copiedId === trip.id ? 'คัดลอกแล้ว' : 'แชร์ลิ้งก์'}</span>
                        </button>
                      )}

                      {onStatusChange && (
                        <button
                          type="button"
                          role="switch"
                          aria-checked={trip.status !== 'completed'}
                          disabled={!canToggleCompleted}
                          onClick={() => onStatusChange(trip.id, trip.status === 'completed' ? 'active' : 'completed')}
                          className={cn("flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-slate-50 px-2 py-1 rounded-lg hover:bg-slate-100 transition disabled:opacity-50", !canToggleCompleted && "cursor-not-allowed")}
                          title={!canToggleCompleted ? 'ต้องมีสิทธิ์เปลี่ยนสถานะ' : trip.status === 'completed' ? 'คลิกเพื่อเปิดรับจอง' : 'คลิกเพื่อย้ายไปทริปที่จบไปแล้ว'}
                        >
                          <span className="text-[11px] font-semibold text-slate-600">{trip.status === 'completed' ? 'ปิด' : 'เปิด'}</span>
                          <span className={cn('flex h-5 w-9 items-center rounded-full p-0.5 transition-colors', trip.status === 'completed' ? 'bg-slate-300' : 'bg-emerald-500')}>
                            <span className={cn('h-4 w-4 rounded-full bg-white shadow transition-transform', trip.status === 'completed' ? 'translate-x-0' : 'translate-x-4')} />
                          </span>
                        </button>
                      )}

                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(trip)}
                          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 transition"
                          title="แก้ไขทริป"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(trip.id)}
                          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-500 transition"
                          title="ลบทริป"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {trips.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">ไม่พบทริปที่ตรงกับตัวกรอง</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="sm:hidden divide-y divide-slate-100">
        {trips.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">ไม่พบทริปที่ตรงกับตัวกรอง</div>
        ) : (
          trips.map((trip, idx) => {
            const theme = getTripTheme(idx);
            const start = parseCalendarDay(trip.departureDate);
            const duration = Number(trip.durationDays);
            const end = start !== null && Number.isSafeInteger(duration) && duration > 1 ? dayKey(start + duration - 1) : null;
            const tripVans = vans.filter(van => van.tripId === trip.id).sort((a, b) => a.vanNumber - b.vanNumber);
            return (
              <div key={trip.id} className={cn("p-4 space-y-3 bg-white border-l-4", theme.borderLeft)}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className={cn("font-black text-sm leading-snug flex items-center gap-2", theme.titleColor)}>
                    <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", theme.dotBg)} />
                    <span>{trip.name}</span>
                  </h4>
                  {onStatusChange && (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={trip.status !== 'completed'}
                      disabled={!canToggleCompleted}
                      onClick={() => onStatusChange(trip.id, trip.status === 'completed' ? 'active' : 'completed')}
                      className={cn("flex items-center gap-1.5 text-xs font-bold border border-slate-200 bg-slate-50 px-2 py-1 rounded-lg shrink-0 transition disabled:opacity-50", !canToggleCompleted && "cursor-not-allowed")}
                    >
                      <span className="text-[10px] font-semibold text-slate-600">{trip.status === 'completed' ? 'ปิด' : 'เปิด'}</span>
                      <span className={cn('flex h-4 w-7 items-center rounded-full p-0.5 transition-colors', trip.status === 'completed' ? 'bg-slate-300' : 'bg-emerald-500')}>
                        <span className={cn('h-3 w-3 rounded-full bg-white shadow transition-transform', trip.status === 'completed' ? 'translate-x-0' : 'translate-x-3')} />
                      </span>
                    </button>
                  )}
                </div>
                
                <div className={cn("grid grid-cols-2 gap-2 text-xs p-2.5 rounded-xl border", theme.boxBg)}>
                  <div>
                    <span className={cn("text-[10px] font-bold block flex items-center gap-1", theme.labelColor)}>
                      <Calendar className={cn("w-3 h-3", theme.iconColor)} /> วันเดินทาง
                    </span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{formatThaiDate(trip.departureDate)}</span>
                    {end && <span className="text-[10px] text-slate-500 block">ถึง {formatThaiDate(end)}</span>}
                  </div>
                  <div>
                    <span className={cn("text-[10px] font-bold block flex items-center gap-1", theme.labelColor)}>
                      <Clock className={cn("w-3 h-3", theme.iconColor)} /> เวลาออกเดินทาง
                    </span>
                    <span className="font-semibold text-slate-700 mt-0.5 block">{trip.departureTime || 'ยังไม่ระบุ'}{trip.departureTime ? ' น.' : ''}</span>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/60 pt-1.5 mt-0.5">
                    <span className={cn("text-[10px] font-bold block flex items-center gap-1", theme.labelColor)}>
                      <UserCheck className={cn("w-3 h-3", theme.iconColor)} /> สตาฟประจำทริป
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
                          <div key={van.id} className={cn("flex items-start justify-between gap-2 p-2 rounded-lg text-xs border", theme.vanBg)}>
                            <span className={cn("font-bold shrink-0", theme.vanTitle)}>รถคันที่ {van.vanNumber}</span>
                            <span className="text-slate-700 font-medium text-right break-words">{staff.length ? staff.join(', ') : 'ยังไม่ระบุสตาฟ'}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Mobile Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {onCopyLink && (
                    <button
                      type="button"
                      onClick={() => onCopyLink(trip.id)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition",
                        copiedId === trip.id
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : theme.shareBtn
                      )}
                    >
                      {copiedId === trip.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                      <span>{copiedId === trip.id ? 'คัดลอกแล้ว' : 'แชร์ลิ้งก์'}</span>
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(trip)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        title="แก้ไขทริป"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(trip.id)}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-rose-50"
                        title="ลบทริป"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
