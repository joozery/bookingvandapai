export const MESSENGER_URL = 'https://m.me/Dapaidernpai';

export function tripMessengerUrl(tripId: string): string {
  return `${MESSENGER_URL}?ref=${encodeURIComponent(`trip:${tripId}`)}`;
}
