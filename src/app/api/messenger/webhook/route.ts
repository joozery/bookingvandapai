import { supabase } from '@/lib/supabase';
import { referralTripId, tripReply, verifyMessengerSignature, type MessengerEvent } from '@/lib/messenger';
import { createMessengerLogger, safeErrorFields } from '@/lib/messengerLogging';
import { countAvailableSeats } from '@/lib/seatAvailability';

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
  const redactions = Object.entries(process.env)
    .filter(([key]) => /TOKEN|SECRET|PASSWORD|KEY|DATABASE_URL/i.test(key))
    .map(([, value]) => value || '').filter(Boolean);
  const log = createMessengerLogger(redactions);
  log('post_received');
  const secret = process.env.MESSENGER_APP_SECRET;
  const token = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
  const pageId = process.env.MESSENGER_PAGE_ID;
  const version = process.env.MESSENGER_GRAPH_API_VERSION;
  if (!secret || !token || !pageId || !version || !/^v\d+\.\d+$/.test(version)) {
    log('configuration_invalid', {}, 'error');
    return new Response('Webhook not configured', { status: 503 });
  }
  const raw = await request.text();
  if (!verifyMessengerSignature(raw, request.headers.get('x-hub-signature-256'), secret)) {
    log('signature_validation_failed', {}, 'error');
    return new Response('Forbidden', { status: 403 });
  }
  let body;
  try { body = JSON.parse(raw); } catch {
    log('invalid_json', {}, 'error');
    return new Response('Invalid JSON', { status: 400 });
  }
  if (body?.object !== 'page' || !Array.isArray(body.entry)) {
    log('payload_ignored', { reason: 'not_page_or_missing_entries' });
    return new Response('Ignored');
  }
  let context: Record<string, unknown> = {};
  let operation = 'event_processing';
  try {
    for (const entry of body.entry) {
      context = { entryId: entry?.id };
      if (entry?.id !== pageId || !Array.isArray(entry.messaging)) {
        log('entry_skipped', { ...context, reason: entry?.id !== pageId ? 'page_id_mismatch' : 'missing_messaging_array' });
        continue;
      }
      for (const event of entry.messaging as MessengerEvent[]) {
        operation = 'event_processing';
        if (typeof event?.sender?.id === 'string') redactions.push(event.sender.id);
        context = { entryId: entry.id, recipientId: event?.recipient?.id,
          hasSenderId: !!event?.sender?.id,
          eventType: event?.referral ? 'referral' : event?.postback?.referral ? 'postback_referral' : event?.postback ? 'postback' : 'unknown' };
        log('event_received', context);
        if (!event || event.recipient?.id !== pageId || !/^\d+$/.test(event.sender?.id || '')) {
          log('event_skipped', { ...context, reason: !event ? 'missing_event' : event.recipient?.id !== pageId ? 'recipient_page_id_mismatch' : 'missing_or_invalid_sender_id' });
          continue;
        }
        const tripId = referralTripId(event);
        const ref = event.referral?.ref || event.postback?.referral?.ref;
        log('referral_parsed', { ...context, ref: typeof ref === 'string' ? ref : null, parsed: !!tripId, tripId });
        if (!tripId) {
          log('event_skipped', { ...context, reason: event.message?.is_echo ? 'message_echo' : 'missing_or_invalid_trip_ref' });
          continue;
        }
        context = { ...context, tripId };
        operation = 'trip_lookup';
        const { data: trip, error } = await supabase.from('trips')
          .select('name, departureDate, departureTime, pickupPoint, status, cost').eq('id', tripId).maybeSingle();
        if (error) {
          log('trip_lookup_failed', { ...context, ...safeErrorFields(error) }, 'error');
          throw new Error('Trip lookup failed');
        }
        log('trip_lookup_result', { ...context, found: !!trip });
        let availableSeats: number | null = null;
        if (trip && trip.status !== 'completed') {
          try {
            const { data: vans, error: vansError } = await supabase.from('vans').select('seats').eq('tripId', tripId);
            if (!vansError) availableSeats = countAvailableSeats(vans);
          } catch {
            // Availability is optional: still reply with the trip details on lookup failure.
          }
        }
        operation = 'send_api';
        log('send_response_started', context);
        const response = await fetch(`https://graph.facebook.com/${version}/${pageId}/messages`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: { id: event.sender!.id }, messaging_type: 'RESPONSE', message: { text: tripReply(trip ? { ...trip, availableSeats } : null) } }),
          signal: AbortSignal.timeout(8000),
        });
        log('send_response_received', { ...context, httpStatus: response.status, success: response.ok });
        if (!response.ok) {
          try {
            const failure = await response.json();
            log('send_response_failed', { ...context, httpStatus: response.status, ...safeErrorFields(failure?.error) }, 'error');
          } catch {
            log('send_response_failed', { ...context, httpStatus: response.status, reason: 'unreadable_error_body' }, 'error');
          }
          throw new Error('Messenger send failed');
        }
        log('send_response_success', { ...context, httpStatus: response.status });
      }
    }
    return new Response('EVENT_RECEIVED');
  } catch (error) {
    log('processing_failed', { ...context, operation, ...safeErrorFields(error) }, 'error');
    return new Response('Processing failed', { status: 500 });
  }
}
