'use client';

export default function ReviewCopyFields({ value, onChange, perTrip = false }: {
  value: { reviewTitle: string; reviewDescription: string };
  onChange: (copy: { reviewTitle: string; reviewDescription: string }) => void;
  perTrip?: boolean;
}) {
  return <section className="space-y-3 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
    <h3 className="font-bold text-slate-800">{perTrip ? 'ข้อความหน้ารีวิวเฉพาะทริปนี้' : 'ข้อความเริ่มต้นหน้าให้คะแนนรีวิว'}</h3>
    <p className="text-xs text-slate-500">{perTrip ? 'เว้นว่างช่องไหน จะใช้ค่าเริ่มต้นจากตั้งค่าเว็บไซต์สำหรับช่องนั้น ลบข้อความเพื่อกลับไปใช้ค่าเริ่มต้น' : 'ใช้กับทุกทริปที่ไม่ได้กำหนดข้อความเฉพาะ'}</p>
    <label className="block text-xs font-bold text-slate-600">หัวข้อขอบคุณ
      <textarea rows={2} maxLength={300} required={!perTrip} value={value.reviewTitle} onChange={e => onChange({ ...value, reviewTitle: e.target.value })} placeholder={perTrip ? 'ใช้หัวข้อเริ่มต้นจากตั้งค่าเว็บไซต์' : ''} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
    </label>
    <label className="block text-xs font-bold text-slate-600">ข้อความรายละเอียด
      <textarea rows={5} maxLength={3000} required={!perTrip} value={value.reviewDescription} onChange={e => onChange({ ...value, reviewDescription: e.target.value })} placeholder={perTrip ? 'ใช้รายละเอียดเริ่มต้นจากตั้งค่าเว็บไซต์' : ''} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" />
    </label>
  </section>;
}
