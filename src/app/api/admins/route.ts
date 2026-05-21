import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const { data: admins, error } = await supabase
      .from('admins')
      .select('id, username, name, permissions, isBlocked, createdAt')
      .order('createdAt', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ success: true, admins: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, admins });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, name, permissions } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ success: false, error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('admins')
      .insert([{
        username,
        password: hashedPassword,
        name,
        permissions: permissions || [],
        isBlocked: false
      }])
      .select('id, username, name, permissions, isBlocked, createdAt')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, admin: data });
  } catch (error: any) {
    if (error.code === '23505') {
      return NextResponse.json({ success: false, error: 'Username นี้ถูกใช้งานแล้ว' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
