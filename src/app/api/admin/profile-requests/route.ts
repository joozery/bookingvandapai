import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: files, error: listError } = await supabase.storage.from('images').list('profile-edits');
    if (listError) throw listError;

    const requests = [];
    for (const file of files || []) {
      if (!file.name.endsWith('.json')) continue;
      
      const { data: fileData, error: dlError } = await supabase.storage.from('images').download(`profile-edits/${file.name}`);
      if (dlError) continue;
      
      try {
        const text = await fileData.text();
        const json = JSON.parse(text);
        requests.push(json);
      } catch (e) {
        console.error('Error parsing json', e);
      }
    }

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, lineUserId, payload } = await request.json();
    
    if (action === 'approve') {
      // 1. Update profiles table
      const { error: updateError } = await supabase
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
      await supabase
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
      await supabase.storage.from('images').remove([`profile-edits/${lineUserId}.json`]);
      
      return NextResponse.json({ success: true });
    } else if (action === 'reject') {
      // Just delete the request file
      await supabase.storage.from('images').remove([`profile-edits/${lineUserId}.json`]);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
