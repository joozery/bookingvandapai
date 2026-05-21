require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: b, error: e1 } = await supabase.from('bookings').select('id').limit(1);
  if (!b || b.length === 0) return console.log('No bookings found');
  const id = b[0].id;
  
  // Try to update to cancel_pending
  const { error } = await supabase.from('bookings').update({ status: 'cancel_pending' }).eq('id', id);
  console.log('Update error:', error);
  
  // Revert back
  if (!error) {
    await supabase.from('bookings').update({ status: 'approved' }).eq('id', id);
  }
}
check();
