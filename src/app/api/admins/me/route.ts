import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { recordAudit } from '@/lib/audit';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminId = (session.user as any).id;
    const body = await request.json();
    const { name, password, avatar_url } = body;

    const updates: any = {};
    if (name) updates.name = name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, error: 'ไม่มีข้อมูลให้บันทึก' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', adminId)
      .select('id, name, avatar_url')
      .single();

    if (error) throw error;

    const user = session.user as { name?: string; username?: string };
    await recordAudit({ id: adminId, name: String(data?.name || user.name || ''), username: String(user.username || '') }, {
      action: 'update', resource: 'admin', resourceId: adminId, request,
      summary: `แก้ไขโปรไฟล์ของตัวเอง${[updates.name && 'ชื่อ', updates.avatar_url !== undefined && 'รูป', updates.password && 'รหัสผ่าน'].filter(Boolean).map(x => ` · ${x}`).join('')}`,
      changes: [...(updates.name ? [{ field: 'ชื่อ', before: null, after: updates.name }] : []), ...(updates.password ? [{ field: 'รหัสผ่าน', before: '•••', after: 'เปลี่ยนใหม่ (ซ่อน)' }] : [])],
    });
    return NextResponse.json({ success: true, admin: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
