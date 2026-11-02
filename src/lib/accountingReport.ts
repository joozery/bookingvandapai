import ExcelJS from 'exceljs';
import { PAYMENT_INCOME_CATEGORY, type loadAccounting } from './accounting';

type Accounting = Awaited<ReturnType<typeof loadAccounting>>;
const baht = (satang: number) => Math.round(satang) / 100;
const MONEY = '#,##0.00;[Red]-#,##0.00';

function sheet(workbook: ExcelJS.Workbook, name: string, columns: Partial<ExcelJS.Column>[]) {
  const ws = workbook.addWorksheet(name);
  ws.columns = columns;
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return ws;
}
const money = (key: string, header: string, width = 15): Partial<ExcelJS.Column> => ({ key, header, width, style: { numFmt: MONEY } });

/** Accounting workbook: overview, per-trip P&L, category totals, all entries and partners. */
export async function buildAccountingWorkbook(data: Accounting): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  const categoryName = (id: string) => id === PAYMENT_INCOME_CATEGORY.id ? PAYMENT_INCOME_CATEGORY.name : data.categories.find(c => c.id === id)?.name || 'ไม่ระบุหมวด';
  const tripName = (id: string | null) => (id ? data.trips.find(t => t.tripId === id)?.name || 'ทริปที่ถูกลบ' : 'ส่วนกลาง (ไม่ผูกทริป)');
  const partnerName = (id?: string | null) => (id ? data.partners.find(p => p.id === id)?.name || '' : '');
  const o = data.overview;

  const overview = sheet(workbook, 'สรุปภาพรวม', [{ key: 'label', header: 'รายการ', width: 34 }, money('value', 'จำนวน', 18)]);
  overview.addRows([
    { label: 'ทริปที่เปิดอยู่', value: o.openTrips }, { label: 'ทริปที่ปิดแล้ว', value: o.closedTrips },
    { label: 'รายรับจากลูกทริป (ระบบชำระเงิน)', value: baht(o.paymentIncomeSatang) }, { label: 'รายรับอื่น ๆ', value: baht(o.otherIncomeSatang) },
    { label: 'รายรับรวม', value: baht(o.incomeSatang) },
    { label: 'รายจ่ายรายทริป', value: baht(o.tripExpenseSatang) }, { label: 'รายจ่ายส่วนกลาง', value: baht(o.overheadExpenseSatang) },
    { label: 'รายจ่ายรวม', value: baht(o.expenseSatang) },
    { label: o.profitSatang >= 0 ? 'กำไร' : 'ขาดทุน', value: baht(o.profitSatang) },
    { label: 'ยอดค้างชำระจากลูกทริป', value: baht(o.outstandingSatang) }, { label: 'ค้างเบิกคืนหุ้นส่วน', value: baht(o.owedToPartnersSatang) },
  ]);
  overview.getCell('B2').numFmt = '0'; overview.getCell('B3').numFmt = '0';

  const trips = sheet(workbook, 'รายทริป', [
    { key: 'name', header: 'ทริป', width: 30 }, { key: 'date', header: 'วันเดินทาง', width: 12 }, { key: 'status', header: 'สถานะ', width: 10 },
    { key: 'pax', header: 'ลูกทริป', width: 9 }, money('pay', 'รายรับลูกทริป'), money('other', 'รายรับอื่น'), money('income', 'รายรับรวม'),
    money('expense', 'รายจ่ายรวม'), money('profit', 'กำไร/ขาดทุน'), money('cpp', 'ต้นทุนต่อคน'), money('due', 'ค้างชำระ'),
  ]);
  for (const t of data.trips) trips.addRow({
    name: t.name, date: t.departureDate, status: t.status === 'completed' ? 'ปิดแล้ว' : 'เปิดอยู่', pax: t.passengers,
    pay: baht(t.paymentIncomeSatang), other: baht(t.otherIncomeSatang), income: baht(t.incomeSatang), expense: baht(t.expenseSatang),
    profit: baht(t.profitSatang), cpp: t.costPerPassengerSatang === null ? null : baht(t.costPerPassengerSatang), due: baht(t.outstandingSatang),
  });
  const total = trips.addRow({ name: 'รวมทุกทริป', pay: baht(o.paymentIncomeSatang), other: baht(data.trips.reduce((s, t) => s + t.otherIncomeSatang, 0)),
    income: baht(data.trips.reduce((s, t) => s + t.incomeSatang, 0)), expense: baht(o.tripExpenseSatang),
    profit: baht(data.trips.reduce((s, t) => s + t.profitSatang, 0)), due: baht(o.outstandingSatang) });
  total.font = { bold: true };

  const byCategory = sheet(workbook, 'แยกตามหมวด', [{ key: 'type', header: 'ประเภท', width: 10 }, { key: 'category', header: 'หมวดหมู่', width: 30 }, money('amount', 'รวม', 16)]);
  const totals = new Map<string, number>();
  for (const t of data.trips) {
    for (const [id, v] of Object.entries(t.incomeByCategory)) totals.set(`income:${id}`, (totals.get(`income:${id}`) || 0) + v);
    for (const [id, v] of Object.entries(t.expenseByCategory)) totals.set(`expense:${id}`, (totals.get(`expense:${id}`) || 0) + v);
  }
  for (const [id, v] of Object.entries(data.overhead.incomeByCategory)) totals.set(`income:${id}`, (totals.get(`income:${id}`) || 0) + v);
  for (const [id, v] of Object.entries(data.overhead.expenseByCategory)) totals.set(`expense:${id}`, (totals.get(`expense:${id}`) || 0) + v);
  for (const [key, v] of [...totals].sort()) { const [type, id] = key.split(':'); byCategory.addRow({ type: type === 'income' ? 'รายรับ' : 'รายจ่าย', category: categoryName(id), amount: baht(v) }); }

  const entries = sheet(workbook, 'รายการรับ-จ่าย', [
    { key: 'date', header: 'วันที่', width: 12 }, { key: 'type', header: 'ประเภท', width: 9 }, { key: 'category', header: 'หมวดหมู่', width: 22 },
    { key: 'trip', header: 'ทริป', width: 30 }, money('amount', 'จำนวนเงิน'), { key: 'description', header: 'รายละเอียด', width: 36 },
    { key: 'paidBy', header: 'สำรองจ่ายโดย', width: 18 }, { key: 'payee', header: 'หุ้นส่วนผู้รับ', width: 18 }, { key: 'by', header: 'บันทึกโดย', width: 14 },
  ]);
  for (const e of data.entries) entries.addRow({
    date: e.date, type: e.type === 'income' ? 'รายรับ' : 'รายจ่าย', category: categoryName(e.categoryId), trip: tripName(e.tripId),
    amount: baht(e.amountSatang), description: e.description, paidBy: partnerName(e.paidByPartnerId), payee: partnerName(e.payeePartnerId), by: e.updatedBy || e.createdBy,
  });

  const partners = sheet(workbook, 'หุ้นส่วน', [
    { key: 'name', header: 'หุ้นส่วน', width: 22 }, { key: 'share', header: 'สัดส่วนหุ้น %', width: 13 }, money('advanced', 'สำรองจ่ายรวม'),
    money('reimbursed', 'เบิกคืนแล้ว'), money('owed', 'ค้างเบิกคืน'), money('comp', 'ค่าตอบแทนรวม'), money('shareProfit', 'ส่วนแบ่งกำไรตามสัดส่วน', 20),
  ]);
  for (const p of data.partners) partners.addRow({ name: p.name, share: p.sharePercent, advanced: baht(p.advancedSatang), reimbursed: baht(p.reimbursedSatang), owed: baht(p.owedSatang), comp: baht(p.compensationSatang), shareProfit: baht(p.profitShareSatang) });
  if (data.partnerTransactions.length) {
    partners.addRow({});
    partners.addRow({ name: 'ประวัติการเบิกคืน' }).font = { bold: true };
    for (const t of data.partnerTransactions) partners.addRow({ name: partnerName(t.partnerId), share: t.date, reimbursed: baht(t.amountSatang), owed: t.description });
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
