'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type Images = { banner_image: string; background_image: string };

function ImageField({ field, title, value, onChange }: {
  field: keyof Images; title: string; value: string; onChange: (patch: Partial<Images>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function upload(file?: File) {
    if (!file) return;
    setError('');
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    if (!extensions[file.type] || file.size > 5 * 1024 * 1024) {
      setError('เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
      return;
    }
    setUploading(true);
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const path = `homepage/${field}/${crypto.randomUUID()}.${extensions[file.type]}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(path);
      onChange({ [field]: data.publicUrl });
    } catch {
      setError('อัปโหลดรูปไม่สำเร็จ กรุณาตรวจสอบไฟล์และลองอีกครั้ง');
    } finally { setUploading(false); }
  }

  return <div className="space-y-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-4">
    <label htmlFor={field} className="block text-sm font-bold text-slate-800">{title}</label>
    <input id={field} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading}
      onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }}
      className="block w-full min-w-0 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-100 file:px-3 file:py-2 file:font-bold file:text-purple-800" />
    {uploading && <p role="status" className="text-xs text-purple-700">กำลังอัปโหลดรูป…</p>}
    {error && <p role="alert" className="text-xs text-red-600">{error}</p>}
    {value ? <>
      <img src={value} alt={`ตัวอย่าง${title}`} className="max-h-64 w-full rounded-xl bg-white object-contain" />
      <button type="button" disabled={uploading} onClick={() => { setError(''); onChange({ [field]: '' }); }}
        className="text-xs font-bold text-purple-700 underline disabled:opacity-50">ใช้รูปแบบเริ่มต้น</button>
    </> : <p className="text-xs text-slate-500">กำลังใช้รูปแบบเริ่มต้น</p>}
  </div>;
}

export default function HomepageImageFields({ value, onChange }: {
  value: Images; onChange: (patch: Partial<Images>) => void;
}) {
  return <section className="space-y-4">
    <h3 className="border-b border-slate-100 pb-2 font-bold text-slate-800">รูปแบนเนอร์และพื้นหลังหน้าแรก</h3>
    <p className="text-xs leading-relaxed text-slate-500">รองรับ JPG, PNG และ WebP ไม่เกิน 5 MB แนะนำแบนเนอร์แนวนอน 1920 × 640 พิกเซล รูปจะถูกครอบตามขนาดหน้าจอ โดยข้อความเดิมแสดงทับบนแบนเนอร์ บันทึกอัตโนมัติหลังอัปโหลดสำเร็จ เมื่อขึ้น “บันทึกแล้ว” ให้รีเฟรชหน้าเว็บเพื่อดูรูปใหม่</p>
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <ImageField field="banner_image" title="รูปแบนเนอร์ด้านบน" value={value.banner_image} onChange={onChange} />
      <ImageField field="background_image" title="รูปพื้นหลังหน้าแรก" value={value.background_image} onChange={onChange} />
    </div>
  </section>;
}
