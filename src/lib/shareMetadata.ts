import type { Metadata } from 'next';
import { defaultShareSettings, normalizeShareSettings } from './shareSettings';
import { downloadFromR2 } from './r2';

export async function loadShareMetadata(): Promise<Metadata> {
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
