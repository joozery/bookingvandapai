import type { Metadata } from 'next';
import { defaultShareSettings, normalizeShareSettings } from './shareSettings';

export async function loadShareMetadata(): Promise<Metadata> {
  let settings = defaultShareSettings;
  try {
    // Read storage directly on the server; never call our own HTTP API during rendering.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/images/settings/footer.json`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) settings = normalizeShareSettings(await response.json());
  } catch {
    // Keep share previews available when settings storage is temporarily unavailable.
  }
  const { share_title: title, share_description: description, share_image: image } = settings;
  return {
    title,
    description,
    openGraph: {
      title, description, siteName: 'ด่าไป เดินไป', locale: 'th_TH', type: 'website',
      images: [{ url: image, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}
