'use client';

import { useState } from 'react';
import { supabase } from '@/lib/browserSupabase';
import { convertImageToWebp } from '@/lib/imageToWebp';
import { defaultShareSettings, normalizeShareSettings, validShareImage } from '@/lib/shareSettings';
import { Share2, Upload } from 'lucide-react';

type ShareSettings = typeof defaultShareSettings;

export default function ShareSettingsFields({ value, onChange }: {
  value: ShareSettings;
  onChange: (patch: Partial<ShareSettings>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const preview = normalizeShareSettings(value);
  const fieldClass = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500';

  async function upload(file?: File) {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
      return;
    }
    setUploading(true);
    try {
      const webpFile = await convertImageToWebp(file);
      const path = `share/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage.from('images').upload(path, webpFile, { contentType: 'image/webp' });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(path);
      onChange({ share_image: data.publicUrl });
    } catch {
      setError('อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally { setUploading(false); }
  }

  return (
    <section className="space-y-4">
      <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
        <Share2 className="w-4 h-4 text-violet-600" />
        ข้อความและรูปภาพสำหรับแชร์ลิงก์ (LINE / Social Media Card)
      </h3>
      <p className="text-xs text-slate-500">
        ใช้เมื่อมีคนคัดลอกลิงก์เว็บไซต์ไปวางในแอป LINE, Facebook หรือโซเชียลมิเดียอื่นๆ เพื่อแสดงเป็นการ์ดพรีวิว
      </p>

      <div className="space-y-1.5">
        <label htmlFor="share-title" className="text-xs font-bold text-slate-600">หัวข้อแชร์ลิงก์</label>
        <input id="share-title" maxLength={150} value={value.share_title} placeholder={defaultShareSettings.share_title} onChange={e => onChange({ share_title: e.target.value })} className={fieldClass} />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="share-description" className="text-xs font-bold text-slate-600">คำอธิบายใต้หัวข้อ</label>
        <textarea id="share-description" rows={3} maxLength={500} value={value.share_description} placeholder={defaultShareSettings.share_description} onChange={e => onChange({ share_description: e.target.value })} className={fieldClass} />
      </div>

      <div className="space-y-2">
        <label htmlFor="share-upload" className="block text-xs font-bold text-slate-600">อัปโหลดรูปภาพปกแชร์ลิงก์ (JPG, PNG, WebP)</label>
        <input
          id="share-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={e => { void upload(e.target.files?.[0]); e.target.value = ''; }}
          className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:font-bold file:text-white hover:file:bg-violet-700 cursor-pointer disabled:opacity-50"
        />
        {uploading && <p role="status" className="text-xs text-violet-700 font-medium flex items-center gap-1.5"><Upload className="w-3.5 h-3.5 animate-bounce" /> กำลังอัปโหลดรูปภาพปก…</p>}
        {error && <p role="alert" className="text-xs text-red-600 font-medium">{error}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="share-image" className="block text-xs font-bold text-slate-600">หรือระบุ URL ลิงก์รูปภาพปกแชร์</label>
        <input id="share-image" maxLength={2048} disabled={uploading} value={value.share_image} placeholder="https://… หรือ /logo/logo.jpg"
          ref={node => node?.setCustomValidity(value.share_image.trim() && !validShareImage(value.share_image.trim()) ? 'กรุณาใช้ลิงก์ HTTPS หรือพาธรูปในเว็บไซต์' : '')}
          onChange={e => onChange({ share_image: e.target.value })} className={fieldClass} />
      </div>

      <div className="space-y-2 pt-2">
        <p className="text-xs font-bold text-slate-600">ตัวอย่างการ์ดพรีวิวเวลานำลิงก์ไปแชร์ลง LINE:</p>
        <div className="max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <img key={preview.share_image} src={preview.share_image} alt="ตัวอย่างรูปเวลาแชร์" className="w-full aspect-[1.91/1] object-cover bg-slate-100" />
          <div className="p-3.5 space-y-1 bg-white">
            <p className="text-sm font-bold text-slate-900 break-words leading-snug">{preview.share_title}</p>
            <p className="text-xs text-slate-500 whitespace-pre-wrap break-words leading-relaxed">{preview.share_description}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400">ตัวอย่างโดยประมาณ (รูปแบบจริงขึ้นอยู่กับแต่ละแอป เช่น LINE, Facebook, Messenger)</p>
      </div>
    </section>
  );
}
