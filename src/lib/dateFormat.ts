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
