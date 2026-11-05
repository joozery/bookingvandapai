import type { Metadata } from 'next';
import { defaultShareSettings, normalizeShareSettings } from './shareSettings';
import { downloadFromR2 } from './r2';

const SHARE_METADATA_CACHE_TTL_MS = 5 * 60 * 1000;

let metadataCache: { value: Metadata; expiresAt: number } | null = null;
let metadataInFlight: Promise<Metadata> | null = null;

async function readShareMetadata(): Promise<Metadata> {
  let settings = defaultShareSettings;
  try {
    const object = await downloadFromR2('settings/footer.json');
    if (object.Body) settings = normalizeShareSettings(JSON.parse(await object.Body.transformToString()));
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

export async function loadShareMetadata(): Promise<Metadata> {
  const now = Date.now();
  if (metadataCache && metadataCache.expiresAt > now) {
    return metadataCache.value;
  }

  // Reuse an in-progress request when multiple pages are rendered together.
  if (!metadataInFlight) {
    metadataInFlight = readShareMetadata()
      .then((value) => {
        metadataCache = {
          value,
          expiresAt: Date.now() + SHARE_METADATA_CACHE_TTL_MS,
        };
        return value;
      })
      .finally(() => {
        metadataInFlight = null;
      });
  }

  return metadataInFlight;
}
