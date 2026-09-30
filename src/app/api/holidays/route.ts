import { NextResponse } from 'next/server';
import { getSyncedHolidays } from '@/lib/holidaySync';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getSyncedHolidays();
  return NextResponse.json({ success: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });
}
