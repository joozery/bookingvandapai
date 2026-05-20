import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // Delete all trips. Because of ON DELETE CASCADE, this will also wipe out vans and bookings.
    const { error } = await supabase.from('trips').delete().neq('id', 'dummy');
    if (error) throw error;
    
    return NextResponse.json({ success: true, message: 'Database reset successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
