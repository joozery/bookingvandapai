export const defaultReviewCopy = {
  reviewTitle: 'ขอบคุณที่ร่วมเดินทางกับเรา',
  reviewDescription: 'ทริปนี้ปิดรับจองแล้ว แบ่งปันความประทับใจและข้อเสนอแนะเพื่อพัฒนาทริปครั้งต่อไป คะแนนและความคิดเห็นที่ไม่ได้ถูกซ่อนจะแสดงสาธารณะเมื่อแอดมินปิดทริป กรุณาไม่ใส่ข้อมูลส่วนตัวในข้อความ',
};

export type ReviewCopy = { reviewTitle?: string | null; reviewDescription?: string | null };

export function resolveReviewCopy(trip: ReviewCopy, defaults: ReviewCopy) {
  return {
    reviewTitle: trip.reviewTitle?.trim() || defaults.reviewTitle?.trim() || defaultReviewCopy.reviewTitle,
    reviewDescription: trip.reviewDescription?.trim() || defaults.reviewDescription?.trim() || defaultReviewCopy.reviewDescription,
  };
}

export function reviewCopyUpdates(body: ReviewCopy) {
  const updates: ReviewCopy = {};
  for (const key of ['reviewTitle', 'reviewDescription'] as const) {
    if (body[key] === undefined) continue;
    const value = body[key];
    if (value !== null && (typeof value !== 'string' || value.length > (key === 'reviewTitle' ? 300 : 3000))) {
      throw new Error('ข้อความหน้ารีวิวไม่ถูกต้อง หรือยาวเกินกำหนด');
    }
    updates[key] = value?.trim() || null;
  }
  return updates;
}
