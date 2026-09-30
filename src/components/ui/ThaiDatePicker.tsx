'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Check, Smartphone, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  required?: boolean;
  id?: string;
  className?: string;
  showPresets?: boolean;
  format?: 'buddhist' | 'full';
  disabled?: boolean;
}

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];
const THAI_DAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

function formatThaiDisplay(dateStr: string, mode: 'buddhist' | 'full' = 'buddhist') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const monthIdx = d.getMonth();
  const yearBE = d.getFullYear() + 543;
  if (mode === 'full') {
    return `${day} ${THAI_MONTHS_FULL[monthIdx]} ${yearBE}`;
  }
  return `${day} ${THAI_MONTHS_SHORT[monthIdx]} ${yearBE}`;
}

function getTodayStr() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function ThaiDatePicker({
  value,
  onChange,
  placeholder = 'เลือกวันที่...',
  min,
  max,
  required,
  id,
  className,
  showPresets = true,
  format = 'buddhist',
  disabled = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [useNative, setUseNative] = useState(false);

  // Active viewing year & month (Gregorian internally for Date objects)
  const initialDate = useMemo(() => {
    if (value && !isNaN(new Date(value).getTime())) {
      return new Date(value);
    }
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-11

  // Update view when modal opens or value changes
  useEffect(() => {
    if (value && !isNaN(new Date(value).getTime())) {
      const d = new Date(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value, isOpen]);

  const displayString = useMemo(() => {
    return formatThaiDisplay(value, format);
  }, [value, format]);

  // Calendar Days calculation
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isDisabled: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const todayStr = getTodayStr();

    // Previous month padding
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const dateStr = `${prevDate.getFullYear()}-${mStr}-${dStr}`;
      days.push({
        dayNumber: dayNum,
        dateStr,
        isCurrentMonth: false,
        isDisabled: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${viewYear}-${mStr}-${dStr}`;

      let isDisabled = false;
      if (min && dateStr < min) isDisabled = true;
      if (max && dateStr > max) isDisabled = true;

      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isDisabled,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
      });
    }

    // Next month padding to complete 42 cells (6 rows)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const nextDate = new Date(viewYear, viewMonth + 1, i);
      const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      const dateStr = `${nextDate.getFullYear()}-${mStr}-${dStr}`;
      days.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: false,
        isDisabled: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
      });
    }

    return days;
  }, [viewYear, viewMonth, min, max, value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  // Preset handlers
  const handlePreset = (daysOffset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const targetStr = `${d.getFullYear()}-${mStr}-${dStr}`;
    onChange(targetStr);
    setIsOpen(false);
  };

  // Year choices range (e.g., 2020 to 2030 or BE 2563 to 2573)
  const yearOptions = useMemo(() => {
    const currentYr = new Date().getFullYear();
    const startYr = currentYr - 10;
    const endYr = currentYr + 10;
    const years = [];
    for (let y = startYr; y <= endYr; y++) {
      years.push({ greg: y, thai: y + 543 });
    }
    return years;
  }, []);

  return (
    <div className="relative w-full">
      {/* ── Trigger Button ───────────────────────────────────────── */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(true)}
        className={cn(
          'w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all shadow-sm hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        <span className={cn('truncate', displayString ? 'text-slate-800 font-bold' : 'text-slate-400 font-normal')}>
          {displayString || placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-1 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition"
              title="ล้างวันที่"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <Calendar className="w-4 h-4 text-violet-600" />
        </div>
      </button>

      {/* Hidden Native Input Sync */}
      {required && (
        <input
          type="text"
          readOnly
          required
          value={value}
          tabIndex={-1}
          className="sr-only"
        />
      )}

      {/* ── Mobile Modal & Popover ───────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop Click to close */}
          <div className="absolute inset-0 z-0" onClick={() => setIsOpen(false)} />

          {/* Modal Card / Bottom Sheet */}
          <div className="relative z-10 w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
            
            {/* Mobile Drag Indicator / Top Handle */}
            <div className="sm:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2.5 mb-1" />

            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-violet-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800">เลือกวันที่</h3>
                  <p className="text-[10px] text-slate-500">ปี พ.ศ. แสดงผลตามแบบไทย</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets Bar */}
            {showPresets && (
              <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                <button
                  type="button"
                  onClick={() => handlePreset(0)}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-bold hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition shrink-0"
                >
                  วันนี้
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(1)}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-bold hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition shrink-0"
                >
                  พรุ่งนี้
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(7)}
                  className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-bold hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition shrink-0"
                >
                  +7 วัน
                </button>
              </div>
            )}

            {/* Navigation & Month/Year Selectors */}
            <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-violet-50 text-slate-600 flex items-center justify-center transition"
                title="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5">
                {/* Month Dropdown */}
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(Number(e.target.value))}
                  className="h-8 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-violet-400"
                >
                  {THAI_MONTHS_FULL.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>

                {/* Year Dropdown */}
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(Number(e.target.value))}
                  className="h-8 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-violet-400"
                >
                  {yearOptions.map(y => (
                    <option key={y.greg} value={y.greg}>พ.ศ. {y.thai}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-violet-50 text-slate-600 flex items-center justify-center transition"
                title="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Calendar Grid Header */}
            <div className="px-4 grid grid-cols-7 gap-1 text-center py-1 bg-slate-50 text-[11px] font-bold text-slate-400 border-y border-slate-100">
              {THAI_DAYS_SHORT.map((d, i) => (
                <div key={d} className={cn(i === 0 && 'text-rose-500')}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="p-3 grid grid-cols-7 gap-1 max-h-[260px] overflow-y-auto">
              {calendarGrid.map((item, idx) => {
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={item.isDisabled}
                    onClick={() => handleSelectDate(item.dateStr)}
                    className={cn(
                      'h-9 w-full rounded-xl text-xs font-bold transition flex flex-col items-center justify-center relative select-none',
                      !item.isCurrentMonth && 'opacity-25 pointer-events-none',
                      item.isDisabled && 'opacity-30 cursor-not-allowed text-slate-300 line-through',
                      !item.isDisabled && item.isCurrentMonth && 'hover:bg-violet-100 hover:text-violet-700',
                      item.isSelected
                        ? 'bg-violet-600 text-white shadow-md shadow-violet-200 hover:bg-violet-700'
                        : item.isToday
                        ? 'border border-violet-400 text-violet-700 font-extrabold bg-violet-50/50'
                        : 'text-slate-700'
                    )}
                  >
                    <span>{item.dayNumber}</span>
                    {item.isToday && !item.isSelected && (
                      <span className="w-1 h-1 rounded-full bg-violet-600 absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Native Date Picker Fallback / Selection Footer */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <label className="relative inline-flex items-center gap-1.5 text-[11px] font-bold text-violet-700 hover:text-violet-900 cursor-pointer">
                <Smartphone className="w-3.5 h-3.5 text-violet-600" />
                <span>ใช้ Calendar มือถือ (Native)</span>
                <input
                  type="date"
                  min={min}
                  max={max}
                  value={value}
                  onChange={(e) => {
                    onChange(e.target.value);
                    setIsOpen(false);
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition text-xs"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
