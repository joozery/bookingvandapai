'use client';

import React, { useState } from 'react';
import { Bus, Plus, Trash2, Edit2, Save, X, Users, Phone, LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Trip, Van, Seat } from './types';
import { cn } from '@/lib/utils';

interface Props {
  trips: Trip[];
  vans: Van[];
  onAddVan: (tripId: string) => Promise<void>;
  onDeleteVan: (vanId: string) => Promise<void>;
  onUpdateVan: (vanId: string, data: { plateNumber: string; driverName: string; driverPhone: string }) => Promise<void>;
  onUpdateStaff: (vanId: string, seatId: string, staffName: string) => Promise<void>;
}

export default function VansTab({ trips, vans, onAddVan, onDeleteVan, onUpdateVan, onUpdateStaff }: Props) {
  const [editingVanId, setEditingVanId] = useState<string | null>(null);
  const [vanForm, setVanForm] = useState({ plateNumber: '', driverName: '', driverPhone: '' });
  const [editingStaff, setEditingStaff] = useState<{ vanId: string; seatId: string; staffName: string } | null>(null);
  const [viewSeatVanId, setViewSeatVanId] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string>('all');

  const filteredTrips = selectedTripId === 'all' ? trips : trips.filter(t => t.id === selectedTripId);

  const renderAdminSeat = (s: Seat | undefined) => {
    if (!s) return <div className="w-8 h-8" />;
    const isDriver = s.type === 'driver';
    const isStaff = s.type === 'staff';
    const isAvail = s.status === 'available';
    let bg = 'bg-slate-200 border-slate-300';
    let label = s.label;
    if (isDriver) { bg = 'bg-slate-800 text-white border-slate-950'; label = 'D'; }
    else if (isStaff) { bg = 'bg-violet-200 text-violet-800 border-violet-400'; }
    else if (isAvail) { bg = 'bg-emerald-100 text-emerald-700 border-emerald-400 shadow-sm'; }
    else { bg = 'bg-slate-200 text-slate-400 border-slate-300 line-through'; }

    return (
      <div key={s.id} title={s.type === 'staff' ? s.staffName : ''} className={cn("w-8 h-8 rounded border flex items-center justify-center text-[11px] font-black select-none", bg)}>
        {label}
      </div>
    );
  };

  const startEdit = (van: Van) => {
    setEditingVanId(van.id);
    setVanForm({ plateNumber: van.plateNumber, driverName: van.driverName, driverPhone: van.driverPhone });
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    await onUpdateStaff(editingStaff.vanId, editingStaff.seatId, editingStaff.staffName);
    setEditingStaff(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Toolbar ────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Bus className="w-5 h-5 text-violet-600" />
            ข้อมูลรถตู้แต่ละทริป
          </h2>
          <p className="text-xs text-slate-400 mt-1">เลือกทริปเพื่อจัดการรถและผังที่นั่ง</p>
        </div>
        
        <select
          value={selectedTripId}
          onChange={(e) => setSelectedTripId(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-lg text-sm focus:outline-none focus:ring-violet-500 font-medium text-slate-700"
        >
          <option value="all">ทุกทริป (ทั้งหมด)</option>
          {trips.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {trips.length === 0 && (
        <div className="text-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <Bus className="w-10 h-10 mx-auto mb-2 text-slate-200" />
          <p className="text-sm font-semibold">ยังไม่มีทริปในระบบ กรุณาสร้างทริปก่อน</p>
        </div>
      )}

      {filteredTrips.map(trip => {
        const tripVans = vans.filter(v => v.tripId === trip.id);

        return (
          <Card key={trip.id} className="border-none shadow-sm bg-white">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-violet-600 font-black uppercase tracking-widest block">TRIP</span>
                  <CardTitle className="text-sm">{trip.name}</CardTitle>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddVan(trip.id)}
                  className="h-8 text-xs border-violet-200 text-violet-700 hover:bg-violet-50 gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มรถตู้
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-3">
              {tripVans.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  ยังไม่มีรถตู้ กด "เพิ่มรถตู้" ด้านบน
                </p>
              ) : tripVans.map(van => {
                const isEditing = editingVanId === van.id;
                const staffSeat = van.seats.find(s => s.type === 'staff');
                const customerSeats = van.seats.filter(s => s.type === 'customer');
                const availableCount = customerSeats.filter(s => s.status === 'available').length;

                return (
                  <div key={van.id} className="bg-slate-50/70 rounded-xl p-4 space-y-3 hover:bg-slate-100/50 transition">

                    {/* Van Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                          <Bus className="w-4.5 h-4.5 text-violet-600" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">รถตู้คันที่ {van.vanNumber}</div>
                          <div className="text-[10px] text-slate-500">{van.plateNumber}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          ว่าง {availableCount}/{customerSeats.length}
                        </Badge>
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => { onUpdateVan(van.id, vanForm); setEditingVanId(null); }}
                              className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingVanId(null)}
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 flex items-center justify-center transition"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(van)}
                              className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-violet-600 hover:border-violet-200 flex items-center justify-center transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteVan(van.id)}
                              className="w-7 h-7 rounded-lg border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Edit Form */}
                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">ป้ายทะเบียน</label>
                          <Input value={vanForm.plateNumber} onChange={e => setVanForm({ ...vanForm, plateNumber: e.target.value })} className="h-7 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อคนขับ</label>
                          <Input value={vanForm.driverName} onChange={e => setVanForm({ ...vanForm, driverName: e.target.value })} className="h-7 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">เบอร์คนขับ</label>
                          <Input value={vanForm.driverPhone} onChange={e => setVanForm({ ...vanForm, driverPhone: e.target.value })} className="h-7 text-xs" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />คนขับ: <strong className="text-slate-700">{van.driverName || '-'}</strong>
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />{van.driverPhone || 'ไม่ระบุเบอร์'}
                        </span>
                      </div>
                    )}

                    {/* Staff Seat */}
                    {staffSeat && (
                      <div className="border-t border-slate-200 pt-3">
                        <p className="text-[10px] font-bold text-violet-700 mb-1.5">ผู้จัดประจำคัน (เบาะ 1)</p>
                        {editingStaff?.vanId === van.id && editingStaff?.seatId === staffSeat.id ? (
                          <form onSubmit={handleStaffSubmit} className="flex gap-2">
                            <Input
                              autoFocus
                              value={editingStaff.staffName}
                              onChange={e => setEditingStaff({ ...editingStaff, staffName: e.target.value })}
                              className="h-7 text-xs flex-1"
                              placeholder="ชื่อผู้จัด"
                            />
                            <button type="submit" className="px-3 h-7 bg-violet-600 text-white text-[10px] rounded-lg font-bold hover:bg-violet-700 transition">บันทึก</button>
                            <button type="button" onClick={() => setEditingStaff(null)} className="px-3 h-7 border border-slate-200 text-[10px] rounded-lg text-slate-500 hover:bg-slate-100 transition">ยกเลิก</button>
                          </form>
                        ) : (
                          <button
                            onClick={() => setEditingStaff({ vanId: van.id, seatId: staffSeat.id, staffName: staffSeat.staffName || '' })}
                            className="flex items-center gap-2 text-[10px] text-slate-600 hover:text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg border border-violet-100 transition group"
                          >
                            <div className="w-5 h-5 rounded bg-violet-200 flex items-center justify-center text-violet-700 font-black text-[10px]">1</div>
                            <span className="font-semibold">{staffSeat.staffName || 'ยังไม่ระบุชื่อผู้จัด'}</span>
                            <Edit2 className="w-2.5 h-2.5 ml-auto opacity-0 group-hover:opacity-100 transition" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* View Seats Button */}
                    <div className="pt-2 border-t border-slate-100 mt-2">
                      <button
                        onClick={() => setViewSeatVanId(viewSeatVanId === van.id ? null : van.id)}
                        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[10px] font-bold hover:bg-slate-50 transition shadow-sm"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" /> 
                        {viewSeatVanId === van.id ? 'ซ่อนผังที่นั่ง' : 'ดูผังที่นั่ง'}
                        {viewSeatVanId === van.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Mini Seat Map */}
                    {viewSeatVanId === van.id && (
                      <div className="pt-3 pb-1 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex flex-col gap-1.5 w-[116px] mx-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex gap-1.5">
                            {renderAdminSeat(van.seats.find(s=>s.row===1&&s.col===1))}
                            <div className="w-8 h-8" />
                            {renderAdminSeat(van.seats.find(s=>s.row===1&&s.col===3))}
                          </div>
                          {[2,3,4].map(r => (
                            <div key={r} className="flex gap-1.5">
                              {[1,2,3].map(c => renderAdminSeat(van.seats.find(s=>s.row===r&&s.col===c)))}
                            </div>
                          ))}
                        </div>
                        
                        <div className="mt-4 flex flex-wrap justify-center gap-3 text-[9px] font-bold text-slate-500">
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-400" /> ว่าง</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300" /> จองแล้ว</span>
                          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-violet-200 border border-violet-400" /> ผู้จัด</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
