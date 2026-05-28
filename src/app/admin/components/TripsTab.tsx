'use client';

import React, { useState } from 'react';
import { Compass, Plus, FileText, Trash2, Calendar, Clock, MapPin, Info, Link2, Check, ArrowLeft, Image as ImageIcon, Pencil, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Trip, Van } from './types';

interface Props {
  trips: Trip[];
  vans: Van[];
  onCreate: (form: { name: string; departureDate: string; durationDays: number; cost: number; pickupPoint: string; departureTime: string; tripPeriod: string; plateNumber: string; driverName: string; driverPhone: string; imageFile?: File | null }) => Promise<void>;
  onUpdate: (id: string, form: { name: string; departureDate: string; durationDays: number; cost: number; pickupPoint: string; departureTime: string; tripPeriod: string; imageFile?: File | null }) => Promise<void>;
  onDelete: (tripId: string) => Promise<void>;
}

const DEFAULT_FORM = { name: '', departureDate: '', durationDays: 3, cost: 1500, pickupPoint: '', departureTime: '06:00', tripPeriod: '', plateNumber: '', driverName: '', driverPhone: '' };

const generatePeriod = (dateStr: string, days: number) => {
  if (!dateStr || !days) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  const d2 = new Date(d);
  d2.setDate(d.getDate() + (Number(days) - 1));
  
  const startDay = d.getDate();
  const endDay = d2.getDate();
  const month = d.toLocaleDateString('th-TH', { month: 'short' });
  const year = d.getFullYear() + 543;
  
  if (d.getMonth() === d2.getMonth() && d.getFullYear() === d2.getFullYear()) {
    return `${startDay}-${endDay} ${month} ${year}`;
  } else {
    const endMonth = d2.toLocaleDateString('th-TH', { month: 'short' });
    const endYear = d2.getFullYear() + 543;
    if (d.getFullYear() === d2.getFullYear()) {
      return `${startDay} ${month} - ${endDay} ${endMonth} ${year}`;
    } else {
      return `${startDay} ${month} ${year} - ${endDay} ${endMonth} ${endYear}`;
    }
  }
};

export default function TripsTab({ trips, vans, onCreate, onUpdate, onDelete }: Props) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Edit States
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState({ name: '', departureDate: '', durationDays: 3, cost: 1500, pickupPoint: '', departureTime: '06:00', tripPeriod: '' });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const startEditing = (trip: Trip) => {
    setEditingTrip(trip);
    setEditForm({
      name: trip.name,
      departureDate: trip.departureDate,
      durationDays: trip.durationDays,
      cost: trip.cost,
      pickupPoint: trip.pickupPoint,
      departureTime: trip.departureTime || '06:00',
      tripPeriod: trip.tripPeriod || '',
    });
    setEditImageFile(null);
    setEditImagePreview(trip.image || null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip || !editForm.name || !editForm.departureDate || !editForm.pickupPoint) return;
    await onUpdate(editingTrip.id, { ...editForm, imageFile: editImageFile });
    setEditingTrip(null);
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.departureDate || !form.pickupPoint) return;
    await onCreate({ ...form, imageFile });
    setForm(DEFAULT_FORM);
    setImageFile(null);
    setImagePreview(null);
    setIsCreating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/?tripId=${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredTrips = React.useMemo(() => {
    return trips.filter(trip => 
      trip.name.toLowerCase().includes(search.toLowerCase()) ||
      trip.pickupPoint.toLowerCase().includes(search.toLowerCase()) ||
      (trip.tripPeriod && trip.tripPeriod.toLowerCase().includes(search.toLowerCase())) ||
      trip.departureDate.includes(search)
    );
  }, [trips, search]);

  if (editingTrip) {
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditingTrip(null)}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              แก้ไขข้อมูลทริป
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">แก้ไขรายละเอียดทริป "{editingTrip.name}"</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-sm flex items-center gap-2 text-violet-700">
              <Compass className="w-4 h-4" /> ข้อมูลทั่วไปของทริป
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleEditSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">ชื่อทริป <span className="text-rose-500">*</span></label>
                    <Input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="เช่น ทริปน่านกระซิบรัก 3 วัน 2 คืน" className="h-10 text-sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">วันออกเดินทาง <span className="text-rose-500">*</span></label>
                      <Input required type="date" value={editForm.departureDate} onChange={e => {
                        const date = e.target.value;
                        setEditForm({ ...editForm, departureDate: date, tripPeriod: generatePeriod(date, editForm.durationDays) });
                      }} className="h-10 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">เวลาออกเดินทาง <span className="text-rose-500">*</span></label>
                      <Input required type="time" value={editForm.departureTime} onChange={e => setEditForm({ ...editForm, departureTime: e.target.value })} className="h-10 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ระยะเวลา (วัน) <span className="text-rose-500">*</span></label>
                      <Input required type="number" min={1} max={30} value={editForm.durationDays} onChange={e => {
                        const days = Number(e.target.value);
                        setEditForm({ ...editForm, durationDays: days, tripPeriod: generatePeriod(editForm.departureDate, days) });
                      }} className="h-10 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ค่าบริการ (บาท) <span className="text-rose-500">*</span></label>
                      <Input required type="number" min={0} value={editForm.cost} onChange={e => setEditForm({ ...editForm, cost: Number(e.target.value) })} className="h-10 text-sm font-bold text-violet-700" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">ช่วงเวลาทริป (แสดงผล)</label>
                    <Input value={editForm.tripPeriod} onChange={e => setEditForm({ ...editForm, tripPeriod: e.target.value })} placeholder="เช่น 20-23 พ.ค. 2569 (ไม่บังคับ)" className="h-10 text-sm" />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">จุดขึ้นรถ <span className="text-rose-500">*</span></label>
                    <Input required value={editForm.pickupPoint} onChange={e => setEditForm({ ...editForm, pickupPoint: e.target.value })} placeholder="เช่น ปั๊ม ปตท. จตุจักร" className="h-10 text-sm" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">รูปภาพหน้าปกทริป</label>
                  <label className="w-full h-48 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-violet-300 transition cursor-pointer group relative overflow-hidden">
                    <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditImageFile(file);
                        setEditImagePreview(URL.createObjectURL(file));
                      }
                    }} />
                    {editImagePreview ? (
                      <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 mb-2 text-slate-300 group-hover:text-violet-400 transition" />
                        <span className="text-sm font-bold text-slate-500 group-hover:text-violet-600">อัปโหลดรูปภาพใหม่</span>
                        <span className="text-[10px] mt-1">รองรับ JPG, PNG ขนาดไม่เกิน 5MB</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setEditingTrip(null)} className="h-10 px-6 font-bold">
                  ยกเลิก
                </Button>
                <Button type="submit" className="h-10 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2 shadow-md">
                  <Check className="w-4 h-4" /> บันทึกการแก้ไข
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreating(false)}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              สร้างทริปใหม่
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">กรอกรายละเอียดทริปเพื่อให้ลูกทริปสามารถจองได้</p>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
            <CardTitle className="text-sm flex items-center gap-2 text-violet-700">
              <Compass className="w-4 h-4" /> ข้อมูลทั่วไปของทริป
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">ชื่อทริป <span className="text-rose-500">*</span></label>
                    <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="เช่น ทริปน่านกระซิบรัก 3 วัน 2 คืน" className="h-10 text-sm" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">วันออกเดินทาง <span className="text-rose-500">*</span></label>
                      <Input required type="date" value={form.departureDate} onChange={e => {
                        const date = e.target.value;
                        setForm({ ...form, departureDate: date, tripPeriod: generatePeriod(date, form.durationDays) });
                      }} className="h-10 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">เวลาออกเดินทาง <span className="text-rose-500">*</span></label>
                      <Input required type="time" value={form.departureTime} onChange={e => setForm({ ...form, departureTime: e.target.value })} className="h-10 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ระยะเวลา (วัน) <span className="text-rose-500">*</span></label>
                      <Input required type="number" min={1} max={30} value={form.durationDays} onChange={e => {
                        const days = Number(e.target.value);
                        setForm({ ...form, durationDays: days, tripPeriod: generatePeriod(form.departureDate, days) });
                      }} className="h-10 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ค่าบริการ (บาท) <span className="text-rose-500">*</span></label>
                      <Input required type="number" min={0} value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} className="h-10 text-sm font-bold text-violet-700" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">ช่วงเวลาทริป (แสดงผล)</label>
                    <Input value={form.tripPeriod} onChange={e => setForm({ ...form, tripPeriod: e.target.value })} placeholder="เช่น 20-23 พ.ค. 2569 (ไม่บังคับ)" className="h-10 text-sm" />
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">จุดขึ้นรถ <span className="text-rose-500">*</span></label>
                    <Input required value={form.pickupPoint} onChange={e => setForm({ ...form, pickupPoint: e.target.value })} placeholder="เช่น ปั๊ม ปตท. จตุจักร" className="h-10 text-sm" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">รูปภาพหน้าปกทริป</label>
                  <label className="w-full h-48 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-violet-300 transition cursor-pointer group relative overflow-hidden">
                    <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFileChange} />
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 mb-2 text-slate-300 group-hover:text-violet-400 transition" />
                        <span className="text-sm font-bold text-slate-500 group-hover:text-violet-600">อัปโหลดรูปภาพ</span>
                        <span className="text-[10px] mt-1">รองรับ JPG, PNG ขนาดไม่เกิน 5MB</span>
                      </>
                    )}
                  </label>
                  
                  <div className="bg-violet-50 border border-violet-100 rounded-xl p-5 mt-6">
                    <h4 className="text-sm font-bold text-violet-800 mb-3 flex items-center gap-1.5">
                      <Info className="w-4 h-4" /> ข้อมูลรถตู้คันแรก (คันที่ 1)
                    </h4>
                    <p className="text-[11px] text-violet-600 mb-4">ระบบจะสร้างรถตู้คันที่ 1 ให้ทันที คุณสามารถใส่ข้อมูลคนขับไว้ล่วงหน้าได้ (แก้ทีหลังได้ในเมนูจัดการรถ)</p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-violet-700 block mb-1">ป้ายทะเบียนรถ</label>
                        <Input value={form.plateNumber} onChange={e => setForm({ ...form, plateNumber: e.target.value })} placeholder="เช่น นข 9999 กรุงเทพ" className="h-8 text-xs bg-white border-violet-200" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-violet-700 block mb-1">ชื่อคนขับ</label>
                          <Input value={form.driverName} onChange={e => setForm({ ...form, driverName: e.target.value })} placeholder="เช่น พี่ณัฐ" className="h-8 text-xs bg-white border-violet-200" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-violet-700 block mb-1">เบอร์โทรคนขับ</label>
                          <Input value={form.driverPhone} onChange={e => setForm({ ...form, driverPhone: e.target.value })} placeholder="เช่น 081-234-5678" className="h-8 text-xs bg-white border-violet-200" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)} className="h-10 px-6 font-bold">
                  ยกเลิก
                </Button>
                <Button type="submit" className="h-10 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2 shadow-md">
                  <Check className="w-4 h-4" /> ยืนยันการสร้างทริป
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }



  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-600" />
            ทริปเดินทางทั้งหมด
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">จัดการทริป, ดูยอดจอง และแชร์ลิ้งก์รับสมัคร</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-pulse" />
            <Input
              type="text"
              placeholder="ค้นหาชื่อทริป, วันที่, จุดขึ้นรถ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 bg-slate-50 border-slate-200 text-xs rounded-lg"
            />
          </div>
          <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white h-9 shadow-sm gap-1.5 text-xs font-bold rounded-lg">
            <Plus className="w-4 h-4" /> สร้างทริปใหม่
          </Button>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Compass className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">ยังไม่มีทริปในระบบ</h3>
          <p className="text-xs text-slate-400 mb-4">เริ่มต้นด้วยการสร้างทริปแรกของคุณ เพื่อเปิดรับจอง</p>
          <Button onClick={() => setIsCreating(true)} variant="outline" className="h-9 text-xs font-bold border-violet-200 text-violet-600 hover:bg-violet-50">
            สร้างทริปใหม่ตอนนี้
          </Button>
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-slate-400 gap-2">
          <Search className="w-10 h-10 opacity-20" />
          <p className="font-semibold text-sm">ไม่พบทริปเดินทางที่คุณค้นหา</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {filteredTrips.map(trip => {
            const tripVans = vans.filter(v => v.tripId === trip.id);
            let total = 0, occupied = 0;
            tripVans.forEach(van => van.seats.forEach(s => {
              if (s.type === 'customer') { total++; if (s.status !== 'available') occupied++; }
            }));
            const vacant = total - occupied;
            const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

            return (
              <Card key={trip.id} className="border-slate-200 shadow-sm hover:border-violet-300 transition hover:shadow-md group overflow-hidden flex flex-col">
                {trip.image && (
                  <div className="w-full h-32 relative shrink-0">
                    <img src={trip.image} alt={trip.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                )}
                <CardContent className="p-5 flex-1 flex flex-col">
                  <div className="flex flex-col h-full gap-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-base leading-tight group-hover:text-violet-700 transition">{trip.name}</h4>
                        <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {trip.departureDate}
                          {trip.tripPeriod && <span className="text-slate-400 font-normal">({trip.tripPeriod})</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-violet-600 tracking-tight">฿{trip.cost.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">{trip.durationDays} วัน</div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> ออก {trip.departureTime} น.</span>
                      <span className="text-slate-300">|</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-500" /> {trip.pickupPoint}</span>
                    </div>

                    <div className="flex items-end justify-between mt-auto pt-2">
                      <div className="flex-1 max-w-[200px]">
                        <div className="flex items-center justify-between mb-1.5">
                          <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0">มี {tripVans.length} รถตู้</Badge>
                          <span className="text-[10px] font-bold text-slate-600">
                            ว่าง <strong className={vacant === 0 ? 'text-rose-500' : 'text-emerald-600'}>{vacant}</strong>/{total}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", pct >= 100 ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      <div className="flex gap-1.5 shrink-0 ml-4">
                        <button
                          onClick={() => copyLink(trip.id)}
                          className={cn("flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg border transition text-[11px] font-bold",
                            copiedId === trip.id ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                          )}
                        >
                          {copiedId === trip.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                          {copiedId === trip.id ? 'คัดลอกลิ้งก์แล้ว' : 'แชร์ลิ้งก์'}
                        </button>
                        <button
                          onClick={() => startEditing(trip)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 text-slate-400 transition"
                          title="แก้ไขทริป"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete(trip.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-400 transition"
                          title="ลบทริป"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
