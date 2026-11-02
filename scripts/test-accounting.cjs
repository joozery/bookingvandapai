// Accounting storage against real MongoDB using disposable prefixed
// collections that are dropped in `finally`. Never touches live data.
require('dotenv').config({ path: '.env.local', quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const ExcelJS = require('exceljs');
const { MongoClient } = require('mongodb');

function load(file, dependencies) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: name => { if (name in dependencies) return dependencies[name]; throw new Error(`Unexpected test dependency ${name}`); }, Date, Buffer, Map, Set });
  return exports;
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  const prefix = `accounting_check_${crypto.randomUUID().replaceAll('-', '')}_`;
  const names = new Set();
  let db;
  try {
    await client.connect();
    db = client.db(process.env.MONGODB_DB || 'dapai');
    const isolated = { collection(name) { names.add(`${prefix}${name}`); return db.collection(`${prefix}${name}`); } };
    const rules = load('src/lib/paymentRules.ts', {});
    const acc = load('src/lib/accounting.ts', { 'node:crypto': crypto, './mongodb': { getMongoDb: async () => isolated }, './paymentRules': rules });
    const report = load('src/lib/accountingReport.ts', { exceljs: { default: ExcelJS, ...ExcelJS }, './accounting': acc });

    await isolated.collection('trips').insertMany([
      { id: 't1', name: 'ภูกระดึง', departureDate: '2030-02-01', status: 'active', cost: 3000 },
      { id: 't2', name: 'ดอยหลวง', departureDate: '2030-01-01', status: 'completed', cost: 2500 },
    ]);
    await isolated.collection('bookings').insertMany([{ tripId: 't1', status: 'approved' }, { tripId: 't1', status: 'approved' }, { tripId: 't2', status: 'approved' }]);
    await isolated.collection('paymentOrders').insertMany([
      { id: 'o1', tripId: 't1', totalSatang: 300000, paidSatang: 150000, status: 'deposit_paid' },
      { id: 'o2', tripId: 't1', totalSatang: 300000, paidSatang: 300000, status: 'paid' },
      { id: 'o3', tripId: 't2', totalSatang: 250000, paidSatang: 250000, status: 'paid' },
    ]);

    // Default categories are seeded once and include every requested expense type.
    let categories = await acc.listCategories();
    const names_ = categories.filter(c => c.type === 'expense').map(c => c.name);
    for (const n of ['ค่ารถ', 'ค่าไกด์', 'ค่าลูกหาบ', 'ค่าธรรมเนียม', 'ค่าอาหาร', 'ค่าอุปกรณ์', 'ค่ารถตู้', 'ค่าน้ำมัน']) assert.ok(names_.includes(n), n);
    assert.equal((await acc.listCategories()).length, categories.length, 'seeding is idempotent');
    const cat = n => categories.find(c => c.name === n && c.type === 'expense');
    console.log('✔ default categories seeded');

    // Category add / rename / delete (entries move to "อื่น ๆ").
    const custom = await acc.saveCategory({ type: 'expense', name: 'ค่าที่พัก' });
    await assert.rejects(() => acc.saveCategory({ type: 'expense', name: 'ค่าที่พัก' }), /มีหมวดหมู่ชื่อนี้แล้ว/);
    await acc.saveCategory({ id: custom.id, name: 'ค่าที่พัก/รีสอร์ท' });
    const lodging = await acc.saveEntry({ categoryId: custom.id, tripId: 't1', amount: 1200, date: '2030-01-20', description: 'รีสอร์ท' }, 'tester');
    const removed = await acc.deleteCategory(custom.id);
    assert.equal(removed.moved, 1);
    assert.equal((await isolated.collection('accountEntries').findOne({ id: lodging.id })).categoryId, cat('อื่น ๆ').id);
    await assert.rejects(() => acc.deleteCategory(cat('อื่น ๆ').id), /ลบไม่ได้/);
    categories = await acc.listCategories();
    console.log('✔ categories: add, rename, delete with reassignment, system categories protected');

    // Entries: validation, edit, delete.
    await assert.rejects(() => acc.saveEntry({ categoryId: cat('ค่ารถตู้').id, tripId: 't1', amount: 0, date: '2030-01-20' }, 'tester'), /จำนวนเงิน/);
    await assert.rejects(() => acc.saveEntry({ categoryId: cat('ค่ารถตู้').id, tripId: 'nope', amount: 10, date: '2030-01-20' }, 'tester'), /ไม่พบทริป/);
    await assert.rejects(() => acc.saveEntry({ categoryId: cat('ค่ารถตู้').id, tripId: 't1', amount: 10, date: '2030-13-40' }, 'tester'), /วันที่/);
    await assert.rejects(() => acc.saveEntry({ categoryId: cat('ค่าตอบแทนหุ้นส่วน').id, amount: 10, date: '2030-01-20' }, 'tester'), /ต้องระบุหุ้นส่วนผู้รับ/);
    const van = await acc.saveEntry({ categoryId: cat('ค่ารถตู้').id, tripId: 't1', amount: 4000, date: '2030-01-20' }, 'tester');
    const edited = await acc.saveEntry({ categoryId: cat('ค่ารถตู้').id, tripId: 't1', amount: 4500.5, date: '2030-01-21', description: 'แก้แล้ว' }, 'editor', van.id);
    assert.equal(edited.amountSatang, 450050);
    assert.equal(edited.updatedBy, 'editor');
    const tmp = await acc.saveEntry({ categoryId: cat('ค่าอาหาร').id, tripId: 't1', amount: 99, date: '2030-01-21' }, 'tester');
    await acc.deleteEntry(tmp.id);
    const otherIncome = categories.find(c => c.type === 'income' && c.name === 'ค่าบริการเสริม');
    await acc.saveEntry({ categoryId: otherIncome.id, tripId: 't1', amount: 500, date: '2030-01-22' }, 'tester');
    await acc.saveEntry({ categoryId: cat('ค่าธรรมเนียม').id, tripId: null, amount: 300, date: '2030-01-22', description: 'ค่าธรรมเนียมธนาคาร' }, 'tester');
    console.log('✔ entries: validation, add, edit, delete');

    // Partners: share cap, advance, reimbursement, compensation, delete protection.
    const a = await acc.savePartner({ name: 'หุ้นส่วน A', sharePercent: 60 });
    await assert.rejects(() => acc.savePartner({ name: 'เกิน', sharePercent: 50 }), /เกิน 100%/);
    const b = await acc.savePartner({ name: 'หุ้นส่วน B', sharePercent: 40 });
    await acc.saveEntry({ categoryId: cat('ค่าน้ำมัน').id, tripId: 't2', amount: 1500, date: '2030-01-02', paidByPartnerId: a.id }, 'tester');
    await acc.addReimbursement({ partnerId: a.id, amount: 1000, date: '2030-01-05' }, 'tester');
    await acc.saveEntry({ categoryId: cat('ค่าตอบแทนหุ้นส่วน').id, tripId: 't2', amount: 800, date: '2030-01-03', payeePartnerId: b.id }, 'tester');
    await assert.rejects(() => acc.deletePartner(a.id), /ลบไม่ได้/);
    const spare = await acc.savePartner({ name: 'ชั่วคราว' });
    await acc.deletePartner(spare.id);
    console.log('✔ partners: share cap, advances, reimbursements, compensation, delete protection');

    // Combined accounting read.
    const data = await acc.loadAccounting();
    const t1 = data.trips.find(t => t.tripId === 't1');
    const t2 = data.trips.find(t => t.tripId === 't2');
    assert.equal(t1.paymentIncomeSatang, 450000);
    assert.equal(t1.otherIncomeSatang, 50000);
    assert.equal(t1.expenseSatang, 450050 + 120000);
    assert.equal(t1.outstandingSatang, 150000);
    assert.equal(t1.passengers, 2);
    assert.equal(t2.expenseSatang, 150000 + 80000);
    assert.equal(t2.profitSatang, 250000 - 230000);
    const o = data.overview;
    assert.equal(o.openTrips, 1); assert.equal(o.closedTrips, 1);
    assert.equal(o.incomeSatang, 450000 + 50000 + 250000);
    assert.equal(o.overheadExpenseSatang, 30000);
    assert.equal(o.expenseSatang, 570050 + 230000 + 30000);
    assert.equal(o.profitSatang, o.incomeSatang - o.expenseSatang);
    assert.equal(o.outstandingSatang, 150000);
    const pa = data.partners.find(p => p.id === a.id);
    assert.equal(pa.owedSatang, 50000);
    assert.equal(o.owedToPartnersSatang, 50000);
    assert.equal(data.partners.find(p => p.id === b.id).compensationSatang, 80000);
    console.log('✔ dashboard totals, per-trip P&L and payment linkage');

    // Excel report.
    const file = await report.buildAccountingWorkbook(data);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file);
    assert.deepEqual(wb.worksheets.map(w => w.name), ['สรุปภาพรวม', 'รายทริป', 'แยกตามหมวด', 'รายการรับ-จ่าย', 'หุ้นส่วน']);
    const tripsSheet = wb.getWorksheet('รายทริป');
    const row = [2, 3].map(n => tripsSheet.getRow(n)).find(r => r.getCell(1).value === 'ดอยหลวง');
    assert.equal(row.getCell(9).value, 200, 'profit column for ดอยหลวง');
    assert.equal(wb.getWorksheet('รายการรับ-จ่าย').rowCount, 1 + data.entries.length);
    console.log('✔ Excel accounting report');
    console.log('ALL ACCOUNTING CHECKS PASSED');
  } finally {
    if (db) for (const name of names) await db.collection(name).drop().catch(() => undefined);
    await client.close();
  }
}
main().catch(error => { console.error(error); process.exit(1); });
