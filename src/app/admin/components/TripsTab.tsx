'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import { Compass, Plus, FileText, Trash2, Calendar, Clock, MapPin, Info, Link2, Check, ArrowLeft, Image as ImageIcon, Pencil, Search, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Trip, Van } from './types';

interface Props {
  trips: Trip[];
  vans: Van[];
  onCreate: (form: { name: string; departureDate: string; durationDays: number; cost: number; pickupPoint: string; departureTime: string; tripPeriod: string; vansCount: number; vansList: { plateNumber: string; driverName: string; driverPhone: string; }[]; imageFile?: File | null }) => Promise<void>;
  onUpdate: (id: string, form: { name: string; departureDate: string; durationDays: number; cost: number; pickupPoint: string; departureTime: string; tripPeriod: string; imageFile?: File | null }) => Promise<void>;
  onDelete: (tripId: string) => Promise<void>;
}

const DEFAULT_FORM = { name: '', departureDate: '', returnDate: '', durationDays: 3, cost: 1500, pickupPoint: '', departureTime: '06:00', tripPeriod: '', durationText: '', vansCount: 1, vansList: [{ plateNumber: '', driverName: '', driverPhone: '' }] };

const calculateEndDate = (startDate: string, days: number) => {
  if (!startDate || !days) return '';
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + (Number(days) - 1));
  return d.toISOString().split('T')[0];
};

const calculateDays = (start: string, end: string) => {
  if(!start || !end) return 0;
  const d1 = new Date(start);
  const d2 = new Date(end);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  const diffTime = d2.getTime() - d1.getTime();
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1); 
};

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

const ThaiDatePicker = ({ value, onChange, required, min, max }: { value: string, onChange: (val: string) => void, required?: boolean, min?: string, max?: string }) => {
  const displayValue = React.useMemo(() => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  }, [value]);

  return (
    <div className="relative w-full h-10">
      {/* Background visual layer */}
      <div className="absolute inset-0 flex items-center justify-between px-3 bg-white border border-slate-200 rounded-lg pointer-events-none z-0">
        <span className={displayValue ? 'text-slate-800 text-sm' : 'text-slate-400 text-sm'}>
          {displayValue || 'วว/ดด/ปปปป'}
        </span>
        <Calendar className="w-4 h-4 text-slate-400" />
      </div>
      {/* Invisible native date input on top */}
      <input
        type="date"
        required={required}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
    </div>
  );
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
  const [editForm, setEditForm] = useState({ name: '', departureDate: '', returnDate: '', durationDays: 3, cost: 1500, pickupPoint: '', departureTime: '06:00', tripPeriod: '', durationText: '' });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  // Cropper States
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCroppedImage = async () => {
    try {
      if (!originalImage || !croppedAreaPixels) return;
      const croppedImageBlob = await getCroppedImg(originalImage, croppedAreaPixels);
      const croppedFile = new File([croppedImageBlob], originalFileName || 'cover.jpg', { type: 'image/jpeg' });
      if (editingTrip) {
        setEditImageFile(croppedFile);
        setEditImagePreview(URL.createObjectURL(croppedFile));
      } else {
        setImageFile(croppedFile);
        setImagePreview(URL.createObjectURL(croppedFile));
      }
      setShowCropper(false);
    } catch (e) {
      console.error(e);
    }
  };

  const startEditing = (trip: Trip) => {
    setEditingTrip(trip);
    const parts = (trip.tripPeriod || '').split('||');
    const hasCustomDuration = parts.length > 1;
    const period = hasCustomDuration ? parts[1] : parts[0];
    const durationText = hasCustomDuration ? parts[0] : '';
    setEditForm({
      name: trip.name,
      departureDate: trip.departureDate,
      returnDate: calculateEndDate(trip.departureDate, trip.durationDays),
      durationDays: trip.durationDays,
      cost: trip.cost,
      pickupPoint: trip.pickupPoint,
      departureTime: trip.departureTime || '06:00',
      tripPeriod: period,
      durationText,
    });
    setEditImageFile(null);
    setEditImagePreview(trip.image || null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrip || !editForm.name || !editForm.departureDate || !editForm.pickupPoint) return;
    const finalTripPeriod = editForm.durationText ? `${editForm.durationText}||${editForm.tripPeriod}` : editForm.tripPeriod;
    await onUpdate(editingTrip.id, { ...editForm, tripPeriod: finalTripPeriod, imageFile: editImageFile });
    setEditingTrip(null);
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.departureDate || !form.pickupPoint) return;
    const finalTripPeriod = form.durationText ? `${form.durationText}||${form.tripPeriod}` : form.tripPeriod;
    await onCreate({ ...form, tripPeriod: finalTripPeriod, imageFile });
    setForm(DEFAULT_FORM);
    setImageFile(null);
    setImagePreview(null);
    setIsCreating(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalFileName(file.name);
      setOriginalImage(URL.createObjectURL(file));
      setShowCropper(true);
      // Reset input so the same file can be selected again
      e.target.value = '';
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

  const cropperModal = showCropper && originalImage && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">ครอปรูปภาพหน้าปก</h3>
          <button onClick={() => setShowCropper(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative w-full h-[400px] bg-slate-900">
          <Cropper
            image={originalImage}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500">ซูม:</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
          </div>
          <Button type="button" onClick={handleCroppedImage} className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 h-10 gap-2 shadow-sm">
            <Check className="w-4 h-4" /> ใช้รูปภาพนี้
          </Button>
        </div>
      </div>
    </div>
  );

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
                      <ThaiDatePicker required value={editForm.departureDate} onChange={val => {
                        const date = val;
                        const returnDate = editForm.returnDate && editForm.returnDate >= date ? editForm.returnDate : calculateEndDate(date, editForm.durationDays);
                        const days = calculateDays(date, returnDate);
                        setEditForm({ ...editForm, departureDate: date, returnDate, durationDays: days });
                      }} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">เวลาออกเดินทาง <span className="text-rose-500">*</span></label>
                      <Input required type="time" value={editForm.departureTime} onChange={e => setEditForm({ ...editForm, departureTime: e.target.value })} className="h-10 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">วันเดินทางกลับ <span className="text-rose-500">*</span></label>
                      <ThaiDatePicker required min={editForm.departureDate} value={editForm.returnDate} onChange={val => {
                        const end = val;
                        const days = calculateDays(editForm.departureDate, end);
                        setEditForm({ ...editForm, returnDate: end, durationDays: days });
                      }} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ค่าบริการ (บาท) <span className="text-rose-500">*</span></label>
                      <Input required type="number" min={0} value={editForm.cost} onChange={e => setEditForm({ ...editForm, cost: Number(e.target.value) })} className="h-10 text-sm font-bold text-violet-700" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ระยะเวลา (ข้อความแสดงผล)</label>
                      <Input value={editForm.durationText || ''} onChange={e => setEditForm({ ...editForm, durationText: e.target.value })} placeholder="เช่น 3 วัน 2 คืน" className="h-10 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ช่วงเวลาทริป (แสดงผล)</label>
                      <Input value={editForm.tripPeriod} onChange={e => setEditForm({ ...editForm, tripPeriod: e.target.value })} placeholder="เช่น 20-23 พ.ค. 2569" className="h-10 text-sm" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">จุดขึ้นรถ <span className="text-rose-500">*</span></label>
                    <Input required value={editForm.pickupPoint} onChange={e => setEditForm({ ...editForm, pickupPoint: e.target.value })} placeholder="เช่น ปั๊ม ปตท. จตุจักร" className="h-10 text-sm" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">รูปภาพหน้าปกทริป</label>
                  <label className="w-full h-48 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:border-violet-300 transition cursor-pointer group relative overflow-hidden">
                    <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFileChange} />
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
        {cropperModal}
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
                      <ThaiDatePicker required value={form.departureDate} onChange={val => {
                        const date = val;
                        const returnDate = form.returnDate && form.returnDate >= date ? form.returnDate : calculateEndDate(date, form.durationDays);
                        const days = calculateDays(date, returnDate);
                        setForm({ ...form, departureDate: date, returnDate, durationDays: days });
                      }} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">เวลาออกเดินทาง <span className="text-rose-500">*</span></label>
                      <Input required type="time" value={form.departureTime} onChange={e => setForm({ ...form, departureTime: e.target.value })} className="h-10 text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">วันเดินทางกลับ <span className="text-rose-500">*</span></label>
                      <ThaiDatePicker required min={form.departureDate} value={form.returnDate} onChange={val => {
                        const end = val;
                        const days = calculateDays(form.departureDate, end);
                        setForm({ ...form, returnDate: end, durationDays: days });
                      }} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ค่าบริการ (บาท) <span className="text-rose-500">*</span></label>
                      <Input required type="number" min={0} value={form.cost} onChange={e => setForm({ ...form, cost: Number(e.target.value) })} className="h-10 text-sm font-bold text-violet-700" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ระยะเวลา (ข้อความแสดงผล)</label>
                      <Input value={form.durationText || ''} onChange={e => setForm({ ...form, durationText: e.target.value })} placeholder="เช่น 3 วัน 2 คืน" className="h-10 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">ช่วงเวลาทริป (แสดงผล)</label>
                      <Input value={form.tripPeriod} onChange={e => setForm({ ...form, tripPeriod: e.target.value })} placeholder="เช่น 20-23 พ.ค. 2569" className="h-10 text-sm" />
                    </div>
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
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-violet-800 flex items-center gap-1.5">
                        <Info className="w-4 h-4" /> ตั้งค่ารถตู้เริ่มต้น
                      </h4>
                      <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-violet-200 shadow-sm">
                        <label className="text-xs font-bold text-violet-700">จำนวนรถตู้:</label>
                        <select 
                          value={form.vansCount} 
                          onChange={e => {
                            const count = Number(e.target.value);
                            const newList = [...form.vansList];
                            if (count > newList.length) {
                              for (let i = newList.length; i < count; i++) newList.push({ plateNumber: '', driverName: '', driverPhone: '' });
                            } else {
                              newList.length = count;
                            }
                            setForm({ ...form, vansCount: count, vansList: newList });
                          }}
                          className="bg-transparent text-sm font-bold text-violet-900 focus:outline-none"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} คัน</option>)}
                        </select>
                      </div>
                    </div>
                    <p className="text-[11px] text-violet-600 mb-4">ระบบจะสร้างรถตู้ตามจำนวนที่ระบุ และคุณสามารถตั้งค่าป้ายทะเบียนหรือคนขับให้แต่ละคันได้เลย</p>
                    
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {form.vansList.map((van, idx) => (
                        <div key={idx} className="p-3 bg-white border border-violet-100 rounded-lg space-y-3">
                          <h5 className="text-[11px] font-bold text-violet-800 border-b border-violet-50 pb-1.5">รถคันที่ {idx + 1}</h5>
                          <div>
                            <label className="text-[10px] font-bold text-violet-700 block mb-1">ป้ายทะเบียนรถ</label>
                            <Input value={van.plateNumber} onChange={e => {
                              const newList = [...form.vansList];
                              newList[idx].plateNumber = e.target.value;
                              setForm({ ...form, vansList: newList });
                            }} placeholder="เช่น นข 9999 กรุงเทพ" className="h-8 text-xs bg-slate-50 border-slate-200" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[10px] font-bold text-violet-700 block mb-1">ชื่อคนขับ</label>
                              <Input value={van.driverName} onChange={e => {
                                const newList = [...form.vansList];
                                newList[idx].driverName = e.target.value;
                                setForm({ ...form, vansList: newList });
                              }} placeholder="เช่น พี่ณัฐ" className="h-8 text-xs bg-slate-50 border-slate-200" />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-violet-700 block mb-1">เบอร์โทรคนขับ</label>
                              <Input value={van.driverPhone} onChange={e => {
                                const newList = [...form.vansList];
                                newList[idx].driverPhone = e.target.value;
                                setForm({ ...form, vansList: newList });
                              }} placeholder="เช่น 081-234-5678" className="h-8 text-xs bg-slate-50 border-slate-200" />
                            </div>
                          </div>
                        </div>
                      ))}
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
        {cropperModal}
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
                          {trip.tripPeriod && <span className="text-slate-400 font-normal">({trip.tripPeriod.split('||').pop()})</span>}
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

      {cropperModal}
    </div>
  );
}
