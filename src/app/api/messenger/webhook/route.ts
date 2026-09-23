import { supabase } from '@/lib/supabase';
import { referralTripId, tripReply, verifyMessengerSignature, type MessengerEvent } from '@/lib/messenger';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const token = process.env.MESSENGER_VERIFY_TOKEN;
  if (!token) return new Response('Webhook not configured', { status: 503 });
  const query = new URL(request.url).searchParams;
  if (query.get('hub.mode') !== 'subscribe' || query.get('hub.verify_token') !== token || !query.has('hub.challenge')) {
    return new Response('Forbidden', { status: 403 });
  }
  return new Response(query.get('hub.challenge'), { headers: { 'Content-Type': 'text/plain' } });
}

export async function POST(request: Request) {
  const secret = process.env.MESSENGER_APP_SECRET;
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  const pageId = process.env.MESSENGER_PAGE_ID;
  const version = process.env.MESSENGER_GRAPH_API_VERSION;
  if (!secret || !token || !pageId || !version || !/^v\d+\.\d+$/.test(version)) {
    return new Response('Webhook not configured', { status: 503 });
  }
  const raw = await request.text();
  if (!verifyMessengerSignature(raw, request.headers.get('x-hub-signature-256'), secret)) {
    return new Response('Forbidden', { status: 403 });
  }
  let body;
  try { body = JSON.parse(raw); } catch { return new Response('Invalid JSON', { status: 400 }); }
  if (body?.object !== 'page' || !Array.isArray(body.entry)) return new Response('Ignored');
  try {
    for (const entry of body.entry) {
      if (entry?.id !== pageId || !Array.isArray(entry.messaging)) continue;
      for (const event of entry.messaging as MessengerEvent[]) {
        if (!event || event.recipient?.id !== pageId || !/^\d+$/.test(event.sender?.id || '')) continue;
        const tripId = referralTripId(event);
        if (!tripId) continue;
        const { data: trip, error } = await supabase.from('trips')
          .select('name, departureDate, departureTime, pickupPoint, status').eq('id', tripId).maybeSingle();
        if (error) throw new Error('Trip lookup failed');
        const response = await fetch(`https://graph.facebook.com/${version}/${pageId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: { id: event.sender!.id }, messaging_type: 'RESPONSE', message: { text: tripReply(trip) } }),
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error('Messenger send failed');
      }
    }
    return new Response('EVENT_RECEIVED');
  } catch {
    // Never log tokens, signed request bodies, or private conversation data.
    console.error('Messenger webhook processing failed');
    return new Response('Processing failed', { status: 500 });
  }
}
