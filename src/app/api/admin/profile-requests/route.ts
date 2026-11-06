import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { dataStore } from '@/lib/dataStore';
import { requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';

export async function GET(request: Request) {
  const admin = await requireAdmin(['users']);
  if (admin instanceof Response) return admin;
  try {
    const { data: files, error: listError } = await dataStore.storage.from('images').list('profile-edits');
    if (listError) throw listError;

    const jsonFiles = (files || []).filter(file => file.name.endsWith('.json'));
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get('page') || 1));
    const pageSize = 20;
    const requests: any[] = [];
    for (const file of jsonFiles.slice((page - 1) * pageSize, page * pageSize)) {
      const { data: fileData, error: dlError } = await dataStore.storage.from('images').download(`profile-edits/${file.name}`);
      if (dlError) continue;
      
      try {
        const text = await fileData.text();
        const json = JSON.parse(text);
        requests.push(json);
      } catch (e) {
        console.error('Error parsing json', e);
      }
    }

    return NextResponse.json({ success: true, requests, total: jsonFiles.length, page, pageSize });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(['users']);
  if (admin instanceof Response) return admin;
  try {
    const { action, lineUserId, payload } = await request.json();
    
    if (action === 'approve') {
      // 1. Update profiles table
      const { error: updateError } = await dataStore
        .from('profiles')
        .update({
          fullName: payload.fullName,
          nickname: payload.nickname,
          phone: payload.phone,
          nationalId: payload.nationalId,
          birthDate: payload.birthDate,
          emergencyName: payload.emergencyName,
          emergencyPhone: payload.emergencyPhone,
          allergies: payload.allergies || '',
          medicalConditions: payload.medicalConditions || '',
        })
        .eq('lineUserId', lineUserId);
        
      if (updateError) throw updateError;
      
      // 2. Proactively sync the updated profile fields to all bookings of this user
      await dataStore
        .from('bookings')
        .update({
          fullName: payload.fullName,
          nickname: payload.nickname,
          phone: payload.phone,
          nationalId: payload.nationalId,
          birthDate: payload.birthDate,
          emergencyName: payload.emergencyName,
          emergencyPhone: payload.emergencyPhone,
          allergies: payload.allergies || '',
          medicalConditions: payload.medicalConditions || ''
        })
        .eq('lineUserId', lineUserId);
        
      // 3. Delete the request file
      await dataStore.storage.from('images').remove([`profile-edits/${lineUserId}.json`]);
      
      await recordAudit(admin, { action: 'update', resource: 'customer-profile', resourceId: lineUserId, request, summary: `อนุมัติคำขอแก้ไขโปรไฟล์ลูกทริป ${payload?.fullName || lineUserId}`, after: payload && typeof payload === 'object' ? payload : null });
      return NextResponse.json({ success: true });
    } else if (action === 'reject') {
      // Just delete the request file
      await dataStore.storage.from('images').remove([`profile-edits/${lineUserId}.json`]);
      await recordAudit(admin, { action: 'update', resource: 'customer-profile', resourceId: lineUserId, request, summary: `ปฏิเสธคำขอแก้ไขโปรไฟล์ลูกทริป ${lineUserId}` });
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
