'use client';

import React, { useState, useRef } from 'react';
import { User, Save, Upload, Key, RefreshCw, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

export default function ProfileTab() {
  const { data: session, update } = useSession();
  const [name, setName] = useState(session?.user?.name || '');
  const [password, setPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState((session?.user as any)?.avatarUrl || '');
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `avatar-${Date.now()}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('images')
        .upload(`avatars/${fileName}`, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(`avatars/${fileName}`);
        
      setAvatarUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      alert('อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admins/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password: password || undefined, avatar_url: avatarUrl })
      });
      const data = await res.json();
      
      if (data.success) {
        alert('บันทึกข้อมูลเรียบร้อยแล้ว');
        setPassword('');
        // Update session
        await update({ name, avatarUrl });
      } else {
        alert(data.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">โปรไฟล์ส่วนตัว</h2>
            <p className="text-xs text-slate-400 mt-1">จัดการรูปโปรไฟล์ ชื่อแสดงผล และตั้งค่าบัญชีของคุณ</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-100 bg-slate-100 shrink-0 relative group">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black">
                  {name ? name.charAt(0).toUpperCase() : 'A'}
                </div>
              )}
              <div 
                className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
              </div>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 mb-1">รูปโปรไฟล์</h3>
              <p className="text-xs text-slate-500 mb-3 max-w-xs leading-relaxed">รูปภาพควรเป็นสี่เหลี่ยมจัตุรัสและขนาดไม่เกิน 5MB (ระบบจะใช้รูปนี้แสดงในแถบเมนูด้านซ้ายและในรายการแอดมิน)</p>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleUpload} disabled={uploading} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition"
              >
                {uploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูปภาพใหม่'}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-8 space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Username (บัญชีล็อกอิน)</label>
              <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-500 cursor-not-allowed">
                {(session?.user as any)?.username || '-'}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">ชื่อที่แสดงผล (Display Name)</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-bold text-slate-800 transition"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">เปลี่ยนรหัสผ่าน (เว้นว่างหากไม่ต้องการเปลี่ยน)</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="รหัสผ่านใหม่..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm font-bold text-slate-800 transition placeholder:font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 mt-8 pt-6 flex justify-between items-center gap-3">
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading || uploading}
            className="px-8 py-2.5 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึกโปรไฟล์
          </button>
        </div>
      </div>
    </div>
  );
}
