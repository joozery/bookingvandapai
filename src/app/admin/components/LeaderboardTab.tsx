'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Person = { key: string; nickname: string; tripCount: number; isHidden: boolean };
export default function LeaderboardTab() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('all');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch('/api/admin/leaderboard', { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'โหลดไม่สำเร็จ');
      setPeople(result.people);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);
  async function toggle(person: Person) {
    if (saving) return;
    setSaving(person.key); setError(''); setNotice('');
    try {
      const response = await fetch('/api/admin/leaderboard', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: person.key, isHidden: !person.isHidden }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'บันทึกไม่สำเร็จ');
      setPeople(current => current.map(item => item.key === person.key ? { ...item, isHidden: result.isHidden } : item));
      setNotice(`${result.isHidden ? 'ซ่อน' : 'เปิดแสดง'}รายชื่อ ${person.nickname} แล้ว`);
    } catch (error) { setError(error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ'); }
    finally { setSaving(null); }
  }
  const filtered = people.filter(person => person.nickname.toLocaleLowerCase('th').includes(search.trim().toLocaleLowerCase('th')) && (visibility === 'all' || person.isHidden === (visibility === 'hidden')));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pageCount);
  return <div className="space-y-4">
    <div><h2 className="text-lg font-black text-slate-800">จัดการอันดับคนจองทริป</h2><p className="text-sm text-slate-500 mt-1">ซ่อนรายชื่อจากตารางหน้าแรก หรือเปิดแสดงกลับได้ ข้อมูลการจองยังอยู่ครบ และอันดับจะเรียงใหม่เฉพาะรายชื่อที่แสดง</p></div>
    <div className="flex flex-wrap gap-3">
      <input aria-label="ค้นหาชื่อเล่น" placeholder="ค้นหาชื่อเล่น…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="rounded-xl border bg-white px-3 py-2 text-sm" />
      <select aria-label="สถานะการแสดงอันดับ" value={visibility} onChange={e => { setVisibility(e.target.value); setPage(1); }} className="rounded-xl border bg-white px-3 py-2 text-sm"><option value="all">ทั้งหมด</option><option value="visible">แสดงอยู่</option><option value="hidden">ซ่อนอยู่</option></select>
    </div>
    {error && <div role="alert" className="text-sm text-red-600">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">โหลดใหม่</button></div>}
    {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    {loading ? <p className="p-6 text-sm text-slate-500">กำลังโหลดรายชื่อ…</p> : <>
      <p className="text-xs text-slate-500">แสดงอยู่ {people.filter(person => !person.isHidden).length} คน • ซ่อนอยู่ {people.filter(person => person.isHidden).length} คน</p>
      {!filtered.length ? <p className="p-6 text-center text-slate-500">ไม่พบรายชื่อตามเงื่อนไข</p> : <div className="space-y-2">{filtered.slice((currentPage - 1) * 20, currentPage * 20).map(person => <div key={person.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="min-w-0"><p className="font-bold text-slate-800 break-words">{person.nickname}</p><p className="text-xs text-slate-500 mt-1">{person.tripCount} ทริป • {person.isHidden ? 'ซ่อนอยู่' : 'แสดงอยู่'} <span className="text-slate-400">(รหัส {person.key.slice(0, 8)})</span></p></div>
        <button type="button" disabled={!!saving} onClick={() => toggle(person)} aria-label={`${person.isHidden ? 'แสดง' : 'ซ่อน'} ${person.nickname}`} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold text-violet-800 disabled:opacity-50">{person.isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{saving === person.key ? 'กำลังบันทึก…' : person.isHidden ? 'เปิดแสดง' : 'ซ่อนรายชื่อ'}</button>
      </div>)}</div>}
      {pageCount > 1 && <div className="flex items-center justify-end gap-3 text-sm"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border p-2 disabled:opacity-30">ก่อนหน้า</button><span>{currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-lg border p-2 disabled:opacity-30">ถัดไป</button></div>}
    </>}
  </div>;
}
