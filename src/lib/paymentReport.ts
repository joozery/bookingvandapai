import ExcelJS from 'exceljs';
import type { AdminPaymentRow } from './adminPayments';

const bangkok = new Intl.DateTimeFormat('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' });
const when = (ms?: number) => (ms ? bangkok.format(new Date(ms)) : '');
const baht = (satang: number) => Math.round(satang) / 100;
const MONEY = '#,##0.00';

function styleHeader(sheet: ExcelJS.Worksheet) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6D28D9' } };
  header.alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
}

/** Two sheets: one row per customer order, and one row per verified transfer. */
export async function buildPaymentWorkbook(rows: AdminPaymentRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dapai booking admin';
  workbook.created = new Date();

  const orders = workbook.addWorksheet('สรุปการชำระเงิน');
  orders.columns = [
    { header: 'วันที่สร้างรายการ', key: 'createdAt', width: 18 },
    { header: 'ทริป', key: 'trip', width: 30 },
    { header: 'วันเดินทาง', key: 'departure', width: 18 },
    { header: 'ชื่อผู้ลงทะเบียน', key: 'fullName', width: 24 },
    { header: 'ชื่อเล่น', key: 'nickname', width: 12 },
    { header: 'ชื่อ LINE', key: 'lineName', width: 18 },
    { header: 'เบอร์โทร', key: 'phone', width: 14 },
    { header: 'รถคันที่', key: 'van', width: 9 },
    { header: 'ที่นั่ง', key: 'seat', width: 9 },
    { header: 'รูปแบบ', key: 'plan', width: 12 },
    { header: 'ยอดที่ต้องชำระ', key: 'total', width: 15, style: { numFmt: MONEY } },
    { header: 'ชำระแล้ว', key: 'paid', width: 14, style: { numFmt: MONEY } },
    { header: 'คงเหลือ', key: 'balance', width: 14, style: { numFmt: MONEY } },
    { header: 'สถานะ', key: 'state', width: 20 },
    { header: 'ครบกำหนดชำระ', key: 'due', width: 18 },
    { header: 'ชื่อผู้โอน (จากสลิป)', key: 'payers', width: 26 },
    { header: 'เลขอ้างอิงการโอน', key: 'refs', width: 28 },
    { header: 'ประวัติแก้ไขยอด', key: 'adjustments', width: 36 },
    { header: 'เลขรายการ', key: 'id', width: 38 },
  ];
  for (const row of rows) {
    orders.addRow({
      createdAt: when(row.createdAt), trip: row.tripName, departure: when(row.departureAt),
      fullName: row.booking?.fullName || row.receipts.find(r => r.registrantName)?.registrantName || '', nickname: row.booking?.nickname || '',
      lineName: row.userName, phone: row.booking?.phone || '', van: row.booking?.vanNumber ?? '', seat: row.booking?.seatLabel || 'ยังไม่เลือก',
      plan: row.plan === 'deposit' ? 'มัดจำ' : 'ชำระเต็ม',
      total: baht(row.totalSatang), paid: baht(row.paidSatang), balance: baht(row.balanceSatang), state: row.stateLabel,
      due: row.balanceSatang > 0 ? when(row.balanceDueAt) : '',
      payers: [...new Set(row.receipts.map(r => r.payerName).filter(Boolean))].join(', '),
      refs: row.receipts.map(r => r.transRef).join(', '),
      adjustments: row.adjustments.map(a => `${when(a.at)} ${baht(a.fromSatang)}→${baht(a.toSatang)} (${a.note}) โดย ${a.by}`).join('\n'),
      id: row.id,
    });
  }
  // Phone numbers stay text so leading zeros are not lost.
  orders.getColumn('phone').numFmt = '@';
  const totalRow = orders.addRow({ trip: `รวม ${rows.length} รายการ`, total: baht(rows.reduce((s, r) => s + r.totalSatang, 0)), paid: baht(rows.reduce((s, r) => s + r.paidSatang, 0)), balance: baht(rows.reduce((s, r) => s + r.balanceSatang, 0)) });
  totalRow.font = { bold: true };
  styleHeader(orders);

  const transfers = workbook.addWorksheet('รายการโอนเงิน');
  transfers.columns = [
    { header: 'วันเวลาโอน', key: 'paidAt', width: 18 },
    { header: 'ทริป', key: 'trip', width: 30 },
    { header: 'ชื่อผู้ลงทะเบียน', key: 'registrant', width: 24 },
    { header: 'ชื่อผู้โอน (จากสลิป)', key: 'payer', width: 26 },
    { header: 'ธนาคารผู้โอน', key: 'bank', width: 16 },
    { header: 'จำนวนเงิน', key: 'amount', width: 14, style: { numFmt: MONEY } },
    { header: 'ที่นั่ง', key: 'seat', width: 9 },
    { header: 'เลขอ้างอิงการโอน', key: 'ref', width: 28 },
    { header: 'หมายเหตุ', key: 'note', width: 22 },
    { header: 'เลขรายการ', key: 'id', width: 38 },
  ];
  for (const row of rows) for (const receipt of row.receipts) {
    transfers.addRow({
      paidAt: when(receipt.paidAt), trip: row.tripName,
      registrant: receipt.registrantName || row.booking?.fullName || row.userName,
      payer: receipt.payerName, bank: receipt.payerBank, amount: baht(receipt.amountSatang),
      seat: receipt.seatLabel || row.booking?.seatLabel || '', ref: receipt.transRef,
      note: receipt.reviewRequired ? 'รอแอดมินตรวจสอบ' : '', id: row.id,
    });
  }
  styleHeader(transfers);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
