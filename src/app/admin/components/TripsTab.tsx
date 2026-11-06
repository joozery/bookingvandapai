'use client';

import React, { useState, useCallback } from 'react';
import ReviewCopyFields from '@/components/ReviewCopyFields';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import { convertImageToWebp } from '@/lib/imageToWebp';
import { Compass, Plus, FileText, Trash2, Calendar, Clock, MapPin, Info, Link2, Check, ArrowLeft, Image as ImageIcon, Pencil, Search, X, ReceiptText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { formatThaiDate } from '@/lib/dateFormat';
import { parseCalendarDay } from '@/lib/tripCalendar';
import type { Trip, Van } from './types';
import { getTripTheme } from '@/lib/tripThemes';
import { money, thaiDate, today } from './accounting/shared';

interface Props {
  completed?: boolean;
  draft?: boolean;
  canToggleCompleted?: boolean;
  trips: Trip[];
  vans: Van[];
  onCreate: (form: { guideName: string; name: string; departureDate: string; durationDays: number; cost: number | ''; flashSalePrice: number | ''; depositAmount: number | ''; pickupPoint: string; departureTime: string; tripPeriod: string; reviewTitle: string; reviewDescription: string; vansCount: number; vansList: { plateNumber: string; driverName: string; driverPhone: string; }[]; imageFile?: File | null }) => Promise<void>;
  onUpdate: (id: string, form: { guideName: string; name: string; departureDate: string; durationDays: number; cost: number; flashSalePrice: number | ''; depositAmount: number | ''; pickupPoint: string; departureTime: string; tripPeriod: string; reviewTitle: string; reviewDescription: string; imageFile?: File | null }) => Promise<boolean>;
  onUpdateVan: (vanId: string, data: { staffName: string }) => Promise<void>;
  onDelete: (tripId: string) => Promise<void>;
  onStatusChange: (tripId: string, status: Trip['status']) => Promise<void>;
  onCancel: (tripId: string) => Promise<void>;
  onChanged?: () => Promise<void>;
}

const DEFAULT_FORM = { guideName: '', reviewTitle: '', reviewDescription: '', name: '', departureDate: '', returnDate: '', durationDays: 3, cost: '' as number | '', flashSalePrice: '' as number | '', depositAmount: '' as number | '', pickupPoint: '', departureTime: '06:00', tripPeriod: '', durationText: '', vansCount: 1, vansList: [{ plateNumber: '', driverName: '', driverPhone: '' }] };

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

import { ThaiDatePicker } from '@/components/ui/ThaiDatePicker';

export default function TripsTab({ trips, vans, onCreate, onUpdate, onUpdateVan, onDelete, onStatusChange, onCancel, onChanged, completed = false, draft = false, canToggleCompleted = true }: Props) {
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTripFilter, setSelectedTripFilter] = useState('');

  const uniqueTripNames = React.useMemo(() => {
    const names = trips.map(t => t.name);
    return Array.from(new Set(names)).sort();
  }, [trips]);

  // Edit States
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editForm, setEditForm] = useState({ guideName: '', reviewTitle: '', reviewDescription: '', name: '', departureDate: '', returnDate: '', durationDays: 3, cost: 1500, flashSalePrice: '' as number | '', depositAmount: '' as number | '', pickupPoint: '', departureTime: '06:00', tripPeriod: '', durationText: '' });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editingStaffNames, setEditingStaffNames] = useState<Record<string, string>>({});
  const [expenseTrip, setExpenseTrip] = useState<Trip | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<{ id: string; name: string }[]>([]);
  const [tripExpenses, setTripExpenses] = useState<{ id: string; date: string; categoryId: string; description: string; amountSatang: number }[]>([]);
  const [tripPayments, setTripPayments] = useState<{ totalSatang: number; paidSatang: number; balanceSatang: number; creditUsedSatang: number; cashPaidSatang: number; booking: { status: string } | null }[]>([]);
  const [expenseEditingId, setExpenseEditingId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState({ date: today(), categoryId: '', amount: '', description: '' });
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [cancelTrip, setCancelTrip] = useState<Trip | null>(null);
  const [cancelRecipients, setCancelRecipients] = useState<{ name: string; amountSatang: number }[]>([]);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const openCancelPreview = async (trip: Trip) => {
    setCancelTrip(trip); setCancelRecipients([]); setCancelError(''); setCancelBusy(true);
    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(trip.id)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'โหลดข้อมูลเครดิตไม่สำเร็จ');
      setCancelRecipients(data.recipients || []);
    } catch (error) { setCancelError((error as Error).message); }
    finally { setCancelBusy(false); }
  };

  const openExpense = async (trip: Trip) => {
    setExpenseError('');
    try {
      const [categoriesResponse, entriesResponse] = await Promise.all([
        fetch('/api/admin/accounting/categories', { cache: 'no-store' }),
        fetch(`/api/admin/accounting/entries?type=expense&tripId=${encodeURIComponent(trip.id)}&page=1&pageSize=100`, { cache: 'no-store' }),
      ]);
      const data = await categoriesResponse.json();
      const entriesData = await entriesResponse.json();
      if (!categoriesResponse.ok || !data.success || !entriesResponse.ok || !entriesData.success) throw new Error(data.error || entriesData.error || 'โหลดข้อมูลค่าใช้จ่ายไม่สำเร็จ');
      const categories = (data.categories || []).filter((category: { type: string }) => category.type === 'expense');
      setExpenseCategories(categories);
      setTripExpenses(entriesData.entries || []);
      const paymentsResponse = await fetch(`/api/admin/payments?tripId=${encodeURIComponent(trip.id)}`, { cache: 'no-store' });
      const paymentsData = await paymentsResponse.json();
      if (!paymentsResponse.ok || !paymentsData.success) throw new Error(paymentsData.error || 'โหลดรายรับไม่สำเร็จ');
      setTripPayments(paymentsData.payments || []);
      setExpenseForm({ date: today(), categoryId: categories[0]?.id || '', amount: '', description: '' });
      setExpenseTrip(trip);
    } catch (error) {
      setExpenseError(error instanceof Error ? error.message : 'โหลดข้อมูลไม่สำเร็จ');
    }
  };

  const saveExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!expenseTrip) return;
    setExpenseBusy(true);
    setExpenseError('');
    try {
      const response = await fetch(`/api/admin/accounting/entries${expenseEditingId ? `/${encodeURIComponent(expenseEditingId)}` : ''}`, {
        method: expenseEditingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseForm, tripId: expenseTrip.id, amount: Number(expenseForm.amount) }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'บันทึกค่าใช้จ่ายไม่สำเร็จ');
      if (data.item) setTripExpenses(previous => expenseEditingId ? previous.map(entry => entry.id === expenseEditingId ? data.item : entry) : [...previous, data.item]);
      setExpenseEditingId(null);
      setExpenseForm(previous => ({ ...previous, amount: '', description: '' }));
      await onChanged?.();
    } catch (error) {
      setExpenseError(error instanceof Error ? error.message : 'บันทึกค่าใช้จ่ายไม่สำเร็จ');
    } finally {
      setExpenseBusy(false);
    }
  };

  const editExpense = (entry: typeof tripExpenses[number]) => {
    setExpenseEditingId(entry.id);
    setExpenseForm({ date: entry.date, categoryId: entry.categoryId, amount: String(entry.amountSatang / 100), description: entry.description || '' });
  };

  const deleteExpense = async (entry: typeof tripExpenses[number]) => {
    if (!confirm(`ลบค่าใช้จ่าย ${money(entry.amountSatang)} ใช่หรือไม่?`)) return;
    try {
      const response = await fetch(`/api/admin/accounting/entries/${encodeURIComponent(entry.id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'ลบรายการไม่สำเร็จ');
      setTripExpenses(previous => previous.filter(item => item.id !== entry.id));
      if (expenseEditingId === entry.id) {
        setExpenseEditingId(null);
        setExpenseForm(previous => ({ ...previous, amount: '', description: '' }));
      }
      await onChanged?.();
    } catch (error) {
      setExpenseError(error instanceof Error ? error.message : 'ลบรายการไม่สำเร็จ');
    }
  };

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
      const croppedFile = await convertImageToWebp(new File([croppedImageBlob], originalFileName || 'cover.jpg', { type: 'image/jpeg' }));
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
    setEditingStaffNames(Object.fromEntries(
      vans.filter(van => van.tripId === trip.id).map(van => {
        const staffSeat = van.seats.find(seat => seat.type === 'staff');
        return [van.id, van.staffName || staffSeat?.staffName || staffSeat?.passengerName || ''];
      })
    ));
    const parts = (trip.tripPeriod || '').split('||');
    const hasCustomDuration = parts.length > 1;
    const period = hasCustomDuration ? parts[1] : parts[0];
    const durationText = hasCustomDuration ? parts[0] : '';
    setEditForm({
      reviewTitle: trip.reviewTitle || '',
      reviewDescription: trip.reviewDescription || '',
      guideName: trip.guideName || '',
      name: trip.name,
      departureDate: trip.departureDate,
      returnDate: calculateEndDate(trip.departureDate, trip.durationDays),
      durationDays: trip.durationDays,
      cost: trip.cost,
      flashSalePrice: trip.flashSalePrice ?? '',
      depositAmount: trip.depositAmount ?? '',
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
    const updated = await onUpdate(editingTrip.id, { ...editForm, tripPeriod: finalTripPeriod, imageFile: editImageFile });
    if (updated) {
      await Promise.all(vans.filter(van => van.tripId === editingTrip.id).map(van => onUpdateVan(van.id, {
        staffName: (editingStaffNames[van.id] || '').trim(),
      })));
      setEditingTrip(null);
      setEditImageFile(null);
      setEditImagePreview(null);
      setEditingStaffNames({});
    }
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
    const url = `${window.location.origin}/payments?tripId=${encodeURIComponent(id)}&v=${Date.now()}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyManualLink = async (id: string) => {
    try {
      const response = await fetch(`/api/trips/${encodeURIComponent(id)}/manual-link`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'สร้างลิงก์ Manual ไม่สำเร็จ');
      const url = `${window.location.origin}/?tripId=${encodeURIComponent(id)}&mode=manual&token=${encodeURIComponent(data.token)}&v=${Date.now()}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(`manual:${id}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) { setExpenseError((error as Error).message); }
  };

  const [remoteTrips, setRemoteTrips] = useState<Trip[]>([]);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [page, setPage] = useState(() => typeof window === 'undefined' ? 1 : Math.max(1, Number(new URLSearchParams(window.location.search).get('page')) || 1));
  React.useEffect(() => {
    let active = true;
    setRemoteLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: '20', status: completed ? 'completed' : draft ? 'draft' : 'active', q: search });
    fetch(`/api/trips?${params.toString()}`, { cache: 'no-store' }).then(res => res.json()).then(result => {
      if (active && result.success) { setRemoteTrips(result.trips || []); setRemoteTotal(result.total || 0); }
    }).finally(() => { if (active) setRemoteLoading(false); });
    return () => { active = false; };
  }, [page, completed, draft, search]);
  const tripSource = remoteTrips;
  const filteredTrips = React.useMemo(() => {
    const filtered = tripSource.filter(trip => {
      const matchSearch =
        trip.name.toLowerCase().includes(search.toLowerCase()) ||
        trip.pickupPoint.toLowerCase().includes(search.toLowerCase()) ||
        (trip.tripPeriod && trip.tripPeriod.toLowerCase().includes(search.toLowerCase())) ||
        trip.departureDate.includes(search) ||
        formatThaiDate(trip.departureDate).includes(search);
      const matchNameFilter = selectedTripFilter ? trip.name === selectedTripFilter : true;
      return matchSearch && matchNameFilter;
    });
    if (!completed) {
      filtered.sort((a, b) =>
        (parseCalendarDay(a.departureDate) ?? Number.MAX_SAFE_INTEGER) -
        (parseCalendarDay(b.departureDate) ?? Number.MAX_SAFE_INTEGER) ||
        (a.departureTime || '').localeCompare(b.departureTime || '')
      );
    }
    return filtered;
  }, [tripSource, search, selectedTripFilter, completed]);
  const pageCount = Math.max(1, Math.ceil((remoteTotal || filteredTrips.length) / 20));
  const currentPage = Math.min(page, pageCount);
  const visibleTrips = filteredTrips;
  React.useEffect(() => { setPage(1); }, [search, selectedTripFilter, completed, draft]);
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', String(currentPage));
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [currentPage]);

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
          <Button type="button" onClick={handleCroppedImage} className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6 h-10 gap-2 shadow-sm theme-action">
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
                      <Input type="number" min={0} value={editForm.cost === 0 ? '' : editForm.cost} onChange={e => setEditForm({ ...editForm, cost: e.target.value === '' ? ('' as any) : Number(e.target.value) })} className="h-10 text-sm font-bold text-violet-700" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">ราคา Flash Sale ช่วง 7 วันสุดท้าย (บาท)</label>
                    <Input type="number" min={0} step="0.01" value={editForm.flashSalePrice} onChange={e => setEditForm({ ...editForm, flashSalePrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="เว้นว่างถ้าไม่จัด Flash Sale" className="h-10 text-sm font-bold text-amber-700" />
                    <p className="mt-1.5 text-[11px] text-slate-500">จะแสดงอัตโนมัติเมื่อเหลือไม่เกิน 7 วัน และลูกค้าต้องชำระเต็มจำนวน</p>
                  </div>

                  <DepositField cost={Number(editForm.cost) || 0} value={editForm.depositAmount} onChange={value => setEditForm({ ...editForm, depositAmount: value })} />

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

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                  <CardTitle className="text-sm text-violet-700">สตาฟประจำรถ</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {vans.filter(van => van.tripId === editingTrip.id).length === 0 ? (
                    <p className="text-xs text-slate-400">ทริปนี้ยังไม่มีรถตู้</p>
                  ) : vans.filter(van => van.tripId === editingTrip.id).map(van => (
                    <div key={van.id} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] items-center gap-2">
                      <label htmlFor={`trip-staff-${van.id}`} className="text-xs font-bold text-slate-600">รถตู้คันที่ {van.vanNumber}</label>
                      <Input
                        id={`trip-staff-${van.id}`}
                        value={editingStaffNames[van.id] || ''}
                        onChange={e => setEditingStaffNames(prev => ({ ...prev, [van.id]: e.target.value }))}
                        placeholder="ชื่อสตาฟประจำรถ"
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <ReviewCopyFields perTrip value={editForm} onChange={copy => setEditForm({ ...editForm, ...copy })} />
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setEditingTrip(null)} className="h-10 px-6 font-bold">
                  ยกเลิก
                </Button>
                <Button type="submit" className="h-10 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2 shadow-md theme-action">
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
              <ReviewCopyFields perTrip value={form} onChange={copy => setForm({ ...form, ...copy })} />
              
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
                       <Input type="number" min={0} value={form.cost === 0 ? '' : form.cost} onChange={e => setForm({ ...form, cost: e.target.value === '' ? '' : Number(e.target.value) })} className="h-10 text-sm font-bold text-violet-700" />
                    </div>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">ราคา Flash Sale ช่วง 7 วันสุดท้าย (บาท)</label>
                    <Input type="number" min={0} step="0.01" value={form.flashSalePrice} onChange={e => setForm({ ...form, flashSalePrice: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="เว้นว่างถ้าไม่จัด Flash Sale" className="h-10 text-sm font-bold text-amber-700" />
                    <p className="mt-1.5 text-[11px] text-slate-500">จะแสดงอัตโนมัติเมื่อเหลือไม่เกิน 7 วัน และลูกค้าต้องชำระเต็มจำนวน</p>
                  </div>

                  <DepositField cost={Number(form.cost) || 0} value={form.depositAmount} onChange={value => setForm({ ...form, depositAmount: value })} />

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
                <Button type="submit" className="h-10 px-6 bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2 shadow-md theme-action">
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



  const expenseTotalSatang = expenseTrip ? tripExpenses.reduce((sum, entry) => sum + entry.amountSatang, 0) : 0;
  const paidRevenueSatang = expenseTrip ? tripPayments.reduce((sum, payment) => sum + payment.paidSatang, 0) : 0;
  const creditRevenueSatang = expenseTrip ? tripPayments.reduce((sum, payment) => sum + payment.creditUsedSatang, 0) : 0;
  const cashRevenueSatang = expenseTrip ? tripPayments.reduce((sum, payment) => sum + payment.cashPaidSatang, 0) : 0;
  const outstandingRevenueSatang = expenseTrip ? tripPayments.reduce((sum, payment) => sum + Math.max(0, payment.balanceSatang), 0) : 0;
  const customerSeatTotal = expenseTrip ? vans.filter(van => van.tripId === expenseTrip.id).reduce((sum, van) => sum + van.seats.filter(seat => seat.type === 'customer').length, 0) : 0;
  const soldSeatCount = expenseTrip ? vans.filter(van => van.tripId === expenseTrip.id).reduce((sum, van) => sum + van.seats.filter(seat => seat.type === 'customer' && ['booked', 'pending'].includes(seat.status)).length, 0) : 0;
  const availableSeatCount = Math.max(0, customerSeatTotal - soldSeatCount);
  const currentProfitSatang = paidRevenueSatang - expenseTotalSatang;
  const flashSaleFloorSatang = availableSeatCount > 0 ? Math.ceil(Math.max(0, expenseTotalSatang - paidRevenueSatang * 0.93) / availableSeatCount / 0.93) : 0;

  return (
    <div className="space-y-6" data-draft-view={draft ? 'true' : undefined}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-600" />
            {completed ? 'ทริปที่จบไปแล้ว' : 'ทริปที่เปิดรับจอง'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{completed ? 'ดูทริปที่ปิดแล้ว หรือเปิดสวิตช์เพื่อย้ายกลับไปจัดการทริป' : 'จัดการทริป, ดูยอดจอง และแชร์ลิ้งก์รับสมัคร'}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto shrink-0">
          {uniqueTripNames.length > 0 && (
            <select
              value={selectedTripFilter}
              onChange={e => setSelectedTripFilter(e.target.value)}
              className="w-full sm:w-48 h-9 px-3 bg-slate-50 border border-slate-200 text-xs rounded-lg font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            >
              <option value="">-- ทุกทริป --</option>
              {uniqueTripNames.map(name => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-pulse" />
            <Input
              type="text"
              placeholder="ค้นหาชื่อทริป, วันที่, จุดขึ้นรถ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 bg-slate-50 border-slate-200 text-xs rounded-lg"
            />
          </div>
          {!completed && <Button onClick={() => setIsCreating(true)} className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white h-9 shadow-sm gap-1.5 text-xs font-bold rounded-lg theme-action">
            <Plus className="w-4 h-4" /> สร้างทริปใหม่
          </Button>}
        </div>
      </div>

      {remoteLoading ? (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl shadow-sm text-sm text-slate-400">กำลังโหลดรายการทริป...</div>
      ) : remoteTotal === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Compass className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-sm font-bold text-slate-700 mb-1">{completed ? 'ยังไม่มีทริปที่จบไปแล้ว' : 'ยังไม่มีทริปที่เปิดรับจอง'}</h3>
          <p className="text-xs text-slate-400 mb-4">{completed ? 'เมื่อปิดสวิตช์ในเมนูจัดการทริป ทริปจะย้ายมาแสดงที่นี่' : 'สร้างทริปใหม่ หรือเปิดทริปจากเมนูทริปที่จบไปแล้ว'}</p>
          {!completed && <Button onClick={() => setIsCreating(true)} variant="outline" className="h-9 text-xs font-bold border-violet-200 text-violet-600 hover:bg-violet-50">
            สร้างทริปใหม่ตอนนี้
          </Button>}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col items-center justify-center text-slate-400 gap-2">
          <Search className="w-10 h-10 opacity-20" />
          <p className="font-semibold text-sm">ไม่พบทริปเดินทางที่คุณค้นหา</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
          {visibleTrips.map((trip, idx) => {
            const theme = getTripTheme(idx);
            const tripVans = vans.filter(v => v.tripId === trip.id);
            let total = 0, occupied = 0;
            tripVans.forEach(van => van.seats.forEach(s => {
              if (s.type === 'customer' || s.type === 'staff') { total++; if (s.status !== 'available') occupied++; }
            }));
            const vacant = total - occupied;
            const pct = total > 0 ? Math.round((occupied / total) * 100) : 0;

            return (
              <Card key={trip.id} className={cn("border-slate-200 shadow-sm transition hover:shadow-md group overflow-hidden flex flex-col border-l-4", theme.borderLeft, theme.cardHover)}>
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
                        <h4 className={cn("font-bold text-base leading-tight transition flex items-center gap-2", theme.titleColor)}>
                          <span className={cn("w-2 h-2 rounded-full shrink-0", theme.dotBg)} />
                          <span>{trip.name}</span>
                        </h4>
                        <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" /> {formatThaiDate(trip.departureDate)}
                          {trip.tripPeriod && <span className="text-slate-400 font-normal">({trip.tripPeriod.split('||').pop()})</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={cn("text-lg font-black tracking-tight", theme.priceColor)}>฿{trip.cost.toLocaleString()}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          {(trip.tripPeriod || '').includes('||') 
                            ? (trip.tripPeriod || '').split('||')[0] 
                            : `${Math.max(1, trip.durationDays - 1)} วัน`}
                        </div>
                      </div>
                    </div>
                    
                     <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                       <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> ออก {trip.departureTime} น.</span>
                       <span className="text-slate-300">|</span>
                       <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-500" /> {trip.pickupPoint}</span>
                     </div>

                     <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2.5">
                       <div className="text-[10px] font-bold uppercase tracking-wide text-violet-500 mb-1.5">สตาฟประจำรถ</div>
                       <div className="space-y-1.5">
                         {tripVans.length > 0 ? tripVans.map(van => {
                           const staffName = van.staffName || van.seats.find(seat => seat.type === 'staff')?.staffName;
                           return (
                             <div key={van.id} className="flex items-center justify-between gap-3 text-[11px]">
                               <span className="font-semibold text-slate-600">รถตู้ {van.vanNumber}</span>
                               <span className={cn("font-bold text-right", staffName ? "text-slate-700" : "text-slate-400")}>{staffName || 'ยังไม่ได้ระบุ'}</span>
                             </div>
                           );
                         }) : <span className="text-[11px] text-slate-400">ยังไม่มีรถตู้</span>}
                       </div>
                     </div>

                     <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                      <span className="text-xs font-semibold text-slate-600">{trip.status === 'cancelled' ? 'ยกเลิกทริปแล้ว' : trip.status === 'completed' ? 'ทริปที่จบไปแล้ว' : 'เปิดรับจอง'}</span>
                      <button
                        type="button"
                        role="switch"
                         aria-checked={trip.status === 'active' && Number(trip.cost) > 0}
                        aria-label={`เปิดรับจองทริป ${trip.name}`}
                        disabled={updatingStatusId !== null || !canToggleCompleted || trip.status === 'cancelled'}
                        title={!canToggleCompleted ? 'ต้องมีสิทธิ์ "ทริปที่จบไปแล้ว" จึงจะเปลี่ยนสถานะได้' : undefined}
                        onClick={async () => {
                          if (!canToggleCompleted) return;
                          setUpdatingStatusId(trip.id);
                          try {
                          await onStatusChange(trip.id, trip.status === 'draft' || Number(trip.cost) <= 0 || trip.status === 'completed' || trip.status === 'cancelled' ? 'active' : 'completed');
                          } finally {
                            setUpdatingStatusId(null);
                          }
                        }}
                        className={cn("flex items-center gap-2 text-xs font-bold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-violet-600", !canToggleCompleted && "cursor-not-allowed")}
                      >
                        <span>{updatingStatusId === trip.id ? 'กำลังบันทึก...' : trip.status === 'cancelled' ? 'ยกเลิกแล้ว' : trip.status === 'completed' ? 'ปิด' : 'เปิด'}</span>
                        <span className={cn('flex h-6 w-11 items-center rounded-full p-0.5 transition-colors', trip.status === 'completed' ? 'bg-slate-300' : 'bg-emerald-500')}>
                          <span className={cn('h-5 w-5 rounded-full bg-white shadow transition-transform', trip.status === 'completed' ? 'translate-x-0' : 'translate-x-5')} />
                        </span>
                      </button>
                    </div>

                    {trip.status === 'active' && <button type="button" disabled={updatingStatusId !== null} onClick={() => void openCancelPreview(trip)} className="mt-2 w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50">ยกเลิกทริปและสร้างเครดิตคืน</button>}

                    <div className="flex items-end justify-between mt-auto pt-2">
                      <div className="flex-1 max-w-[200px]">
                        <div className="flex items-center justify-between mb-1.5">
                          <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0 border", theme.badgeBg)}>มี {tripVans.length} รถตู้</Badge>
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
                          onClick={() => void openExpense(trip)}
                          className="flex h-8 items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100"
                          title="บันทึกค่าใช้จ่ายของทริป"
                        >
                          <ReceiptText className="h-3.5 w-3.5" />
                          <span className="hidden 2xl:inline">บันทึกค่าใช้จ่าย</span>
                        </button>
                        <button
                          onClick={() => copyLink(trip.id)}
                          className={cn("flex items-center justify-center gap-1.5 px-3 h-8 rounded-lg border transition text-[11px] font-bold",
                            copiedId === trip.id ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : theme.shareBtn
                          )}
                        >
                          {copiedId === trip.id ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                          {copiedId === trip.id ? 'คัดลอกลิ้งก์แล้ว' : 'แชร์ลิ้งก์'}
                        </button>
                        <button onClick={() => void copyManualLink(trip.id)} className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 h-8 text-[11px] font-bold text-amber-700 transition hover:bg-amber-100" title="สร้างลิงก์จอง Manual ข้ามการชำระเงิน">
                          {copiedId === `manual:${trip.id}` ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                          {copiedId === `manual:${trip.id}` ? 'ลิงก์ Manual แล้ว' : 'ลิงก์ Manual'}
                        </button>
                        <button
                          onClick={() => startEditing(trip)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-400 transition"
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

      {pageCount > 1 && <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500"><span>แสดง {(currentPage - 1) * 20 + 1}-{Math.min(currentPage * 20, remoteTotal)} จาก {remoteTotal} ทริป</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border p-1.5 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><span>{currentPage} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} className="rounded-lg border p-1.5 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div></div>}

      {expenseTrip && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={() => !expenseBusy && setExpenseTrip(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="trip-expense-title" data-trip-expense-dialog className="grid max-h-[92vh] w-full max-w-5xl grid-cols-1 gap-4 overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-5 shadow-2xl sm:p-7 md:grid-cols-2 xl:grid-cols-4" onClick={event => event.stopPropagation()}>
            <style>{`[data-trip-expense-dialog] form > button[type="submit"] { order: 2; grid-column: 1 / -1 !important; height: 3rem; } [data-trip-expense-dialog] .flex.items-center.justify-between.gap-3 { flex-wrap: wrap; } [data-trip-expense-dialog] .flex.items-center.justify-between.gap-3 > p { order: 4; flex-basis: 100%; }`}</style>
            <div className="col-span-full mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3"><h3 id="trip-expense-title" className="text-2xl font-black tracking-tight text-slate-900">บันทึกค่าใช้จ่าย</h3><span className="rounded-full bg-violet-100 px-5 py-2 text-sm font-black text-violet-800">ทริป: {expenseTrip.name}</span></div>
              </div>
              <button type="button" onClick={() => setExpenseTrip(null)} disabled={expenseBusy} className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><X className="h-5 w-5" /></button>
            </div>
            <div className="order-3 mb-0 mt-5 rounded-3xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50 p-5 shadow-sm xl:col-span-4">
              <div className="flex items-center justify-between gap-3">
              <p className="mt-3 text-xs font-bold text-violet-700">ควรขายอย่างน้อย ฿{Math.ceil(tripExpenses.reduce((sum, entry) => sum + entry.amountSatang, 0) / 100 / Math.max(1, vans.filter(van => van.tripId === expenseTrip.id).reduce((sum, van) => sum + van.seats.filter(seat => seat.type === 'customer').length, 0) - 1) / 0.93).toLocaleString('th-TH')} / ที่ <span className="font-normal text-slate-500">(คำนวณจากยอดขายหลังหัก 7%) (คิดจาก 9 ที่นั่ง)</span></p>
                <span className="text-lg font-black text-fuchsia-900">ค่าใช้จ่ายรอบทริปนี้</span>
                <strong className="rounded-2xl bg-gradient-to-r from-fuchsia-600 to-rose-500 px-5 py-2 text-2xl font-black tabular-nums text-white shadow-sm">รวม {money(tripExpenses.reduce((sum, entry) => sum + entry.amountSatang, 0))}</strong>
              </div>
              {tripExpenses.length > 0 ? (
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto border-t border-rose-100 pt-3">
                  {tripExpenses.map(entry => (
                    <div key={entry.id} className="flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0"><p className="truncate font-bold text-slate-700">{entry.description || 'ไม่มีรายละเอียด'}</p><p className="mt-0.5 text-[10px] text-slate-500">{thaiDate(entry.date)} · {expenseCategories.find(category => category.id === entry.categoryId)?.name || 'ไม่ระบุหมวด'}</p></div>
                       <div className="flex shrink-0 items-center gap-2"><span className="font-black tabular-nums text-rose-700">{money(entry.amountSatang)}</span><button type="button" onClick={() => editExpense(entry)} className="rounded-lg p-1 text-slate-400 hover:bg-violet-50 hover:text-violet-600" title="แก้ไขรายการ"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void deleteExpense(entry)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="ลบรายการ"><Trash2 className="h-3.5 w-3.5" /></button></div>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-2 border-t border-rose-100 pt-3 text-[11px] text-slate-500">ยังไม่มีรายการค่าใช้จ่ายของทริปนี้</p>}
            </div>
            <div className="order-4 grid gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs md:col-span-2 xl:col-span-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-slate-500">รายรับที่ชำระแล้ว</p><p className="mt-1 text-lg font-black text-emerald-700">{money(paidRevenueSatang)}</p><p className="text-[10px] text-slate-500">เงิน {money(cashRevenueSatang)} · เครดิต {money(creditRevenueSatang)}</p></div>
              <div><p className="text-slate-500">ยอดค้างชำระ</p><p className="mt-1 text-lg font-black text-amber-700">{money(outstandingRevenueSatang)}</p><p className="text-[10px] text-slate-500">จากรายการจองเดิม</p></div>
              <div><p className="text-slate-500">กำไร/ขาดทุนปัจจุบัน</p><p className={cn('mt-1 text-lg font-black', currentProfitSatang >= 0 ? 'text-emerald-700' : 'text-rose-700')}>{currentProfitSatang < 0 ? '-' : ''}{money(Math.abs(currentProfitSatang))}</p><p className="text-[10px] text-slate-500">รายรับที่รับแล้ว - ค่าใช้จ่าย</p></div>
              <div><p className="text-slate-500">ที่นั่งว่าง</p><p className="mt-1 text-lg font-black text-violet-700">{availableSeatCount} ที่นั่ง</p><p className="text-[10px] text-slate-500">ขายแล้ว {soldSeatCount} / ทั้งหมด {customerSeatTotal}</p></div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 sm:col-span-2 lg:col-span-4"><p className="font-black text-amber-800">ราคา Flash Sale ขั้นต่ำที่แนะนำ: {availableSeatCount > 0 ? `฿${money(flashSaleFloorSatang)}` : 'ไม่มีที่นั่งว่าง'}</p><p className="mt-1 text-[10px] leading-relaxed text-amber-700">คำนวณจาก (ค่าใช้จ่ายรวม - (รายรับที่ชำระแล้ว × 0.93)) ÷ ที่นั่งว่าง ÷ 0.93 เพื่อหัก VAT 7% จากรายรับเดิมและราคาขายใหม่</p></div>
            </div>
            <form onSubmit={saveExpense} className="contents">
              <div className="contents">
                <label className="block text-xs font-bold text-slate-700">วันที่<input type="date" required value={expenseForm.date} onChange={event => setExpenseForm({ ...expenseForm, date: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" /></label>
                <label className="block text-xs font-bold text-slate-700">จำนวนเงิน (บาท)<input type="number" required min="0.01" step="0.01" value={expenseForm.amount} onChange={event => setExpenseForm({ ...expenseForm, amount: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold" /></label>
              </div>
              <label className="block text-xs font-bold text-slate-700">หมวดค่าใช้จ่าย<select required value={expenseForm.categoryId} onChange={event => setExpenseForm({ ...expenseForm, categoryId: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm"><option value="">เลือกหมวดค่าใช้จ่าย</option>{expenseCategories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label className="block text-xs font-bold text-slate-700">รายละเอียด<input required value={expenseForm.description} maxLength={300} onChange={event => setExpenseForm({ ...expenseForm, description: event.target.value })} placeholder="เช่น ค่าน้ำมันรถตู้ ค่าที่พัก ค่าอาหาร" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm" /></label>
              {expenseError && <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 md:col-span-2 xl:col-span-4">{expenseError}</p>}
              <button type="submit" disabled={expenseBusy || !expenseCategories.length} className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-sm font-black text-white shadow-lg shadow-violet-600/20 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-40 md:col-span-2 xl:col-span-4">{expenseBusy ? 'กำลังบันทึก...' : 'บันทึกค่าใช้จ่าย'}</button>
            </form>
          </div>
        </div>
      )}
      {cancelTrip && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => !cancelBusy && setCancelTrip(null)}>
          <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-xl font-black text-slate-900">ยืนยันยกเลิกทริป</h3><p className="mt-1 text-sm text-slate-500">{cancelTrip.name}</p></div>
              <button type="button" onClick={() => setCancelTrip(null)} disabled={cancelBusy} className="rounded-xl bg-slate-50 p-2 text-slate-400 hover:text-rose-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-5 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">ระบบจะยกเลิกการจองของทริปนี้ และสร้างเครดิตคืนให้ลูกค้าที่ชำระเงินแล้ว เครดิตมีอายุ 1 ปี</p>
            {cancelBusy ? <p className="py-8 text-center text-sm text-violet-600">กำลังโหลดรายชื่อลูกค้า…</p> : cancelError ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{cancelError}</p> : cancelRecipients.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">ไม่มีลูกค้าที่ชำระเงินแล้ว จึงไม่มีเครดิตที่ต้องคืน</p> : <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-slate-100 p-3">{cancelRecipients.map(recipient => <div key={`${recipient.name}-${recipient.amountSatang}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"><span className="min-w-0 truncate text-sm font-bold text-slate-700">{recipient.name}</span><span className="shrink-0 font-black text-emerald-700">฿{(recipient.amountSatang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span></div>)}</div>}
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setCancelTrip(null)} disabled={cancelBusy} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">กลับ</button><button type="button" disabled={cancelBusy || !!cancelError} onClick={async () => { setCancelBusy(true); try { await onCancel(cancelTrip.id); setCancelTrip(null); } finally { setCancelBusy(false); } }} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50">ยืนยันยกเลิกทริป</button></div>
          </div>
        </div>
      )}
      {cropperModal}
    </div>
  );
}

/** Deposit per seat. Blank = default 50%; shows the resulting balance. */
function DepositField({ cost, value, onChange }: { cost: number; value: number | ''; onChange: (value: number | '') => void }) {
  const deposit = value === '' || Number(value) <= 0 ? Math.ceil(cost * 100 / 2) / 100 : Number(value);
  const invalid = value !== '' && Number(value) > 0 && Number(value) >= cost;
  const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
      <label className="text-xs font-bold text-slate-700 block mb-1.5">ยอดมัดจำต่อท่าน (บาท)</label>
      <Input type="number" min={0} step="0.01" placeholder={`เว้นว่าง = 50% (฿${baht(Math.ceil(cost * 100 / 2) / 100)})`} value={value} onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))} className={cn('h-10 text-sm font-bold text-violet-700', invalid && 'border-rose-400')} />
      {invalid ? (
        <p className="mt-1.5 text-[11px] font-bold text-rose-600">ยอดมัดจำต้องน้อยกว่าค่าบริการ</p>
      ) : cost > 0 && (
        <p className="mt-1.5 text-[11px] text-slate-500">มัดจำ ฿{baht(deposit)} · ยอดคงเหลือชำระก่อนเดินทาง ฿{baht(Math.max(0, cost - deposit))} · ชำระเต็ม ฿{baht(cost)}</p>
      )}
    </div>
  );
}
