'use client';

import React, { useState, useEffect } from 'react';
import { 
  Lock, ShieldAlert, Trash2, Edit, Save, X, RefreshCw, 
  UserPlus, UserCog, UserX, AlertCircle, Key, User, Eye, EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  avatar_url?: string;
  permissions: string[];
  isBlocked: boolean;
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'แดชบอร์ด (Dashboard)' },
  { id: 'trips', label: 'จัดการทริป (Trips)' },
  { id: 'vans', label: 'จัดการรถ (Vans)' },
  { id: 'bookings', label: 'การจองและลูกทริป (Bookings)' },
  { id: 'checkin', label: 'QR Check-in (Check-in)' },
  { id: 'users', label: 'จัดการลูกทริป (Users)' },
  { id: 'staff', label: 'ทีมงาน / ผู้จัด (Admin Roles)' },
  { id: 'insurance', label: 'ประกันการเดินทาง (Insurance)' },
  { id: 'reports', label: 'รายงาน (Reports)' },
  { id: 'settings', label: 'ตั้งค่า (Settings)' },
];

export default function AdminsTab() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formName, setFormName] = useState('');
  const [formBlocked, setFormBlocked] = useState(false);
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admins');
      const data = await res.json();
      if (data.success) {
        setAdmins(data.admins || []);
      } else {
        if (data.error?.includes('relation "admins" does not exist')) {
          setError('ตาราง admins ยังไม่ถูกสร้างในฐานข้อมูล (โปรดสร้างตารางก่อนใช้งาน)');
        } else {
          setError(data.error || 'โหลดข้อมูลไม่สำเร็จ');
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const resetForm = () => {
    setFormUsername('');
    setFormPassword('');
    setFormName('');
    setFormBlocked(false);
    setFormPermissions([]);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (admin: AdminUser) => {
    setFormUsername(admin.username);
    setFormPassword(''); // don't show password
    setFormName(admin.name);
    setFormPermissions(admin.permissions || []);
    setFormBlocked(admin.isBlocked);
    setEditingId(admin.id);
    setShowForm(true);
  };

  const togglePermission = (id: string) => {
    setFormPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) return alert('กรุณากรอก Username');
    if (!formName.trim()) return alert('กรุณากรอกชื่อ-นามสกุล');
    if (!editingId && !formPassword) return alert('กรุณากรอกรหัสผ่าน');

    try {
      const url = editingId ? `/api/admins/${editingId}` : '/api/admins';
      const method = editingId ? 'PUT' : 'POST';
      
      const body: any = { 
        name: formName.trim(), 
        permissions: formPermissions,
        isBlocked: formBlocked
      };

      if (!editingId) {
        body.username = formUsername.trim();
      }
      if (formPassword) {
        body.password = formPassword;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        resetForm();
        fetchAdmins();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('ยืนยันลบสิทธินี้?')) return;
    try {
      const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchAdmins();
      } else {
        alert(data.error || 'ลบไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 flex flex-col items-center justify-center text-rose-600 space-y-3">
        <AlertCircle className="w-10 h-10" />
        <p className="font-bold">{error}</p>
        {error.includes('ตาราง') && (
          <div className="text-xs text-rose-500 max-w-lg bg-white p-4 rounded border border-rose-100 mt-2 text-left">
            <p className="font-semibold mb-2">คำสั่ง SQL สำหรับสร้างตาราง (Run ใน Supabase SQL Editor):</p>
            <pre className="overflow-x-auto">
{`create table admins (
  id uuid default uuid_generate_v4() primary key,
  username text not null unique,
  password text not null,
  name text not null,
  permissions jsonb not null default '[]'::jsonb,
  "isBlocked" boolean default false,
  "createdAt" timestamp with time zone default timezone('utc'::text, now())
);`}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-violet-600" />
            ระบบแอดมิน (Username & Password)
          </h2>
          <p className="text-xs text-slate-400 mt-1">กำหนดสิทธิแอดมินและการเข้าถึงเมนูต่างๆ</p>
        </div>
        <div className="flex items-center gap-2">

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold shadow-sm hover:bg-violet-700 transition"
            >
              <UserPlus className="w-4 h-4" />
              สร้างแอดมินใหม่
            </button>
          )}
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-violet-200 rounded-xl shadow-sm p-5 animate-in slide-in-from-top-4 fade-in duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              {editingId ? <UserCog className="w-4 h-4 text-violet-600" /> : <UserPlus className="w-4 h-4 text-violet-600" />}
              {editingId ? 'แก้ไขข้อมูลแอดมิน' : 'สร้างแอดมินใหม่'}
            </h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700 border-b pb-2">ข้อมูลผู้ใช้</h4>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Username <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    disabled={!!editingId}
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="เช่น admin_01"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 disabled:opacity-50"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">ชื่อ-นามสกุล <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Password {editingId && '(กรอกเมื่อต้องการเปลี่ยน)'} {!editingId && <span className="text-rose-500">*</span>}</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingId}
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder={editingId ? 'ปล่อยว่างไว้หากไม่ต้องการเปลี่ยน' : '••••••••'}
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {editingId && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <input
                    type="checkbox"
                    id="isBlocked"
                    checked={formBlocked}
                    onChange={e => setFormBlocked(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                  <label htmlFor="isBlocked" className="text-sm font-bold text-rose-600 flex items-center gap-1 cursor-pointer">
                    <ShieldAlert className="w-4 h-4" /> ระงับการใช้งาน (Block)
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-700 border-b pb-2 flex justify-between">
                <span>สิทธิการเข้าถึงเมนู (Permissions)</span>
                <button type="button" onClick={() => setFormPermissions(AVAILABLE_PERMISSIONS.map(p => p.id))} className="text-xs text-violet-600 hover:underline">เลือกทั้งหมด</button>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                {AVAILABLE_PERMISSIONS.map(perm => {
                  const checked = formPermissions.includes(perm.id);
                  return (
                    <label key={perm.id} className={cn("flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors", checked ? "bg-violet-50 border-violet-200" : "bg-white border-slate-200 hover:bg-slate-50")}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(perm.id)}
                        className="mt-0.5 w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                      />
                      <span className={cn("text-xs font-semibold select-none", checked ? "text-violet-800" : "text-slate-600")}>
                        {perm.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition">
              ยกเลิก
            </button>
            <button type="submit" className="px-5 py-2 rounded-lg bg-violet-600 text-white text-sm font-bold shadow-sm hover:bg-violet-700 transition flex items-center gap-2">
              <Save className="w-4 h-4" /> บันทึกข้อมูล
            </button>
          </div>
        </form>
      )}

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading && admins.length === 0 ? (
          <div className="py-20 flex justify-center"><RefreshCw className="w-6 h-6 text-slate-300 animate-spin" /></div>
        ) : admins.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Lock className="w-10 h-10 opacity-20" />
            <p className="font-semibold text-sm">ยังไม่มีแอดมินในระบบ</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">แอดมิน</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">Username</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">สิทธิเข้าถึง</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">สร้างเมื่อ</th>
                  <th className="px-4 py-3 w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {admins.map((admin) => {
                  return (
                    <tr key={admin.id} className={cn("hover:bg-slate-50/50 transition group", admin.isBlocked && "bg-rose-50/30")}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs shrink-0 border border-slate-200", admin.isBlocked ? "bg-rose-400" : "bg-gradient-to-br from-violet-500 to-purple-600")}>
                            {admin.avatar_url ? (
                              <img src={admin.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              admin.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">
                              {admin.name}
                            </p>
                            {admin.isBlocked && (
                              <span className="inline-block mt-0.5 text-[9px] font-bold text-rose-600 bg-rose-100 px-1.5 rounded-sm">BLOCKED</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">{admin.username}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {admin.permissions?.length > 0 ? (
                            admin.permissions.map(p => {
                              const pLabel = AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label.split(' ')[0] || p;
                              return (
                                <span key={p} className="inline-block text-[9px] font-bold text-violet-700 bg-violet-100 border border-violet-200 px-1.5 py-0.5 rounded-md">
                                  {pLabel}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-xs text-slate-400">ไม่มีสิทธิเข้าถึง</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">
                        {new Date(admin.createdAt).toLocaleDateString('th-TH')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(admin)}
                            className="w-7 h-7 rounded hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
                            title="แก้ไข"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(admin.id)}
                            className="w-7 h-7 rounded hover:bg-rose-100 flex items-center justify-center text-rose-500 transition"
                            title="ลบ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
