export interface ThaiHoliday { date: string; name: string; scope?: string }

// Verified for 2026 only. Do not extrapolate lunar or special holidays to other years.
// Annual calendar: https://www.thaipbs.or.th/now/content/3472
// Ploughing day: https://pathumthani.moc.go.th/th/content/category/detail/id/161/iid/161729
// Regional holidays: https://www.thaigov.go.th/th/news/169370
// https://www.prd.go.th/th/content/category/detail/id/39/iid/545326
export const holidayYears = [2026];
export const thaiHolidays: ThaiHoliday[] = [
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่' },
  { date: '2026-01-02', name: 'วันหยุดราชการกรณีพิเศษ' },
  { date: '2026-03-03', name: 'วันมาฆบูชา' },
  { date: '2026-04-06', name: 'วันจักรี' },
  { date: '2026-04-13', name: 'วันสงกรานต์' },
  { date: '2026-04-14', name: 'วันสงกรานต์' },
  { date: '2026-04-15', name: 'วันสงกรานต์' },
  { date: '2026-05-04', name: 'วันฉัตรมงคล' },
  { date: '2026-05-13', name: 'วันพืชมงคล' },
  { date: '2026-05-31', name: 'วันวิสาขบูชา' },
  { date: '2026-06-01', name: 'ชดเชยวันวิสาขบูชา' },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าฯ พระบรมราชินี' },
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว' },
  { date: '2026-07-29', name: 'วันอาสาฬหบูชา' },
  { date: '2026-07-30', name: 'วันเข้าพรรษา' },
  { date: '2026-08-12', name: 'วันแม่แห่งชาติ / วันคล้ายวันพระราชสมภพสมเด็จพระบรมราชชนนีพันปีหลวง' },
  { date: '2026-09-28', name: 'วันหยุดราชการกรณีพิเศษ (อุทกภัย)', scope: 'เฉพาะ กทม. นนทบุรี ปทุมธานี และสมุทรปราการ' },
  { date: '2026-09-29', name: 'วันหยุดราชการกรณีพิเศษ (อุทกภัย)', scope: 'เฉพาะ กทม. นนทบุรี ปทุมธานี และสมุทรปราการ' },
  { date: '2026-10-13', name: 'วันนวมินทรมหาราช' },
  { date: '2026-10-16', name: 'วันหยุดราชการกรณีพิเศษ', scope: 'เฉพาะกรุงเทพมหานคร' },
  { date: '2026-10-23', name: 'วันปิยมหาราช' },
  { date: '2026-12-05', name: 'วันพ่อแห่งชาติ / วันชาติ / วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9' },
  { date: '2026-12-07', name: 'ชดเชยวันพ่อแห่งชาติ / วันชาติ / วันคล้ายวันพระบรมราชสมภพ รัชกาลที่ 9' },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ' },
  { date: '2026-12-31', name: 'วันสิ้นปี' },
];
export function holidaysOn(date: string) {
  return thaiHolidays.filter(holiday => holiday.date === date);
}
export function holidayLabel(holiday: ThaiHoliday) {
  return holiday.scope ? `${holiday.name} (${holiday.scope})` : holiday.name;
}
