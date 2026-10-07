'use client';

import React, { useState } from 'react';
import { TeamCard, defaultTeamCards } from '@/lib/homepageSettings';
import { supabase } from '@/lib/browserSupabase';
import { Users, Plus, Edit2, Trash2, Upload, Quote, Check, X } from 'lucide-react';

interface TeamCardsManagerProps {
  cards?: TeamCard[];
  onChange: (cards: TeamCard[]) => void;
}

export default function TeamCardsManager({ cards = defaultTeamCards, onChange }: TeamCardsManagerProps) {
  const currentCards = Array.isArray(cards) && cards.length > 0 ? cards : defaultTeamCards;

  const [isEditing, setIsEditing] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  
  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formMotto, setFormMotto] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const openAddForm = () => {
    setEditingCardId(null);
    setFormName('');
    setFormRole('');
    setFormImage('/logo/logov2.png');
    setFormMotto('');
    setIsEditing(true);
  };

  const openEditForm = (card: TeamCard) => {
    setEditingCardId(card.id);
    setFormName(card.name);
    setFormRole(card.role || '');
    setFormImage(card.image || '/logo/logov2.png');
    setFormMotto(card.motto || '');
    setIsEditing(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formMotto.trim()) return;

    if (editingCardId) {
      const updated = currentCards.map(c => 
        c.id === editingCardId
          ? { ...c, name: formName.trim(), role: formRole.trim(), image: formImage.trim() || '/logo/logov2.png', motto: formMotto.trim() }
          : c
      );
      onChange(updated);
    } else {
      const newCard: TeamCard = {
        id: `card-${Date.now()}`,
        name: formName.trim(),
        role: formRole.trim(),
        image: formImage.trim() || '/logo/logov2.png',
        motto: formMotto.trim(),
      };
      onChange([...currentCards, newCard]);
    }

    setIsEditing(false);
  };

  const handleDeleteCard = (id: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการ์ดนี้?')) {
      const updated = currentCards.filter(c => c.id !== id);
      onChange(updated);
    }
  };

  async function handleFileUpload(file?: File) {
    if (!file) return;
    setUploadError('');
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    if (!extensions[file.type] || file.size > 5 * 1024 * 1024) {
      setUploadError('เลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB');
      return;
    }
    setUploading(true);
    try {
      const path = `team/${crypto.randomUUID()}.${extensions[file.type]}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(path);
      setFormImage(data.publicUrl);
    } catch {
      setUploadError('อัปโหลดรูปไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally { setUploading(false); }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-600" />
            การ์ดชื่อ รูปภาพ & คติประจำใจ (Team Motto Cards)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            เพิ่มการ์ดแสดงรูปภาพ ชื่อ ตำแหน่ง และคติประจำใจของทีมงานหรือสมาชิกเพื่อนำไปโชว์ที่หน้าแรกของเว็บไซต์
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={openAddForm}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            เพิ่มการ์ดใหม่
          </button>
        )}
      </div>

      {isEditing && (
        <form onSubmit={handleSaveForm} className="bg-violet-50/60 border border-violet-200 rounded-2xl p-4 space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-violet-200/60 pb-2">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-violet-600" />
              {editingCardId ? 'แก้ไขข้อมูลการ์ด' : 'เพิ่มการ์ดใหม่'}
            </h4>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">ชื่อสมาชิก / ฉายา <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={formName}
                placeholder="เช่น พี่อาร์ต (Art)"
                onChange={e => setFormName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">ตำแหน่ง / สโลแกนสั้น</label>
              <input
                type="text"
                value={formRole}
                placeholder="เช่น ผู้ก่อตั้ง / ผู้นำทริปสายลุย"
                onChange={e => setFormRole(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">รูปภาพโปรไฟล์</label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {formImage && (
                <img src={formImage} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-violet-300 shadow-sm shrink-0 bg-white" />
              )}
              <div className="flex-1 w-full space-y-1">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploading}
                  onChange={e => { void handleFileUpload(e.target.files?.[0]); e.target.value = ''; }}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:font-bold file:text-white hover:file:bg-violet-700 cursor-pointer disabled:opacity-50"
                />
                <input
                  type="url"
                  value={formImage}
                  placeholder="หรือวาง URL รูปภาพ https://..."
                  onChange={e => setFormImage(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-500 mt-1"
                />
              </div>
            </div>
            {uploading && <p className="text-xs text-violet-700 font-medium animate-pulse flex items-center gap-1"><Upload className="w-3 h-3 animate-bounce" /> กำลังอัปโหลดรูปภาพ...</p>}
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">คติประจำใจ / คำคมสายลุย <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={2}
              value={formMotto}
              placeholder="เช่น เดินป่าไม่เคยย้อนกลับ ด่าไปเดินไป แต่ใจต้องเกินร้อย!"
              onChange={e => setFormMotto(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              บันทึกการ์ด
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {currentCards.map((card) => (
          <div
            key={card.id}
            className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-sm flex items-start gap-3 relative group hover:border-violet-300 transition"
          >
            <img
              src={card.image || '/logo/logov2.png'}
              alt={card.name}
              className="w-12 h-12 rounded-full object-cover border border-violet-200 shrink-0 bg-slate-50"
            />
            <div className="flex-1 min-w-0 pr-14">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-black text-slate-900 truncate">{card.name}</h4>
                {card.role && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full truncate">
                    {card.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 italic mt-1 leading-relaxed break-words font-medium">
                "{card.motto}"
              </p>
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-1">
              <button
                type="button"
                onClick={() => openEditForm(card)}
                className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                title="แก้ไข"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCard(card.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="ลบการ์ด"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
