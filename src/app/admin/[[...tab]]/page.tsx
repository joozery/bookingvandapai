'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield, LayoutDashboard, Compass, Bus, Users, QrCode, Settings,
  ChevronDown, ChevronRight, RefreshCw, Check, AlertCircle,
  Activity, UserCheck, Bell, Menu, X, Headphones,
  FileText, Lock, TrendingUp, Key, User, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';

import { supabase } from '@/lib/supabase';

import BookingsTab from '../components/BookingsTab';
import TripsTab from '../components/TripsTab';
import VansTab from '../components/VansTab';
import CheckinTab from '../components/CheckinTab';
import DashboardOverview from '../components/DashboardOverview';
import UsersTab, { type UserRecord } from '../components/UsersTab';
import AdminsTab from '../components/AdminsTab';
import InsuranceTab from '../components/InsuranceTab';
import type { Trip, Van, Booking } from '../components/types';

// ── Nav structure ─────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', label: 'แดชบอร์ด', icon: LayoutDashboard },
  { id: 'trips',     label: 'จัดการทริป', icon: Compass },
  { id: 'vans',      label: 'จัดการรถ', icon: Bus },
  {
    id: 'bookings', label: 'การจองและผู้โดยสาร', icon: Users,
    children: [
      { id: 'bookings',  label: 'รายการจองทั้งหมด' },
      { id: 'pending',   label: 'รออนุมัติเปลี่ยนที่นั่ง' },
    ]
  },
  { id: 'users',   label: 'จัดการสมาชิก', icon: UserCheck },
  { id: 'checkin', label: 'Check-in QR', icon: QrCode },
  { id: 'staff',   label: 'ทีมงาน / ผู้จัด', icon: Shield },
  { id: 'insurance', label: 'ประกันการเดินทาง', icon: Lock },
  { id: 'reports',   label: 'รายงาน', icon: FileText, children: [
    { id: 'reports-finance', label: 'รายงานการเงิน' },
    { id: 'reports-trip',    label: 'รายงานทริป' },
  ]},
  { id: 'settings', label: 'ตั้งค่า', icon: Settings },
] as const;

type TabId = 'dashboard' | 'bookings' | 'trips' | 'vans' | 'checkin' | 'pending' | 'users' | 'staff' | 'insurance';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  
  const tabPath = params.tab?.[0] as TabId | undefined;
  const [activeTab, setActiveTab] = useState<TabId>(tabPath || 'dashboard');
  
  // Login form states
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    
    const res = await signIn('credentials', {
      username: loginUsername,
      password: loginPassword,
      redirect: false
    });
    
    setIsLoggingIn(false);
    if (res?.error) {
      setLoginError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ');
    }
  };

  useEffect(() => {
    if (tabPath && tabPath !== activeTab) {
      setActiveTab(tabPath);
    } else if (!tabPath && activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    }
  }, [tabPath]);

  const handleSetTab = (tab: TabId) => {
    setActiveTab(tab);
    setMobileSidebar(false);
    router.push(tab === 'dashboard' ? '/admin' : `/admin/${tab}`);
  };
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedNav, setExpandedNav] = useState<string[]>(['bookings']);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const [trips, setTrips]     = useState<Trip[]>([]);
  const [vans, setVans]       = useState<Van[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers]     = useState<UserRecord[]>([]);
  const [loading, setLoading]  = useState(true);
  const [toast, setToast]      = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const buildEnriched = (raw: Booking[], t: Trip[], v: Van[]): Booking[] =>
    raw.map(b => ({
      ...b,
      tripName:    t.find(x => x.id === b.tripId)?.name || 'ไม่ทราบ',
      plateNumber: v.find(x => x.id === b.vanId)?.plateNumber || '-',
      vanNumber:   v.find(x => x.id === b.vanId)?.vanNumber || 1,
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const fetchAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [tr, vr, br, ur] = await Promise.all([fetch('/api/trips'), fetch('/api/vans'), fetch('/api/bookings'), fetch('/api/users')]);
      const [td, vd, bd, ud] = await Promise.all([tr.json(), vr.json(), br.json(), ur.json()]);
      const t = td.success ? td.trips : trips;
      const v = vd.success ? vd.vans  : vans;
      if (td.success) setTrips(t);
      if (vd.success) setVans(v);
      if (bd.success) setBookings(buildEnriched(bd.bookings, t, v));
      if (ud.success) setUsers(ud.users);
    } catch { if (!silent) showToast('error', 'โหลดข้อมูลไม่สำเร็จ'); }
    finally   { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    fetchAll();
    
    if (status !== 'authenticated' || (session?.user as any)?.role !== 'admin') return;

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vans' }, () => fetchAll(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => fetchAll(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => fetchAll(true))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated' || (session?.user as any)?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="p-6 bg-gradient-to-br from-violet-600 to-purple-700 text-white text-center">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-90" />
            <h1 className="text-xl font-black">Admin Panel</h1>
            <p className="text-violet-200 text-xs mt-1">ระบบจัดการหลังบ้าน</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {loginError && (
              <div className="p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-2 border border-rose-100 animate-in fade-in zoom-in-95 duration-200">
                <AlertCircle className="w-4 h-4 shrink-0" /> {loginError}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 focus:bg-white transition-colors"
                  placeholder="admin_username"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 focus:bg-white transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-2.5 bg-violet-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-violet-700 transition flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {isLoggingIn ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'เข้าสู่ระบบ'}
            </button>
            
            <div className="text-center pt-3 border-t border-slate-100 mt-2">
              <a href="/" className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition">
                &larr; กลับไปหน้าแรก (สำหรับลูกทริป)
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const api = async (fn: () => Promise<Response>, ok: string, err = 'เกิดข้อผิดพลาด') => {
    try {
      const res = await fn();
      const d   = await res.json();
      if (d.success) { showToast('success', ok); fetchAll(true); }
      else showToast('error', d.error || err);
    } catch { showToast('error', err); }
  };

  const handleApprove  = (id: string) => api(() => fetch(`/api/bookings/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status:'approved' }) }), 'อนุมัติสำเร็จ!');
  const handleReject   = async (id: string) => { if (!confirm('ยืนยันปฏิเสธ?')) return; api(() => fetch(`/api/bookings/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status:'rejected' }) }), 'ปฏิเสธเรียบร้อย'); };
  const handleDelBook  = async (id: string) => { if (!confirm('ลบรายการนี้?')) return; api(() => fetch(`/api/bookings/${id}`, { method:'DELETE' }), 'ลบเรียบร้อย'); };
  const handleCheckIn  = (id: string, cur: boolean) => api(() => fetch(`/api/bookings/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ checkedIn: !cur }) }), !cur ? 'เช็คอินสำเร็จ!' : 'ยกเลิกเช็คอินเรียบร้อย');
  const handleManual   = async (data: any) => {
    try {
      const res = await fetch('/api/bookings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ ...data, lineUserId:`line-manual-${Date.now()}`, lineUserName:`แอดมินสร้างแทน (${data.nickname})`, lineUserProfilePic:'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' }) });
      const d   = await res.json();
      if (d.success) { if (d.booking) await handleApprove(d.booking.id); showToast('success', 'เพิ่มผู้โดยสารสำเร็จ!'); fetchAll(true); }
      else showToast('error', d.error);
    } catch { showToast('error', 'เกิดข้อผิดพลาด'); }
  };
  const handleCreateTrip = async (form: any) => {
    try {
      if (form.imageFile) {
        setLoading(true);
        const file = form.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `trips/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        form.image = data.publicUrl;
      }
      
      const payload = { ...form };
      delete payload.imageFile; // Remove the file object before sending to API

      await api(() => fetch('/api/trips', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }), 'สร้างทริปสำเร็จ!');
    } catch (e: any) {
      showToast('error', e.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateTrip = async (id: string, form: any) => {
    try {
      if (form.imageFile) {
        setLoading(true);
        const file = form.imageFile;
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `trips/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        form.image = data.publicUrl;
      }
      
      const payload = { ...form };
      delete payload.imageFile;

      await api(() => fetch(`/api/trips/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }), 'แก้ไขข้อมูลทริปสำเร็จ!');
    } catch (e: any) {
      showToast('error', e.message || 'เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
    } finally {
      setLoading(false);
    }
  };
  const handleDelTrip    = async (id: string) => { if (!confirm('ยืนยันลบทริป?')) return; api(() => fetch(`/api/trips/${id}`, { method:'DELETE' }), 'ลบทริปเรียบร้อย'); };
  const handleAddVan     = (tripId: string) => api(() => fetch('/api/vans', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ tripId }) }), 'เพิ่มรถตู้สำเร็จ!');
  const handleDelVan     = async (id: string) => { if (!confirm('ยืนยันลบรถ?')) return; api(() => fetch(`/api/vans/${id}`, { method:'DELETE' }), 'ลบรถเรียบร้อย'); };
  const handleUpdateVan  = (id: string, data: any) => api(() => fetch(`/api/vans/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) }), 'บันทึกสำเร็จ!');
  const handleUpdateStaff = (vanId: string, seatId: string, staffName: string) => api(() => fetch(`/api/vans/${vanId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ updateSeatId: seatId, staffName }) }), 'บันทึกชื่อผู้จัดสำเร็จ!');

  const stats = {
    trips:     trips.length,
    vans:      vans.length,
    bookings:  bookings.length,
    pending:   bookings.filter(b => b.status === 'pending').length,
    approved:  bookings.filter(b => b.status === 'approved').length,
    checkedIn: bookings.filter(b => b.checkedIn).length,
  };

  const allSeats    = vans.flatMap(v => v.seats.filter(s => s.type === 'customer'));
  const vacantSeats = allSeats.filter(s => s.status === 'available').length;

  const toggleNav = (id: string) =>
    setExpandedNav(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ── Sidebar content ─────────────────────────────────────────────────────────
  const sidebarContent = (
    <div className="flex flex-col h-full bg-white select-none">
      {/* Logo Section */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-100 shrink-0 bg-white">
        <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center shrink-0 bg-slate-50 relative group transition-all duration-300 hover:scale-105 hover:border-violet-300">
          <img src="/logo/logo.png" alt="DAPAIDERNPAI Logo" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-violet-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0 flex flex-col">
            <span className="font-black text-slate-800 text-sm tracking-tight leading-none uppercase">DAPAIDERNPAI</span>
            <span className="text-[9px] text-violet-600 font-bold tracking-widest uppercase mt-1">Admin Console</span>
          </div>
        )}
      </div>

      {/* Navigation Section */}
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto scrollbar-thin">
        {NAV.map(item => {
          // Verify Permissions
          const isAdmin = (session?.user as any)?.role === 'admin';
          const isSuperAdmin = (session?.user as any)?.username === 'admin';
          const perms = (session?.user as any)?.permissions || [];
          if (isAdmin && !isSuperAdmin && !perms.includes(item.id)) return null;

          const Icon    = item.icon;
          const hasChildren = 'children' in item && item.children;
          const expanded    = expandedNav.includes(item.id);
          const isActive    = activeTab === item.id;
          const childActive = hasChildren && item.children?.some((c: any) => c.id === activeTab);

          if (hasChildren && item.children) {
            return (
              <div key={item.id} className="mb-1.5">
                <button
                  onClick={() => {
                    if (sidebarOpen) toggleNav(item.id);
                    else { handleSetTab(item.id as TabId); setExpandedNav(prev => [...prev, item.id]); }
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative',
                    (isActive || childActive) 
                      ? 'bg-violet-50/65 text-violet-900 font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn('w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110', (isActive || childActive) ? 'text-violet-600 font-bold' : 'text-slate-400 group-hover:text-slate-600')} />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 text-[13px] tracking-wide font-medium">{item.label}</span>
                      <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-300', expanded && 'rotate-180')} />
                    </>
                  )}
                  {(isActive || childActive) && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-violet-600" />
                  )}
                </button>
                {sidebarOpen && expanded && (
                  <div className="mt-1 ml-2 pl-3 space-y-1 relative before:absolute before:left-[10px] before:top-1 before:bottom-1 before:w-[1px] before:bg-slate-100">
                    {(item.children as unknown as any[]).map((child: any) => (
                      <button
                        key={child.id}
                        onClick={() => handleSetTab(child.id as TabId)}
                        className={cn(
                          'w-full text-left text-xs py-2 pl-6 pr-3 rounded-lg transition-all duration-200 flex items-center justify-between gap-2 relative group',
                          activeTab === child.id
                            ? 'text-violet-700 font-bold bg-violet-50/40'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/85'
                        )}
                      >
                        {activeTab === child.id ? (
                          <span className="absolute left-[7.5px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-600 shadow-[0_0_6px_rgba(109,40,217,0.4)]" />
                        ) : (
                          <span className="absolute left-[8px] top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-slate-300 group-hover:bg-slate-400 transition-colors" />
                        )}
                        <span className="flex-1 tracking-wide">{child.label}</span>
                        {child.id === 'pending' && stats.pending > 0 && (
                          <span className="bg-orange-500/10 text-orange-600 border border-orange-200/50 text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">{stats.pending}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleSetTab(item.id as TabId)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group relative mb-1',
                isActive 
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold shadow-[0_4px_12px_rgba(109,40,217,0.18)]' 
                  : 'text-slate-600 hover:bg-slate-50/80 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110', isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600')} />
              {sidebarOpen && <span className={cn('text-[13px] tracking-wide', isActive ? 'font-bold' : 'font-medium')}>{item.label}</span>}
              {!sidebarOpen && item.id === 'bookings' && stats.pending > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 border border-white animate-pulse" />
              )}
              {sidebarOpen && item.id === 'bookings' && stats.pending > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full leading-none shadow-sm">{stats.pending}</span>
              )}
              {isActive && (
                <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-white" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Support Section */}
      {sidebarOpen ? (
        <div className="px-3 pb-4 shrink-0 mt-auto border-t border-slate-50 pt-4">
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-4 text-white shadow-[0_8px_20px_rgba(109,40,217,0.12)] relative overflow-hidden group">
            {/* Ambient visual decorations */}
            <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
            <div className="absolute -left-4 -top-4 w-12 h-12 bg-purple-500/20 rounded-full blur-lg" />
            
            <div className="relative space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-white/15 backdrop-blur-md flex items-center justify-center">
                  <Headphones className="w-3.5 h-3.5 text-white" />
                </div>
                <p className="text-xs font-black tracking-wide">ฝ่ายสนับสนุน 24/7</p>
              </div>
              <p className="text-[10px] text-purple-100/90 leading-relaxed font-medium">
                พบปัญหาหรือต้องการสอบถามเพิ่มเติม ติดต่อฝ่ายเทคนิคได้ตลอดเวลา
              </p>
              <a 
                href="https://line.me" 
                target="_blank" 
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-1.5 bg-white text-violet-700 text-xs font-bold py-2 rounded-xl hover:bg-slate-50 transition active:scale-[0.98] shadow-sm text-center"
              >
                ติดต่อทีมงาน
              </a>
            </div>
          </div>
          <div className="mt-4 px-1.5 space-y-1">
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
              <span>เวอร์ชันระบบ</span>
              <span className="text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">v1.2.0</span>
            </div>
            <div className="flex items-center justify-between text-[9px] text-slate-400 font-semibold">
              <span>อัปเดตล่าสุด</span>
              <span className="text-slate-500 font-bold">{new Date().toLocaleDateString('th-TH', {day:'numeric',month:'short',year:'2-digit'})}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-4 flex flex-col items-center gap-3 mt-auto border-t border-slate-100 shrink-0">
          <div 
            className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition cursor-pointer" 
            title="เวอร์ชันระบบ v1.2.0"
          >
            <Settings className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );

  // ── Page Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#f5f6fa] flex overflow-hidden">

      {/* Mobile overlay */}
      {mobileSidebar && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileSidebar(false)} />
      )}

      {/* ════ SIDEBAR ═════════════════════════════════════════════════════════ */}
      <aside className={cn(
        'bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-300 h-full overflow-y-auto',
        'fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto',
        sidebarOpen ? 'w-60' : 'w-16',
        mobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {sidebarContent}
      </aside>

      {/* ════ RIGHT SIDE ══════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* ── Top Header ───────────────────────────────────────────────────── */}
        <header className="h-14 bg-white border-b border-slate-200 shadow-sm flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileSidebar(!mobileSidebar);
                if (!mobileSidebar) setSidebarOpen(true);
              } else {
                setSidebarOpen(!sidebarOpen);
              }
            }}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition shrink-0 lg:hidden"
          >
            <Menu className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex w-8 h-8 rounded-lg hover:bg-slate-100 items-center justify-center text-slate-500 transition shrink-0"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <span className="font-bold text-slate-800 text-sm">ด่าไป เดินไป Admin</span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live indicator */}
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-bold text-emerald-700">LIVE</span>
            </div>

            {/* Notification bell */}
            <button className="relative w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition">
              <Bell className="w-4 h-4" />
              {stats.pending > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{stats.pending}</span>
              )}
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white text-[10px] font-black">
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="hidden sm:block">
                <div className="text-[11px] font-bold text-slate-800 leading-none">{session?.user?.name || 'แอดมิน'}</div>
                <div className="text-[9px] text-slate-400 font-semibold">{(session?.user as any)?.role === 'admin' ? 'Admin' : 'System'}</div>
              </div>
              <button 
                onClick={() => signOut({ callbackUrl: '/' })} 
                className="ml-2 w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition" 
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* ── Main Content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Permission Check for Content */}
          {(session?.user as any)?.role === 'admin' && 
           (session?.user as any)?.username !== 'admin' && 
           !(activeTab === 'pending' 
             ? (session?.user as any)?.permissions?.includes('bookings') || (session?.user as any)?.permissions?.includes('pending')
             : (session?.user as any)?.permissions?.includes(activeTab)) ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
               <Lock className="w-12 h-12 opacity-20" />
               <p className="font-bold">คุณไม่มีสิทธิเข้าถึงหน้านี้</p>
             </div>
          ) : (
            <>

          {/* Page title + date */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-black text-slate-800">
                {activeTab === 'dashboard' ? 'แดชบอร์ด' :
                 activeTab === 'bookings'  ? 'การจองและผู้โดยสาร' :
                 activeTab === 'pending'   ? 'รออนุมัติเปลี่ยนที่นั่ง' :
                 activeTab === 'trips'     ? 'จัดการทริป' :
                 activeTab === 'vans'      ? 'จัดการรถตู้' :
                 activeTab === 'users'     ? 'จัดการสมาชิก' : 
                 activeTab === 'staff'     ? 'ทีมงาน / ผู้จัด' : 
                 activeTab === 'insurance' ? 'ประกันการเดินทาง' : 'QR Check-in'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'dashboard' ? 'ภาพรวมการจองและการเดินทาง' :
                 activeTab === 'bookings'  ? 'จัดการคำขอจองและอนุมัติที่นั่ง' :
                 activeTab === 'users'     ? 'ดูและจัดการข้อมูลสมาชิกทั้งหมด' : 
                 activeTab === 'insurance' ? 'จัดการข้อมูลและประวัติประกันการเดินทางของผู้โดยสาร' : 
                 activeTab === 'staff'     ? 'จัดการสิทธิแอดมิน, ผู้จัด และกำหนดการบล็อก' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a href="/" className="flex items-center gap-1 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-semibold hover:bg-slate-50 transition">
                หน้าบ้าน <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* ── Stat Cards (always visible) ─────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'ทริปทั้งหมด',   value: stats.trips,    icon: Compass,    unit: 'ทริป',   color: 'violet',  sub: `ใช้งานอยู่ ${trips.filter(t=>t.status==='active').length} ทริป` },
              { label: 'รถทั้งหมด',      value: stats.vans,     icon: Bus,        unit: 'คัน',    color: 'blue',    sub: `ใช้งานอยู่ ${vans.length} คัน` },
              { label: 'การจองทั้งหมด', value: stats.bookings, icon: Users,      unit: 'ที่นั่ง', color: 'amber',   sub: `รออนุมัติ ${stats.pending} รายการ`, pulse: stats.pending > 0 },
              { label: 'ที่นั่งว่าง',    value: vacantSeats,    icon: Activity,   unit: 'ที่นั่ง', color: 'emerald', sub: `จากทั้งหมด ${allSeats.length} ที่นั่ง` },
            ].map(s => {
              const Icon = s.icon;
              const palettes: Record<string, { bg: string; icon: string; text: string; border: string }> = {
                violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  text: 'text-violet-700', border: 'border-violet-100' },
                blue:    { bg: 'bg-blue-50',     icon: 'text-blue-600',    text: 'text-blue-700',   border: 'border-blue-100' },
                amber:   { bg: 'bg-amber-50',    icon: 'text-amber-600',   text: 'text-amber-700',  border: 'border-amber-100' },
                emerald: { bg: 'bg-emerald-50',  icon: 'text-emerald-600', text: 'text-emerald-700',border: 'border-emerald-100' },
              };
              const pal = palettes[s.color];
              return (
                <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                      <p className="text-3xl font-black text-slate-800 mt-1 leading-none">
                        {s.value}
                        <span className="text-sm font-bold text-slate-400 ml-1">{s.unit}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <TrendingUp className="w-2.5 h-2.5 text-emerald-500" />
                        {s.sub}
                      </p>
                    </div>
                    <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center relative', pal.bg, pal.border)}>
                      <Icon className={cn('w-5 h-5', pal.icon)} />
                      {(s as any).pulse && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Tab Content ─────────────────────────────────────────────── */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> กำลังโหลดข้อมูล...
            </div>
          ) : (
            <>
              {(activeTab === 'dashboard') && (
                <div className="space-y-5">
                  <BookingsTab
                    trips={trips} vans={vans} bookings={bookings}
                    onApprove={handleApprove} onReject={handleReject}
                    onDelete={handleDelBook} onCheckIn={handleCheckIn}
                    onManualSubmit={handleManual}
                  />
                  <DashboardOverview trips={trips} vans={vans} bookings={bookings} />
                </div>
              )}
              {(activeTab === 'bookings' || activeTab === 'pending') && (
                <BookingsTab
                  trips={trips} vans={vans}
                  bookings={activeTab === 'pending' ? bookings.filter(b => b.status === 'pending' && !!(b as any).replacesBookingId) : bookings}
                  onApprove={handleApprove} onReject={handleReject}
                  onDelete={handleDelBook} onCheckIn={handleCheckIn}
                  onManualSubmit={handleManual}
                />
              )}
              {activeTab === 'trips' && (
                <TripsTab trips={trips} vans={vans} onCreate={handleCreateTrip} onUpdate={handleUpdateTrip} onDelete={handleDelTrip} />
              )}
              {activeTab === 'vans' && (
                <VansTab
                  trips={trips} vans={vans}
                  onAddVan={handleAddVan} onDeleteVan={handleDelVan}
                  onUpdateVan={handleUpdateVan} onUpdateStaff={handleUpdateStaff}
                />
              )}
              {activeTab === 'users' && (
                <UsersTab users={users} onRefresh={() => fetchAll(true)} />
              )}
              {activeTab === 'staff' && (
                <AdminsTab />
              )}
              {activeTab === 'insurance' && (
                <InsuranceTab trips={trips} bookings={bookings} onRefresh={() => fetchAll(true)} />
              )}
              {activeTab === 'checkin' && (
                <CheckinTab trips={trips} bookings={bookings} onCheckIn={handleCheckIn} />
              )}
            </>
          )}
          </>
        )}
        </main>
      </div>

      {/* ════ TOAST ══════════════════════════════════════════════════════════ */}
      {toast && (
        <div className="fixed top-16 right-4 z-50 animate-in slide-in-from-right-4 fade-in duration-300">
          <div className={cn('flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm',
            toast.type === 'success' ? 'bg-white border-emerald-200 text-emerald-800' : 'bg-white border-rose-200 text-rose-800')}>
            {toast.type === 'success'
              ? <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
            <span className="text-xs font-semibold">{toast.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
