'use client';

import { useState } from 'react';
import { supabase } from '@/lib/browserSupabase';
import { Upload, Image as ImageIcon, RotateCcw, Link2 } from 'lucide-react';

type Images = { logo_image?: string; banner_image?: string; background_image?: string };

function ImageField({ field, title, description, value, defaultValue, onChange }: {
  field: keyof Images;
  title: string;
  description?: string;
  value?: string;
  defaultValue?: string;
  onChange: (patch: Partial<Images>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

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

  const currentSrc = value || defaultValue;

  return (
    <div className="space-y-3 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 transition-all hover:border-purple-200">
      <div className="flex items-start justify-between gap-2">
        <div>
          <label htmlFor={`input-${field}`} className="block text-sm font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
            <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
            {title}
          </label>
          {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor={`input-${field}`} className="block text-xs font-bold text-slate-600">
          เลือกไฟล์รูปใหม่ (JPG, PNG, WebP ไม่เกิน 5MB)
        </label>
        <input
          id={`input-${field}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }}
          className="block w-full min-w-0 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-purple-600 file:px-3 file:py-2 file:font-bold file:text-white hover:file:bg-purple-700 cursor-pointer disabled:opacity-50"
        />
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
        >
          <Link2 className="w-3.5 h-3.5" />
          {showUrlInput ? 'ซ่อนช่องระบุ URL' : 'หรือใช้ URL ลิงก์รูปภาพจากภายนอก'}
        </button>
        {showUrlInput && (
          <input
            id={`url-${field}`}
            type="url"
            value={value || ''}
            placeholder={defaultValue || 'https://...'}
            onChange={e => onChange({ [field]: e.target.value })}
            className="w-full mt-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-purple-500"
          />
        )}
      </div>

      {uploading && <p role="status" className="text-xs text-purple-700 font-medium animate-pulse flex items-center gap-1.5"><Upload className="w-3.5 h-3.5 animate-bounce" /> กำลังอัปโหลดรูป…</p>}
      {error && <p role="alert" className="text-xs text-red-600 font-medium">{error}</p>}

      {currentSrc ? (
        <div className="space-y-2 pt-2 border-t border-purple-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">ตัวอย่างรูปที่ใช้งานอยู่:</span>
            {value && (
              <button
                type="button"
                disabled={uploading}
                onClick={() => { setError(''); onChange({ [field]: '' }); }}
                className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                คืนค่ารูปเริ่มต้น
              </button>
            )}
          </div>
          <div className="relative rounded-xl border border-slate-200 bg-slate-900/5 p-2 flex items-center justify-center min-h-[120px] overflow-hidden">
            <img src={currentSrc} alt={`ตัวอย่าง${title}`} className="max-h-48 w-full object-contain rounded-lg" />
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 italic">กำลังใช้รูปภาพค่าเริ่มต้น</p>
      )}
    </div>
  );
}

export default function HomepageImageFields({ value, onChange }: {
  value: Images; onChange: (patch: Partial<Images>) => void;
}) {
  return (
    <section className="space-y-4">
      <h3 className="border-b border-slate-100 pb-2 font-bold text-slate-800 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-purple-600" />
        จัดการรูปภาพโลโก้และพื้นหลังเว็บไซต์
      </h3>
      <p className="text-xs leading-relaxed text-slate-500">
        คุณสามารถอัปโหลดรูปโลโก้ประจำเว็บ รูปแบนเนอร์ส่วนหัว หรือรูปพื้นหลังหน้าแรกได้ที่นี่ บันทึกอัตโนมัติเมื่อเลือกไฟล์เสร็จสิ้น
      </p>
      <div className="grid min-w-0 gap-4 md:grid-cols-3">
        <ImageField
          field="logo_image"
          title="รูปโลโก้เว็บไซต์ (Logo)"
          description="แสดงใน Header, Footer และจุดสำคัญบนเว็บ"
          value={value.logo_image}
          defaultValue="/logo/logov2.png"
          onChange={onChange}
        />
        <ImageField
          field="banner_image"
          title="รูปแบนเนอร์ด้านบน (Banner)"
          description="แนะนำรูปแนวนอน 1920 × 640px"
          value={value.banner_image}
          defaultValue="/logo/scenic_van_trip.png"
          onChange={onChange}
        />
        <ImageField
          field="background_image"
          title="รูปพื้นหลังหน้าแรก (Background)"
          description="แสดงเป็นพื้นหลังใหญ่ของเว็บไซต์"
          value={value.background_image}
          onChange={onChange}
        />
      </div>
    </section>
  );
}
