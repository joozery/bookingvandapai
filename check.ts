import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: trips, error: tripsError } = await supabase.from('trips').select('*');
  console.log('Trips:', trips);
  if (tripsError) console.error('Trips Error:', tripsError);
  
  const { data: vans, error: vansError } = await supabase.from('vans').select('*');
  console.log('Vans:', vans);
  if (vansError) console.error('Vans Error:', vansError);
}

check();
