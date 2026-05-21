import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: Request, props: RouteParams) {
  try {
    const { id } = await props.params;
    const body = await request.json();
    
    // Only allow updating specific fields
    const updates: any = {};
    if (body.role !== undefined) updates.role = body.role;
    if (body.isBlocked !== undefined) updates.isBlocked = body.isBlocked;
    if (body.note !== undefined) updates.note = body.note;

    const { data, error } = await supabase
      .from('admin_users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, adminUser: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, props: RouteParams) {
  try {
    const { id } = await props.params;
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
