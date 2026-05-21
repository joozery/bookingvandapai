import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    
    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.permissions !== undefined) updates.permissions = body.permissions;
    if (body.isBlocked !== undefined) updates.isBlocked = body.isBlocked;
    
    if (body.password) {
      updates.password = await bcrypt.hash(body.password, 10);
    }

    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', id)
      .select('id, username, name, permissions, isBlocked, createdAt')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, admin: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
