import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { dataStore } from '@/lib/dataStore';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lineUserId } = body;

    if (!lineUserId) {
      return NextResponse.json({ success: false, error: 'lineUserId is required' }, { status: 400 });
    }
    // Customers may only submit edit requests for their own profile.
    const access = await requireOwnerOrAdmin(String(lineUserId), []);
    if (access instanceof Response) return access;

    const fileName = `profile-edits/${lineUserId}.json`;
    const payload = {
      ...body,
      requestedAt: new Date().toISOString()
    };

    const { error } = await dataStore.storage.from('images').upload(fileName, JSON.stringify(payload), {
      contentType: 'application/json',
      upsert: true
    });

    if (error) {
      console.error('Storage error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, pending: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
