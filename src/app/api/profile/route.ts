import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineUserId = searchParams.get('lineUserId');
    
    if (!lineUserId) {
      return NextResponse.json({ success: false, error: 'lineUserId is required' }, { status: 400 });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('lineUserId', lineUserId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
      throw error;
    }

    return NextResponse.json({ success: true, profile: profile || null });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    if (!lineUserId || !fullName || !nickname || !phone || !nationalId || !birthDate || !emergencyName || !emergencyPhone) {
      return NextResponse.json({ success: false, error: 'Please provide all required profile fields' }, { status: 400 });
    }

    const profileData = {
      lineUserId,
      fullName,
      nickname,
      phone,
      nationalId,
      birthDate,
      emergencyName,
      emergencyPhone,
      allergies: allergies || '',
      medicalConditions: medicalConditions || '',
    };

    const { error } = await supabase
      .from('profiles')
      .upsert([profileData], { onConflict: 'lineUserId' });

    if (error) throw error;

    // Proactively sync the updated profile fields to all bookings of this user
    await supabase
      .from('bookings')
      .update({
        fullName,
        nickname,
        phone,
        nationalId,
        birthDate,
        emergencyName,
        emergencyPhone,
        allergies: allergies || '',
        medicalConditions: medicalConditions || ''
      })
      .eq('lineUserId', lineUserId);

    return NextResponse.json({ success: true, profile: profileData });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
