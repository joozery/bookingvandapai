const thaiMonths = [
  ['ม.ค.', 'มกราคม'], ['ก.พ.', 'กุมภาพันธ์'], ['มี.ค.', 'มีนาคม'],
  ['เม.ย.', 'เมษายน'], ['พ.ค.', 'พฤษภาคม'], ['มิ.ย.', 'มิถุนายน'],
  ['ก.ค.', 'กรกฎาคม'], ['ส.ค.', 'สิงหาคม'], ['ก.ย.', 'กันยายน'],
  ['ต.ค.', 'ตุลาคม'], ['พ.ย.', 'พฤศจิกายน'], ['ธ.ค.', 'ธันวาคม'],
];

function fullMonthDate(day: string, month: string, year: string): string {
  const value = Number(year);
  const buddhistYear = value < 100 ? value + 2500 : value < 2400 ? value + 543 : value;
  const monthName = thaiMonths[Number(month) - 1]?.[1];
  return monthName
    ? `${Number(day)} ${monthName} ${buddhistYear}`
    : `${day}/${month}/${buddhistYear}`;
}

/** Format stored dates for display without changing the original booking data. */
export function formatThaiDate(value?: string): string {
  if (!value) return '';
  const text = value.trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
  if (iso) return fullMonthDate(iso[3], iso[2], iso[1]);
  const numeric = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (numeric) return fullMonthDate(numeric[1], numeric[2], numeric[3]);
  const thai = text.match(/^(\d{1,2})\s+([^\s]+)\s+(?:พ\.ศ\.\s*)?(\d{2,4})$/);
  if (thai) {
    const month = thaiMonths.findIndex(names => names.includes(thai[2]));
    if (month >= 0) return fullMonthDate(thai[1], String(month + 1), thai[3]);
  }
  return value;
}

/** Convert stored date values to a sortable timestamp without throwing. */
export function parseStoredDate(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value === 'string' && value.trim()) return Date.parse(value);
  if (value && typeof value === 'object' && '$date' in value) {
    return parseStoredDate((value as { $date?: unknown }).$date);
  }
  return NaN;
}

/** Format a stored date for display, with a safe fallback for legacy records. */
export function formatThaiDateTime(value: unknown): string {
  const timestamp = parseStoredDate(value);
  if (!Number.isFinite(timestamp)) return 'ไม่ระบุวันที่';
  return new Date(timestamp).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
}
