import { defaultReviewCopy } from './reviewCopy';
import { defaultShareSettings } from './shareSettings';

export const defaultHomepageSettings = {
  banner_image: '',
  background_image: '',
  leaderboard_title: 'สถิติเวทคนปากดี',
  ...defaultShareSettings,
  ...defaultReviewCopy,
  cta_title: 'พร้อมร่วมเดินทางเก็บความทรงจำดีๆ กับเราหรือยัง?',
  cta_description: 'ติดต่อแอดมินของเราเพื่อขอลิ้งก์เข้าสู่ระบบจองที่นั่งรถตู้คันโปรดของคุณง่ายๆ ผ่านระบบออนไลน์ เพื่อไม่พลาดทริปเดินป่าสุดพิเศษนี้',
};
