import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { supabase } from '@/lib/supabase';

const SETTINGS_FILE = 'settings/footer.json';

const defaultSettings = {
  footer_description: 'กลุ่มเดินป่าและเดินทางสายผจญภัย มุ่งสร้างสรรค์ทริปท่องเที่ยวธรรมชาติที่คุ้มค่า สนุกสนาน มิตรภาพที่ยั่งยืน และปลอดภัยทุกก้าวเดิน',
  contact_phone: '+66 89 123 4567',
  contact_email: 'support@dapaidernpai.com',
  contact_location: 'เชียงใหม่ / กรุงเทพฯ, ประเทศไทย',
  copyright_year: new Date().getFullYear().toString(),
  line_url: 'https://line.me',
  privacy_policy: `<h1>นโยบายความเป็นส่วนตัว (Privacy Policy)</h1>
<p>ทาง <strong>ด่าไป เดินไป (DAPAI DERNPAI)</strong> ให้ความสำคัญกับข้อมูลส่วนบุคคลของท่าน...</p>
<p><strong>1. การเก็บรวบรวมข้อมูลส่วนบุคคล</strong><br/>เราจะเก็บรวบรวมข้อมูลเท่าที่จำเป็นสำหรับการให้บริการจองที่นั่งรถตู้และจัดทริปเดินป่า เช่น ชื่อ เบอร์โทรศัพท์ และข้อมูลที่เกี่ยวข้องกับการเดินทาง</p>
<p><strong>2. การใช้ข้อมูลส่วนบุคคล</strong><br/>เรานำข้อมูลของท่านไปใช้เพื่อยืนยันการจอง ติดต่อสื่อสารเกี่ยวกับการเดินทาง และทำประกันภัยอุบัติเหตุเท่านั้น เราจะไม่นำข้อมูลของท่านไปขายหรือเปิดเผยแก่บุคคลที่สามที่ไม่เกี่ยวข้อง</p>
<p><strong>3. ความปลอดภัยของข้อมูล</strong><br/>เรามีมาตรการป้องกันความปลอดภัยของข้อมูลที่ได้มาตรฐาน เพื่อป้องกันการเข้าถึง แสวงหาประโยชน์ หรือเปลี่ยนแปลงข้อมูลโดยไม่ได้รับอนุญาต</p>
<p><strong>4. สิทธิของเจ้าของข้อมูล</strong><br/>ท่านมีสิทธิในการขอแก้ไข หรือลบข้อมูลส่วนบุคคลของท่านในระบบของเราได้ โดยติดต่อผ่านช่องทางแอดมินของเรา</p>`,
  terms_of_service: `<h1>เงื่อนไขการให้บริการ (Terms of Service)</h1>
<p>ยินดีต้อนรับสู่บริการของ <strong>ด่าไป เดินไป (DAPAI DERNPAI)</strong> กรุณาอ่านเงื่อนไขและข้อตกลงในการให้บริการอย่างละเอียดก่อนทำการจอง</p>
<p><strong>1. การจองและการชำระเงิน</strong><br/>- การจองจะสมบูรณ์เมื่อท่านชำระเงินและได้รับการยืนยันจากระบบหรือแอดมิน<br/>- ขอสงวนสิทธิ์ในการยกเลิกการจองหากไม่ได้รับการชำระเงินภายในเวลาที่กำหนด</p>
<p><strong>2. นโยบายการยกเลิกและการคืนเงิน</strong><br/>- หากผู้เดินทางต้องการยกเลิก ต้องแจ้งล่วงหน้าอย่างน้อย 7 วันก่อนวันเดินทาง จึงจะสามารถคืนเงินได้ 50%<br/>- หากยกเลิกน้อยกว่า 7 วัน หรือไม่มาปรากฏตัว ณ วันเดินทาง ทางเราขอสงวนสิทธิ์ในการไม่คืนเงินในทุกกรณี</p>
<p><strong>3. ข้อปฏิบัติในการเดินทาง</strong><br/>- ผู้เดินทางควรมาถึงจุดนัดพบก่อนเวลาออกเดินทางอย่างน้อย 15 นาที<br/>- เพื่อความปลอดภัยและความสนุกสนานร่วมกัน ขอให้ผู้เดินทางปฏิบัติตามคำแนะนำของผู้นำทริปอย่างเคร่งครัด</p>
<p><strong>4. การเปลี่ยนแปลงหรือยกเลิกทริปโดยผู้จัด</strong><br/>- กรณีเกิดเหตุสุดวิสัย ภัยธรรมชาติ หรือเหตุขัดข้องที่ทำให้ไม่สามารถเดินทางได้ ทางผู้จัดยินดีคืนเงินเต็มจำนวน หรือเลื่อนทริปตามที่ตกลงกัน</p>`
};

export async function GET() {
  try {
    const { data, error } = await supabase.storage.from('images').download(SETTINGS_FILE);
    if (error) {
      return NextResponse.json({ success: true, settings: defaultSettings });
    }
    const text = await data.text();
    const settings = JSON.parse(text);
    return NextResponse.json({ success: true, settings: { ...defaultSettings, ...settings } });
  } catch (err: any) {
    return NextResponse.json({ success: true, settings: defaultSettings });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { error } = await supabase.storage.from('images').upload(SETTINGS_FILE, JSON.stringify(body), {
      contentType: 'application/json',
      upsert: true
    });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
