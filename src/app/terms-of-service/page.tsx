import React from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 60; // revalidate every 60 seconds

export default async function TermsOfServicePage() {
  let content = 'ไม่มีข้อมูลเงื่อนไขการให้บริการ';
  
  try {
    const { data, error } = await supabase.storage.from('images').download('settings/footer.json');
    if (!error && data) {
      const text = await data.text();
      const settings = JSON.parse(text);
      if (settings.terms_of_service) {
        content = settings.terms_of_service;
      }
    }
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-800 font-bold transition">
            <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าหลัก
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-12">
          <h1 className="text-3xl font-black text-slate-900 mb-8 border-b border-slate-100 pb-6">เงื่อนไขการให้บริการ (Terms of Service)</h1>
          <div 
            className="max-w-none whitespace-pre-wrap text-sm leading-loose text-slate-700"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}
