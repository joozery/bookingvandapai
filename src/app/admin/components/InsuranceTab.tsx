'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, Search, Save, Check, RefreshCw, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Booking, Trip } from './types';

interface Props {
  trips: Trip[];
  bookings: Booking[];
  onRefresh: () => void;
}

export default function InsuranceTab({ trips, onRefresh }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch bookings via admin API (bypass RLS)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/bookings');
        const json = await res.json();
        if (json.success) {
          setBookings(json.bookings as Booking[]);
        } else {
          console.error('Failed to fetch bookings:', json.error);
        }
      } catch (e) {
        console.error('Error fetching bookings:', e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);



  const [selectedTripId, setSelectedTripId] = useState<string>('all');
  const [search, setSearch] = useState('');
  
  // editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNatId, setEditNatId] = useState('');
  const [editDob, setEditDob] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedProfileBooking, setSelectedProfileBooking] = useState<Booking | null>(null);

  // Filter passengers who are approved or checked-in
  const passengers = useMemo(() => {
    return bookings
      .filter(b => b.status === 'approved' || b.checkedIn)
      .filter(b => selectedTripId === 'all' || b.tripId === selectedTripId)
      .filter(b => 
        search === '' || 
        b.fullName.toLowerCase().includes(search.toLowerCase()) || 
        b.phone.includes(search) ||
        (b.nationalId && b.nationalId.includes(search))
      )
      .sort((a, b) => {
        if (a.vanNumber !== b.vanNumber) return (a.vanNumber || 0) - (b.vanNumber || 0);
        return (a.seatLabel || '').localeCompare(b.seatLabel || '');
      });
  }, [bookings, selectedTripId, search]);

  const handleEdit = (booking: any) => {
    setEditingId(booking.id);
    setEditNatId(booking.nationalId || '');
    setEditDob(booking.birthDate || '');
  };

  const handleSave = async (id: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId: editNatId.trim(), birthDate: editDob })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh bookings via admin API
        const freshRes = await fetch('/api/admin/bookings');
        const freshJson = await freshRes.json();
        if (freshJson.success) setBookings(freshJson.bookings as Booking[]);
        setEditingId(null);
      } else {
        alert(data.error || 'บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const handleExport = () => {
    // ดึงผู้โดยสารทั้งหมดที่ยืนยันแล้วของทริปที่เลือก (เพื่อให้เห็นว่าใครยังไม่กรอกข้อมูลบ้าง)
    const exportData = bookings
      .filter(b => b.status === 'approved' || b.checkedIn)
      .filter(b => selectedTripId === 'all' || b.tripId === selectedTripId);

    if (exportData.length === 0) {
      alert('ไม่มีข้อมูลลูกทริปสำหรับการส่งออก');
      return;
    }
    
    const BOM = '\uFEFF';
    const headers = [
      'ชื่อลูกทริป', 'ชื่อเล่น', 'เบอร์โทรศัพท์', 'ทริป', 'รถคันที่', 'ที่นั่ง',
      'เลขบัตรประชาชน', 'วันเดือนปีเกิด', 'ผู้ติดต่อฉุกเฉิน', 'เบอร์โทรฉุกเฉิน',
      'แพ้อาหาร', 'โรคประจำตัว'
    ];
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const p of exportData) {
      const nid = p.nationalId || p.profile?.nationalId || '';
      const dob = p.birthDate || p.profile?.birthDate || '';
      
      const row = [
        `"${p.fullName || ''}"`,
        `"${p.profile?.nickname || p.nickname || ''}"`,
        p.phone ? `="${p.phone}"` : '""',
        `"${p.tripName || ''}"`,
        `"${p.vanNumber || 1}"`,
        `"${p.seatLabel || ''}"`,
        // ใช้ format ="เลขบัตร" เพื่อบังคับให้ Excel มองเป็นข้อความและไม่ปัดเป็นเลขยกกำลัง
        nid ? `="${nid}"` : '""',
        `"${dob ? new Date(dob).toLocaleDateString('th-TH') : ''}"`,
        `"${p.emergencyName || p.profile?.emergencyName || ''}"`,
        (p.emergencyPhone || p.profile?.emergencyPhone) ? `="${p.emergencyPhone || p.profile?.emergencyPhone}"` : '""',
        `"${p.allergies || p.profile?.allergies || ''}"`,
        `"${p.medicalConditions || p.profile?.medicalConditions || ''}"`
      ];
      csvRows.push(row.join(','));
    }
    
    const csvContent = BOM + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `insurance_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show admin personal info at top of page
  const { data: session, status: sessionStatus } = useSession();
  const adminName = session?.user?.name || 'Admin';
  const adminUsername = (session?.user as any)?.username || '';

  return (
    <div className="space-y-4">
      {/* ── Header with admin info ───────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
        <Shield className="w-6 h-6 text-violet-600" />
        <div>
          <p className="font-bold text-slate-800">{adminName}</p>
          <p className="text-xs text-slate-400">Username: {adminUsername}</p>
        </div>
      </div>

      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-600" />
            ข้อมูลประกันการเดินทาง
          </h2>
          <p className="text-xs text-slate-400 mt-1">จัดการข้อมูลเลขบัตรประชาชนและวันเกิดของลูกทริป</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleExport}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm shrink-0"
          >
            <Download className="w-4 h-4" />
            ส่งออก (CSV)
          </button>
          
          <select
            value={selectedTripId}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="w-full sm:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 font-medium text-slate-700"
          >
            <option value="all">ทุกทริปการเดินทาง</option>
            {trips.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({(bookings.filter(b => b.tripId === t.id && (b.status === 'approved' || b.checkedIn)).length)} คน)</option>
            ))}
          </select>
          
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ, เบอร์, เลขบัตร..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {passengers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
            <Shield className="w-10 h-10 opacity-20" />
            <p className="font-semibold text-sm">ไม่พบรายชื่อลูกทริป</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">ชื่อลูกทริป / ที่นั่ง</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">ทริป & รถ</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">เลขบัตรประชาชน (13 หลัก)</th>
                  <th className="px-4 py-3 text-left text-[11px] font-black text-slate-400 uppercase tracking-wider">วันเดือนปีเกิด (ค.ศ.)</th>
                  <th className="px-4 py-3 w-20 text-center text-[11px] font-black text-slate-400 uppercase tracking-wider">สถานะ</th>
                  <th className="px-4 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {passengers.map((p: any) => {
                  const isEditing = editingId === p.id;
                  const hasNatId = !!p.nationalId;
                  const hasDob = !!p.birthDate;
                  const isComplete = hasNatId && hasDob;
                  
                  return (
                    <tr key={p.id} className={cn("hover:bg-slate-50/50 transition", isEditing && "bg-violet-50/30")}>
                      <td className="px-4 py-3">
                        <div 
                          className="flex items-center gap-2.5 cursor-pointer group"
                          onClick={() => setSelectedProfileBooking(p)}
                          title="คลิกเพื่อดูโปรไฟล์แบบละเอียด"
                        >
                          <img 
                            src={p.lineUserProfilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                            alt="" 
                            className="w-8 h-8 rounded-full border border-slate-200 object-cover group-hover:scale-105 transition"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-xs group-hover:text-violet-600 transition flex items-center gap-1.5">
                              {p.fullName}
                              <span className="text-[9px] bg-slate-100 group-hover:bg-violet-50 text-slate-500 group-hover:text-violet-600 px-1.5 py-0.5 rounded transition font-medium scale-90">ดูโปรไฟล์</span>
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5">{p.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-600 text-[10px] truncate max-w-[120px]" title={p.tripName}>{p.tripName}</span>
                          <span className="text-[10px] text-violet-600 font-bold bg-violet-50 px-1.5 rounded-sm inline-flex w-fit mt-0.5 border border-violet-100">
                            คันที่ {p.vanNumber || 1} • ที่นั่ง {p.seatLabel}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editNatId}
                            onChange={e => setEditNatId(e.target.value.replace(/[^0-9]/g, '').slice(0, 13))}
                            placeholder="เลขบัตร 13 หลัก"
                            className="w-full px-2 py-1 bg-white border border-violet-300 rounded text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-mono"
                          />
                        ) : (
                          <span className={cn("text-xs font-mono", p.nationalId ? "text-slate-700" : "text-slate-300 italic")}>
                            {p.nationalId || '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input 
                            type="date"
                            value={editDob}
                            onChange={e => setEditDob(e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-violet-300 rounded text-xs focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                          />
                        ) : (
                          <span className={cn("text-xs", p.birthDate ? "text-slate-700 font-mono" : "text-slate-300 italic")}>
                            {p.birthDate ? new Date(p.birthDate).toLocaleDateString('th-TH') : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isComplete ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600" title="ครบถ้วน">
                            <Check className="w-3 h-3" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-300" title="ยังไม่ครบ">
                            <Shield className="w-3 h-3" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => setEditingId(null)}
                                className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:bg-slate-200 transition"
                                title="ยกเลิก"
                                disabled={saving}
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSave(p.id)}
                                className="w-7 h-7 rounded flex items-center justify-center bg-violet-600 text-white hover:bg-violet-700 transition shadow-sm"
                                title="บันทึก"
                                disabled={saving}
                              >
                                {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleEdit(p)}
                              className="px-2.5 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 transition border border-slate-200"
                            >
                              กรอกข้อมูล
                            </button>
                          )}
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

      {/* ── PROFILE MODAL ────────────────────────────────────────────────── */}
      {selectedProfileBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#4c1d95] p-6 text-white relative">
              <button 
                onClick={() => setSelectedProfileBooking(null)}
                className="absolute top-4 right-4 text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4">
                <img 
                  src={selectedProfileBooking.lineUserProfilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'} 
                  alt="" 
                  className="w-14 h-14 rounded-full border-2 border-white/20 object-cover shadow-md"
                />
                <div>
                  <h3 className="font-extrabold text-base leading-tight">{selectedProfileBooking.fullName}</h3>
                  <p className="text-white/80 text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                    <span>ชื่อเล่น: {selectedProfileBooking.profile?.nickname || selectedProfileBooking.nickname || '-'}</span>
                    <span>•</span>
                    <span>LINE: {selectedProfileBooking.lineUserName || '-'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">เบอร์โทรศัพท์</span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5 block">{selectedProfileBooking.phone || '-'}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">ที่นั่งรถตู้</span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5 block truncate">คัน {selectedProfileBooking.vanNumber || 1} • ที่นั่ง {selectedProfileBooking.seatLabel}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">ข้อมูลประกันการเดินทาง</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-slate-400">เลขบัตรประจำตัวประชาชน</span>
                    <span className="text-xs font-mono font-bold text-slate-700 block mt-0.5">
                      {selectedProfileBooking.nationalId || selectedProfileBooking.profile?.nationalId || 'ยังไม่ได้ระบุ'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">วันเดือนปีเกิด</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">
                      {selectedProfileBooking.birthDate || selectedProfileBooking.profile?.birthDate 
                        ? new Date(selectedProfileBooking.birthDate || selectedProfileBooking.profile?.birthDate).toLocaleDateString('th-TH') 
                        : 'ยังไม่ได้ระบุ'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">การติดต่อฉุกเฉิน</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-slate-400">ชื่อผู้ติดต่อฉุกเฉิน</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">
                      {selectedProfileBooking.profile?.emergencyName || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">เบอร์โทรฉุกเฉิน</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">
                      {selectedProfileBooking.profile?.emergencyPhone || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">ข้อมูลสุขภาพ</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[10px] text-slate-400">การแพ้อาหาร</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">
                      {selectedProfileBooking.profile?.allergies || 'ไม่มี'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-400">โรคประจำตัว</span>
                    <span className="text-xs font-bold text-slate-700 block mt-0.5">
                      {selectedProfileBooking.profile?.medicalConditions || 'ไม่มี'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
              <button 
                onClick={() => setSelectedProfileBooking(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
