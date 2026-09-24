'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import { defaultHomepageSettings } from '@/lib/homepageSettings';
import ReviewCopyFields from '@/components/ReviewCopyFields';

export default function SettingsTab() {
  const [settings, setSettings] = useState({
    ...defaultHomepageSettings,
    footer_description: '',
    contact_phone: '',
    contact_email: '',
    contact_location: '',
    copyright_year: '',
    line_url: '',
    privacy_policy: '',
    terms_of_service: ''
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const savedSettings = useRef('');
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error('Could not load settings');
      const loaded = { ...defaultHomepageSettings, ...data.settings };
      savedSettings.current = JSON.stringify(loaded);
      setSettings(loaded);
    } catch (e) {
      console.error(e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (loading || loadError) return;
    const body = JSON.stringify(settings);
    let current = true;
    setSaveStatus('รอบันทึกอัตโนมัติ…');
    const timer = setTimeout(() => {
      if (!formRef.current?.checkValidity()) {
        setSaveStatus('กรุณากรอกข้อมูลให้ครบและตรวจรูปแบบอีเมล / ลิงก์');
        return;
      }
      // Serialize writes so a slow older request cannot overwrite the latest edit.
      saveQueue.current = saveQueue.current.then(async () => {
        if (!current) return;
        if (body === savedSettings.current) {
          setSaveStatus('บันทึกแล้ว');
          return;
        }
        setSaveStatus('กำลังบันทึก…');
        try {
          const res = await fetch('/api/settings', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body,
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error('Save failed');
          savedSettings.current = body;
          if (current) setSaveStatus('บันทึกแล้ว');
        } catch {
          if (current) setSaveStatus('บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง');
        }
      });
    }, 800);
    return () => { current = false; clearTimeout(timer); };
  }, [settings, loading, loadError, retry]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (loadError) return <p role="alert" className="p-6 text-red-600">โหลดการตั้งค่าไม่สำเร็จ กรุณารีเฟรชหน้าเพื่อลองใหม่</p>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-violet-600" />
            ตั้งค่าเว็บไซต์
          </h2>
          <p className="text-xs text-slate-400 mt-1">จัดการข้อความชวนร่วมเดินทาง คำอธิบายกลุ่ม และข้อมูลการติดต่อ</p>
          <p role="status" className="text-xs text-violet-700 mt-2">{saveStatus}</p>
          {saveStatus.startsWith('บันทึกไม่สำเร็จ') && <button type="button" onClick={() => setRetry(value => value + 1)} className="mt-2 text-xs font-bold text-violet-700 underline">ลองบันทึกอีกครั้ง</button>}
        </div>
      </div>

      <form ref={formRef} onSubmit={e => e.preventDefault()} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
        <ReviewCopyFields value={settings} onChange={copy => setSettings({ ...settings, ...copy })} />
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">ข้อความชวนร่วมเดินทาง (กล่องสีม่วงหน้าแรก)</h3>
          <div className="space-y-1.5">
            <label htmlFor="cta-title" className="text-xs font-bold text-slate-600">หัวข้อชวนร่วมเดินทาง</label>
            <textarea id="cta-title" required rows={2} value={settings.cta_title}
              onChange={e => setSettings({...settings, cta_title: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cta-description" className="text-xs font-bold text-slate-600">ข้อความรายละเอียดใต้หัวข้อ</label>
            <textarea id="cta-description" required rows={4} value={settings.cta_description}
              onChange={e => setSettings({...settings, cta_description: e.target.value})}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">ข้อมูลส่วนท้ายเว็บ (Footer)</h3>
          
          <div className="space-y-1.5">
            <label htmlFor="footer-description" className="text-xs font-bold text-slate-600">คำอธิบายกลุ่ม (ใต้โลโก้ท้ายหน้าแรก)</label>
            <textarea
              id="footer-description"
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

      </form>
    </div>
  );
}
