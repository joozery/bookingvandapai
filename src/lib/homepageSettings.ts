import { defaultReviewCopy } from './reviewCopy';
import { defaultShareSettings } from './shareSettings';

export interface TeamCard {
  id: string;
  name: string;
  role: string;
  image: string;
  motto: string;
}

export const defaultTeamCards: TeamCard[] = [
  {
    id: 'card-1',
    name: 'พี่อาร์ต (Art)',
    role: 'ผู้ก่อตั้ง / ผู้นำทริปสายลุย',
    image: '/logo/logov2.webp',
    motto: 'เดินป่าไม่เคยย้อนกลับ ด่าไปเดินไป แต่ใจต้องเกินร้อย!',
  },
  {
    id: 'card-2',
    name: 'พี่ต่อ (Tor)',
    role: 'กูรูสายแค้มป์ / ช่างภาพประจำทริป',
    image: '/logo/scenic_van_trip.webp',
    motto: 'รูปสวยไม่จำกัดช็อต วิวไหนสวยเราจอด ปากดีแต่ดูแลดีนะบอกเลย!',
  },
];

export const defaultHomepageSettings = {
  logo_image: '',
  banner_image: '',
  background_image: '',
  leaderboard_title: 'สถิติคนมีปาก',
  team_cards: defaultTeamCards,
  ...defaultShareSettings,
  ...defaultReviewCopy,
  cta_title: 'พร้อมร่วมเดินทางเก็บความทรงจำดีๆ กับเราหรือยัง?',
  cta_description: 'ติดต่อแอดมินของเราเพื่อขอลิ้งก์เข้าสู่ระบบจองที่นั่งรถตู้คันโปรดของคุณง่ายๆ ผ่านระบบออนไลน์ เพื่อไม่พลาดทริปเดินป่าสุดพิเศษนี้',
};
