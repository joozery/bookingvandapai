import { RefreshCw, Shield } from 'lucide-react';
import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';

export interface ProfileFormProps {
  hasProfile: boolean;
  values: Record<string, any>;
  setValue: (key: string, value: any) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function ProfileForm({ hasProfile, values, setValue, onSubmit, onCancel, isSubmitting }: ProfileFormProps) {
  const text = (key: string) => String(values[key] || '');
  const input = (key: string, type = 'text', maxLength?: number) => (
    <input type={type} required value={text(key)} maxLength={maxLength} onChange={event => setValue(key, type === 'tel' ? event.target.value.replace(/[^0-9]/g, '').slice(0, maxLength) : event.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-brand-700 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-200 transition duration-200" />
  );
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 animate-in fade-in zoom-in-95 duration-500 mt-4">
      <div className="bg-white max-w-md w-full rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-brand-700 p-6 text-center"><div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3"><Shield className="w-8 h-8 text-white" /></div><h2 className="text-xl font-bold text-white">ข้อมูลส่วนตัวเพื่อการทำประกัน</h2><p className="text-white/80 text-xs mt-1">กรุณากรอกข้อมูลให้ครบถ้วนเพื่อประโยชน์ของท่าน</p></div>
        <form noValidate onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="flex gap-3"><div className="w-1/3"><label className="block text-[11px] font-bold text-slate-500 mb-1">คำนำหน้า *</label><select required value={text('titleName')} onChange={e => setValue('titleName', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"><option value="">เลือก</option><option value="นาย">นาย</option><option value="นาง">นาง</option><option value="นางสาว">นางสาว</option></select></div><div className="w-2/3"><label className="block text-[11px] font-bold text-slate-500 mb-1">ชื่อ-นามสกุล *</label>{input('fullName')}</div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-[11px] font-bold text-slate-500 mb-1">ชื่อเล่น *</label>{input('nickname')}</div><div><label className="block text-[11px] font-bold text-slate-500 mb-1">เบอร์โทรศัพท์ *</label>{input('phone', 'tel', 10)}</div></div>
          <div><label className="block text-[11px] font-bold text-slate-500 mb-1">เลขบัตรประชาชน *</label>{input('nationalId', 'tel', 13)}</div>
          <div><label className="block text-[11px] font-bold text-slate-500 mb-1">วันเดือนปีเกิด *</label><ThaiDatePicker id="birthDate" required min="1900-01-01" max={new Date().toISOString().slice(0, 10)} yearStart={1900} yearEnd={new Date().getFullYear()} value={text('birthDate')} onChange={value => setValue('birthDate', value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 text-xs" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-[11px] font-bold text-slate-500 mb-1">ชื่อผู้ติดต่อฉุกเฉิน *</label>{input('emergencyName')}</div><div><label className="block text-[11px] font-bold text-slate-500 mb-1">เบอร์ฉุกเฉิน *</label>{input('emergencyPhone', 'tel', 10)}</div></div>
          <div><label className="block text-[11px] font-bold text-slate-500 mb-1">แพ้อาหาร (ถ้ามี)</label>{input('allergies')}</div>
          <div><label className="block text-[11px] font-bold text-slate-500 mb-1">โรคประจำตัว (ถ้ามี)</label>{input('medicalConditions')}</div>
          <label className="flex items-start gap-2.5 bg-purple-50/50 border border-purple-100 rounded-xl p-3 text-[10.5px] leading-relaxed text-slate-600 font-semibold"><input type="checkbox" required checked={Boolean(values.consentInsurance)} onChange={e => setValue('consentInsurance', e.target.checked)} className="mt-0.5 w-3.5 h-3.5 accent-primary" /><span>ข้าพเจ้ายินยอมให้ผู้จัดทริปเก็บ ใช้ และเปิดเผยข้อมูลส่วนบุคคลที่จำเป็นเพื่อทำประกันและดูแลความปลอดภัยระหว่างเดินทาง</span></label>
          <div className="flex gap-2 mt-4">{hasProfile && <button type="button" onClick={onCancel} className="w-1/3 bg-slate-200 text-slate-700 text-xs font-bold py-3 rounded-xl">ยกเลิก</button>}<button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-700 hover:bg-brand-800 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" />กำลังบันทึก...</> : hasProfile ? 'ส่งคำขอแก้ไขข้อมูล' : 'บันทึกข้อมูลส่วนตัว'}</button></div>
        </form>
      </div>
    </div>
  );
}
