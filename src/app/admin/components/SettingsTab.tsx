'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function SettingsTab() {
  const [settings, setSettings] = useState({
    footer_description: '',
    contact_phone: '',
    contact_email: '',
    contact_location: '',
    copyright_year: '',
    line_url: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet-600" />
            ตั้งค่าเว็บไซต์
          </h2>
          <p className="text-xs text-slate-400 mt-1">จัดการข้อความ Footer, ข้อมูลการติดต่อ</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
        
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">ข้อมูลส่วนท้ายเว็บ (Footer)</h3>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">คำอธิบายเว็บไซต์ (ใต้โลโก้)</label>
            <textarea
              required
              rows={3}
              value={settings.footer_description}
              onChange={e => setSettings({...settings, footer_description: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
              placeholder="กลุ่มเดินป่าและเดินทางสายผจญภัย..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">เบอร์โทรศัพท์ติดต่อ</label>
              <input
                type="text"
                required
                value={settings.contact_phone}
                onChange={e => setSettings({...settings, contact_phone: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">อีเมลติดต่อ</label>
              <input
                type="email"
                required
                value={settings.contact_email}
                onChange={e => setSettings({...settings, contact_email: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-600">ที่ตั้ง / สถานที่</label>
              <input
                type="text"
                required
                value={settings.contact_location}
                onChange={e => setSettings({...settings, contact_location: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">ปี Copyright (เช่น 2026)</label>
            <input
              type="text"
              required
              value={settings.copyright_year}
              onChange={e => setSettings({...settings, copyright_year: e.target.value})}
              className="w-32 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-600">ลิ้งก์ติดต่อ LINE (LINE Official URL)</label>
              <input
                type="url"
                required
                value={settings.line_url}
                onChange={e => setSettings({...settings, line_url: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                placeholder="https://line.me/ti/p/..."
              />
            </div>
          </div>

        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-violet-600 text-white font-bold text-sm rounded-lg hover:bg-violet-700 transition shadow-sm flex items-center gap-2 disabled:opacity-70"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
          </button>
        </div>
      </form>
    </div>
  );
}
