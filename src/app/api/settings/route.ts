import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

const SETTINGS_FILE = 'settings/footer.json';

const defaultSettings = {
  footer_description: 'กลุ่มเดินป่าและเดินทางสายผจญภัย มุ่งสร้างสรรค์ทริปท่องเที่ยวธรรมชาติที่คุ้มค่า สนุกสนาน มิตรภาพที่ยั่งยืน และปลอดภัยทุกก้าวเดิน',
  contact_phone: '+66 89 123 4567',
  contact_email: 'support@dapaidernpai.com',
  contact_location: 'เชียงใหม่ / กรุงเทพฯ, ประเทศไทย',
  copyright_year: new Date().getFullYear().toString()
};

export async function GET() {
  try {
    const { data, error } = await supabase.storage.from('images').download(SETTINGS_FILE);
    if (error) {
      return NextResponse.json({ success: true, settings: defaultSettings });
    }
    const text = await data.text();
    const settings = JSON.parse(text);
    return NextResponse.json({ success: true, settings: { ...defaultSettings, ...settings } });
  } catch (err: any) {
    return NextResponse.json({ success: true, settings: defaultSettings });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { error } = await supabase.storage.from('images').upload(SETTINGS_FILE, JSON.stringify(body), {
      contentType: 'application/json',
      upsert: true
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
