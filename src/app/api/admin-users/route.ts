import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: adminUsers, error } = await supabase
      .from('admin_users')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) {
      // If table doesn't exist, return empty array for now
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, adminUsers: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, adminUsers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lineUserId, role, note } = body;

    if (!lineUserId) {
      return NextResponse.json({ success: false, error: 'กรุณาระบุ LINE User ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('admin_users')
      .insert([{
        lineUserId,
        role: role || 'staff',
        note: note || '',
        isBlocked: false
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, adminUser: data });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'LINE User ID นี้มีในระบบจัดการสิทธิแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
