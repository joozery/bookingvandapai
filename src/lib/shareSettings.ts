export const defaultShareSettings = {
  share_title: 'ระบบจองที่นั่งรถตู้ท่องเที่ยว - ด่าไป เดินไป',
  share_description: 'จองที่นั่งรถตู้ท่องเที่ยวสายแคมป์ปิ้ง เดินป่า ธรรมชาติ แบบเรียลไทม์ผ่าน LINE',
  share_image: '/logo/logo-jpg.webp',
};

export function validShareImage(value: string) {
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function normalizeShareSettings(settings: Record<string, unknown>) {
  const text = (key: 'share_title' | 'share_description', limit: number) =>
    typeof settings[key] === 'string' && settings[key].trim()
      ? settings[key].trim().slice(0, limit) : defaultShareSettings[key];
  const image = typeof settings.share_image === 'string' ? settings.share_image.trim() : '';
  return {
    share_title: text('share_title', 150),
    share_description: text('share_description', 500),
    share_image: image && validShareImage(image) ? image : defaultShareSettings.share_image,
  };
}
