import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { dataStore } from '@/lib/dataStore';
import { adminWith, requireAdmin, requireOwnerOrAdmin } from '@/lib/adminAuth';
import { recordAudit } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineUserId = searchParams.get('lineUserId');
    const access = await requireOwnerOrAdmin(lineUserId, ['users', 'insurance', 'bookings']);
    if (access instanceof Response) return access;
    
    if (!lineUserId) {
      return NextResponse.json({ success: false, error: 'lineUserId is required' }, { status: 400 });
    }

    const { data: profile, error } = await dataStore
      .from('profiles')
      .select('*')
      .eq('lineUserId', lineUserId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
      throw error;
    }

    if (profile) return NextResponse.json({ success: true, profile });

    // Older users may have insurance fields stored on bookings but no profile row.
    // Reuse the latest booking data so migration/login never forces re-entry.
    const { data: booking } = await dataStore
      .from('bookings')
      .select('lineUserId, fullName, nickname, phone, nationalId, birthDate, emergencyName, emergencyPhone, allergies, medicalConditions')
      .eq('lineUserId', lineUserId)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ success: true, profile: booking || null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const access = await requireOwnerOrAdmin(typeof body.lineUserId === 'string' ? body.lineUserId : null, ['users']);
    if (access instanceof Response) return access;
    const {
      lineUserId,
      fullName,
      nickname,
      phone,
      nationalId,
      birthDate,
      emergencyName,
      emergencyPhone,
      allergies,
      medicalConditions,
    } = body;

    const requiredFields = {
      lineUserId,
      fullName,
      nickname,
      phone,
      nationalId,
      birthDate,
      emergencyName,
      emergencyPhone,
    };
    const missingFields = Object.entries(requiredFields)
      .filter(([, value]) => typeof value !== 'string' || !value.trim())
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'กรุณากรอกข้อมูลส่วนตัวให้ครบถ้วน',
        missingFields,
      }, { status: 400 });
    }

    const clean = (value: unknown) => String(value).trim();
    const cleanLineUserId = clean(lineUserId);
    const cleanFullName = clean(fullName);
    const cleanNickname = clean(nickname);
    const cleanPhone = clean(phone);
    const cleanNationalId = clean(nationalId);
    const cleanBirthDate = clean(birthDate);
    const cleanEmergencyName = clean(emergencyName);
    const cleanEmergencyPhone = clean(emergencyPhone);

    const profileData = {
      lineUserId: cleanLineUserId,
      fullName: cleanFullName,
      nickname: cleanNickname,
      phone: cleanPhone,
      nationalId: cleanNationalId,
      birthDate: cleanBirthDate,
      emergencyName: cleanEmergencyName,
      emergencyPhone: cleanEmergencyPhone,
      allergies: allergies || '',
      medicalConditions: medicalConditions || '',
    };

    const { error } = await dataStore
      .from('profiles')
      .upsert([profileData], { onConflict: 'lineUserId' });

    if (error) throw error;

    // Proactively sync the updated profile fields to all bookings of this user
    await dataStore
      .from('bookings')
      .update({
        fullName: cleanFullName,
        nickname: cleanNickname,
        phone: cleanPhone,
        nationalId: cleanNationalId,
        birthDate: cleanBirthDate,
        emergencyName: cleanEmergencyName,
        emergencyPhone: cleanEmergencyPhone,
        allergies: allergies || '',
        medicalConditions: medicalConditions || ''
      })
      .eq('lineUserId', lineUserId);

    if (access.isAdmin) {
      const actor = await adminWith(['users']);
      if (actor) await recordAudit(actor, { action: 'update', resource: 'customer-profile', resourceId: String(lineUserId), request, summary: `แก้ไขโปรไฟล์ลูกทริป ${fullName}` });
    }
    return NextResponse.json({ success: true, profile: profileData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
