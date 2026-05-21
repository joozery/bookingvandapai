'use client';

import React, { useState, useMemo } from 'react';
import {
  Users, Search, Filter, ChevronDown, User, Phone,
  Calendar, CheckCircle2, XCircle, ShieldAlert, ShieldCheck,
  MessageSquare, MoreHorizontal, Clock, TrendingUp, Eye,
  Copy, Check, X, AlertTriangle, Star, SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UserRecord {
  lineUserId: string;
  lineUserName: string;
  lineUserProfilePic: string;
  nickname: string;
  fullName: string;
  phone: string;
  totalBookings: number;
  approvedBookings: number;
  checkedIn: number;
  firstSeen: string;
  lastSeen: string;
  role: 'customer' | 'admin' | 'vip';
  isBlocked: boolean;
  adminNote: string;
}

interface Props {
  users: UserRecord[];
  onRefresh: () => void;
}

type SortKey = 'lastSeen' | 'totalBookings' | 'checkedIn' | 'nickname';
type FilterRole = 'all' | 'customer' | 'admin' | 'vip' | 'blocked';

const ROLE_CONFIG = {
  customer: { label: 'ลูกค้า',  color: 'bg-blue-50 text-blue-700 border-blue-200',   icon: User },
  admin:    { label: 'แอดมิน', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: ShieldCheck },
  vip:      { label: 'VIP',     color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Star },
};

function fmtDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}
function fmtTime(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}
function daysSince(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
  if (diff < 1)   return 'วันนี้';
  if (diff < 2)   return 'เมื่อวาน';
  if (diff < 7)   return `${Math.floor(diff)} วันที่แล้ว`;
  if (diff < 30)  return `${Math.floor(diff / 7)} สัปดาห์ที่แล้ว`;
  return `${Math.floor(diff / 30)} เดือนที่แล้ว`;
}

/* ─── User Detail Drawer ─────────────────────────────────────────────────── */
function UserDrawer({ user, onClose }: { user: UserRecord | null; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (!user) return null;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.customer;
  const RoleIcon = roleConf.icon;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer */}
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col overflow-hidden border-l border-slate-200">
        {/* Header */}
        <div className="relative h-28 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 shrink-0 overflow-hidden">
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -left-4 bottom-0 w-20 h-20 bg-purple-400/20 rounded-full blur-xl" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-3 flex items-end gap-3">
            {user.lineUserProfilePic ? (
              <img
                src={user.lineUserProfilePic}
                alt={user.lineUserName}
                className="w-14 h-14 rounded-2xl border-2 border-white/60 shadow-lg object-cover shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname)}&background=7c3aed&color=fff`; }}
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl border-2 border-white/60 bg-violet-500/40 flex items-center justify-center text-white font-black text-xl shrink-0">
                {user.nickname.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 pb-1">
              <p className="font-black text-white text-base leading-tight truncate">{user.nickname}</p>
              <p className="text-violet-100/80 text-xs truncate">{user.lineUserName}</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-2 shrink-0 border-b border-slate-100">
          <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border', roleConf.color)}>
            <RoleIcon className="w-3 h-3" /> {roleConf.label}
          </span>
          {user.isBlocked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              <ShieldAlert className="w-3 h-3" /> ถูกบล็อก
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'จองทั้งหมด', value: user.totalBookings, color: 'text-violet-600' },
              { label: 'อนุมัติแล้ว',  value: user.approvedBookings, color: 'text-emerald-600' },
              { label: 'Check-in',    value: user.checkedIn, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className={cn('text-2xl font-black', s.color)}>{s.value}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ข้อมูลติดต่อ</p>
            {[
              { label: 'ชื่อจริง',     value: user.fullName,  key: 'name' },
              { label: 'เบอร์โทร',     value: user.phone,     key: 'phone' },
              { label: 'LINE User ID', value: user.lineUserId, key: 'lineId' },
            ].map(row => (
              <div key={row.key} className="flex items-center justify-between gap-2 bg-slate-50 rounded-xl px-3.5 py-2.5 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold">{row.label}</p>
                  <p className="text-sm font-semibold text-slate-700 truncate">{row.value || '-'}</p>
                </div>
                <button
                  onClick={() => copy(row.value, row.key)}
                  className="shrink-0 w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400 transition"
                  title="คัดลอก"
                >
                  {copied === row.key ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ประวัติ</p>
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">เข้าใช้ครั้งแรก</span>
                <span className="font-semibold text-slate-700">{fmtDate(user.firstSeen)} {fmtTime(user.firstSeen)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">ใช้งานล่าสุด</span>
                <span className="font-semibold text-slate-700">{fmtDate(user.lastSeen)} {fmtTime(user.lastSeen)}</span>
              </div>
            </div>
          </div>

          {/* Admin note */}
          {user.adminNote && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">หมายเหตุแอดมิน</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                <p className="text-xs text-amber-800 font-medium leading-relaxed">{user.adminNote}</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function UsersTab({ users, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('lastSeen');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterRole, setFilterRole] = useState<FilterRole>('all');
  const [showFilter, setShowFilter] = useState(false);
  const [selected, setSelected] = useState<UserRecord | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  const filtered = useMemo(() => {
    let arr = [...users];
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(u =>
        u.nickname?.toLowerCase().includes(q) ||
        u.fullName?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.lineUserName?.toLowerCase().includes(q) ||
        u.lineUserId?.toLowerCase().includes(q)
      );
    }
    // Role filter
    if (filterRole === 'blocked') arr = arr.filter(u => u.isBlocked);
    else if (filterRole !== 'all') arr = arr.filter(u => u.role === filterRole);
    // Sort
    arr.sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === 'lastSeen')       { va = new Date(a.lastSeen).getTime(); vb = new Date(b.lastSeen).getTime(); }
      else if (sortKey === 'totalBookings') { va = a.totalBookings; vb = b.totalBookings; }
      else if (sortKey === 'checkedIn')     { va = a.checkedIn; vb = b.checkedIn; }
      else { va = a.nickname; vb = b.nickname; }
      if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortAsc ? va - vb : vb - va;
    });
    return arr;
  }, [users, search, sortKey, sortAsc, filterRole]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(p => !p);
    else { setSortKey(key); setSortAsc(false); }
    setPage(1);
  };

  // Summary stats
  const stats = useMemo(() => ({
    total:    users.length,
    vip:      users.filter(u => u.role === 'vip').length,
    blocked:  users.filter(u => u.isBlocked).length,
    active:   users.filter(u => daysSince(u.lastSeen) === 'วันนี้' || daysSince(u.lastSeen) === 'เมื่อวาน').length,
  }), [users]);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      <ChevronDown className={cn('w-3 h-3 transition-transform', sortAsc && 'rotate-180')} />
    ) : <ChevronDown className="w-3 h-3 text-slate-300" />;

  return (
    <div className="space-y-4">
      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'ผู้ใช้ทั้งหมด', value: stats.total,   icon: Users,      color: 'violet' },
          { label: 'VIP',          value: stats.vip,     icon: Star,       color: 'amber' },
          { label: 'Active วันนี้', value: stats.active,  icon: TrendingUp, color: 'emerald' },
          { label: 'ถูกบล็อก',    value: stats.blocked, icon: ShieldAlert, color: 'rose' },
        ].map(s => {
          const Icon = s.icon;
          const pal: Record<string, string> = {
            violet:  'bg-violet-50 text-violet-600 border-violet-100',
            amber:   'bg-amber-50 text-amber-600 border-amber-100',
            emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
            rose:    'bg-rose-50 text-rose-600 border-rose-100',
          };
          return (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center shrink-0', pal[s.color])}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-black text-slate-800 leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 border-b border-slate-100">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              id="users-search"
              type="text"
              placeholder="ค้นหาชื่อ, เบอร์โทร, LINE ID..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition"
            />
          </div>

          {/* Filter button */}
          <button
            id="users-filter-btn"
            onClick={() => setShowFilter(p => !p)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-semibold transition',
              showFilter
                ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            กรอง
            {filterRole !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>

          <button
            id="users-refresh-btn"
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
          >
            รีเฟรช
          </button>
        </div>

        {/* Filter Panel */}
        {showFilter && (
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">กรองตาม:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'customer', 'admin', 'vip', 'blocked'] as FilterRole[]).map(r => (
                <button
                  key={r}
                  onClick={() => { setFilterRole(r); setPage(1); }}
                  className={cn(
                    'text-xs font-bold px-3 py-1.5 rounded-full border transition',
                    filterRole === r
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                  )}
                >
                  {r === 'all' ? 'ทั้งหมด' : r === 'customer' ? 'ลูกค้า' : r === 'admin' ? 'แอดมิน' : r === 'vip' ? 'VIP' : 'ถูกบล็อก'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs font-bold text-slate-500">เรียงตาม:</span>
              {([
                { key: 'lastSeen' as SortKey,       label: 'ล่าสุด' },
                { key: 'totalBookings' as SortKey,  label: 'จองมาก' },
                { key: 'checkedIn' as SortKey,      label: 'Check-in' },
                { key: 'nickname' as SortKey,       label: 'ชื่อ' },
              ]).map(s => (
                <button
                  key={s.key}
                  onClick={() => toggleSort(s.key)}
                  className={cn(
                    'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full border transition',
                    sortKey === s.key
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-violet-300 hover:text-violet-600'
                  )}
                >
                  {s.label} <SortIcon k={s.key} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Count row */}
        <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-400 border-b border-slate-50">
          <span>แสดง <strong className="text-slate-600">{filtered.length}</strong> จาก {users.length} ผู้ใช้</span>
          {filtered.length > PER_PAGE && (
            <span>หน้า {page} / {totalPages}</span>
          )}
        </div>

        {/* ── Table ──────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="text-left px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider w-8">#</th>
                <th className="text-left px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">ผู้ใช้</th>
                <th className="text-left px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">ข้อมูลติดต่อ</th>
                <th
                  className="text-center px-3 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-violet-600 transition select-none"
                  onClick={() => toggleSort('totalBookings')}
                >
                  <span className="inline-flex items-center gap-1">จอง <SortIcon k="totalBookings" /></span>
                </th>
                <th
                  className="text-center px-3 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-violet-600 transition select-none hidden sm:table-cell"
                  onClick={() => toggleSort('checkedIn')}
                >
                  <span className="inline-flex items-center gap-1">Check-in <SortIcon k="checkedIn" /></span>
                </th>
                <th
                  className="text-left px-4 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-violet-600 transition select-none hidden lg:table-cell"
                  onClick={() => toggleSort('lastSeen')}
                >
                  <span className="inline-flex items-center gap-1">ล่าสุด <SortIcon k="lastSeen" /></span>
                </th>
                <th className="text-center px-3 py-3 text-[11px] font-black text-slate-400 uppercase tracking-wider">สถานะ</th>
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">ไม่พบผู้ใช้</p>
                      <p className="text-xs">ลองเปลี่ยนคำค้นหา</p>
                    </div>
                  </td>
                </tr>
              ) : paginated.map((u, i) => {
                const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.customer;
                const RoleIcon = roleConf.icon;
                return (
                  <tr
                    key={u.lineUserId}
                    className={cn(
                      'group hover:bg-violet-50/40 transition-colors cursor-pointer',
                      u.isBlocked && 'bg-rose-50/30 hover:bg-rose-50/50'
                    )}
                    onClick={() => setSelected(u)}
                  >
                    {/* Index */}
                    <td className="px-4 py-3.5 text-[11px] text-slate-400 font-bold">
                      {(page - 1) * PER_PAGE + i + 1}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {u.lineUserProfilePic ? (
                            <img
                              src={u.lineUserProfilePic}
                              alt={u.nickname}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                              onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nickname)}&background=7c3aed&color=fff&size=80`; }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-black text-sm border border-violet-200">
                              {u.nickname?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                          {u.isBlocked && (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border border-white rounded-full flex items-center justify-center">
                              <X className="w-2 h-2 text-white" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">{u.nickname}</p>
                          <p className="text-[11px] text-slate-400 truncate">{u.lineUserName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      <div>
                        <p className="text-xs font-medium text-slate-700 truncate max-w-[150px]">{u.fullName || '-'}</p>
                        <p className="text-[11px] text-slate-400">{u.phone || '-'}</p>
                      </div>
                    </td>

                    {/* Bookings */}
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-base font-black text-slate-800">{u.totalBookings}</span>
                        <span className="text-[10px] text-emerald-600 font-bold">{u.approvedBookings} อนุมัติ</span>
                      </div>
                    </td>

                    {/* Check-in */}
                    <td className="px-3 py-3.5 text-center hidden sm:table-cell">
                      <span className={cn('text-base font-black', u.checkedIn > 0 ? 'text-emerald-600' : 'text-slate-300')}>
                        {u.checkedIn}
                      </span>
                    </td>

                    {/* Last seen */}
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{daysSince(u.lastSeen)}</p>
                        <p className="text-[11px] text-slate-400">{fmtDate(u.lastSeen)}</p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5 text-center">
                      <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border', roleConf.color)}>
                        <RoleIcon className="w-2.5 h-2.5" />
                        {roleConf.label}
                      </span>
                    </td>

                    {/* Detail button */}
                    <td className="px-3 py-3.5 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(u); }}
                        className="w-7 h-7 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-violet-100 hover:text-violet-600 flex items-center justify-center text-slate-400 transition-all"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ← ก่อนหน้า
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = i + 1;
                if (totalPages > 5) {
                  if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      'w-7 h-7 rounded-lg text-xs font-bold transition',
                      page === p
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-500 hover:bg-slate-100'
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              ถัดไป →
            </button>
          </div>
        )}
      </div>

      {/* ── Detail Drawer ──────────────────────────────────────────────────── */}
      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
