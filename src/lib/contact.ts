export const MESSENGER_URL = 'https://m.me/Dapaidernpai';

export function tripMessengerUrl(tripId: string): string {
  return `https://m.me/103922222131678?ref=${encodeURIComponent(`trip:${tripId}`)}`;
}
