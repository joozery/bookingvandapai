// Read-only browser audit. All session/account/booking API responses are fixtures;
// writes and direct Supabase calls are blocked, so no real bookings are changed.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cache = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx');
const packagePath = fs.readdirSync(cache).map(name => path.join(cache, name, 'node_modules', 'playwright')).find(dir => fs.existsSync(path.join(dir, 'package.json')));
if (!packagePath) throw new Error('Run npx --yes --package=playwright playwright --version first');
const { chromium } = require(packagePath);
const output = path.join(os.tmpdir(), 'dapai-theme-browser-audit');
fs.mkdirSync(output, { recursive: true });
const base = process.env.THEME_AUDIT_URL || 'http://localhost:3000';
const trip = { id: 'theme-trip', name: 'ทริปตัวอย่างสำหรับตรวจหน้าจอ', departureDate: '2030-10-12', durationDays: 3, cost: 1500, pickupPoint: 'จุดนัดพบตัวอย่าง', departureTime: '06:00', status: 'active', availableSeats: 7, image: '/logo/scenic_van_trip.png', guideName: 'ทีมงาน', tripPeriod: '3 วัน 2 คืน||12–14 ต.ค.' };
const past = { ...trip, id: 'theme-past', status: 'completed', departureDate: '2025-01-01' };
const seats = Array.from({ length: 11 }, (_, i) => ({ id: `seat-${i}`, label: i ? String(i) : 'D', type: i ? 'customer' : 'driver', status: i === 0 ? 'booked' : i === 1 ? 'pending' : i === 2 ? 'booked' : i === 3 ? 'blocked' : 'available', row: i < 2 ? 1 : Math.floor((i - 2) / 3) + 2, col: i < 2 ? i ? 1 : 3 : [3, 2, 1][(i - 2) % 3] }));
const van = { id: 'theme-van', tripId: trip.id, vanNumber: 1, plateNumber: 'TEST 001', driverName: 'ทีมงานทดสอบ', driverPhone: '0000000000', seats };
const booking = { id: 'theme-booking', tripId: trip.id, vanId: van.id, seatId: 'seat-2', seatLabel: '2', nickname: 'ผู้ทดสอบ', fullName: 'บัญชีทดสอบหน้าจอ', phone: '0000000000', lineUserId: 'theme-user', lineUserName: 'ผู้ทดสอบ', lineUserProfilePic: '/logo/logo.jpg', status: 'approved', createdAt: '2026-09-01T00:00:00Z', checkedIn: false, tripName: trip.name, ...Object.fromEntries(['cost', 'pickupPoint', 'departureDate', 'departureTime', 'durationDays'].map(k => [k, trip[k]])), vanNumber: 1, plateNumber: van.plateNumber, driverName: van.driverName, driverPhone: van.driverPhone };
const user = { ...booking, totalBookings: 3, approvedBookings: 2, checkedIn: 1, firstSeen: booking.createdAt, lastSeen: booking.createdAt, role: 'customer', isBlocked: false, adminNote: '' };
const adminTabs = ['dashboard', 'trips', 'completed-trips', 'vans', 'bookings', 'pending', 'users', 'checkin', 'staff', 'insurance', 'reviews', 'leaderboard', 'settings', 'profile'];
const settings = { cta_title: 'พร้อมร่วมเดินทางเก็บความทรงจำดีๆ กับเราหรือยัง?', cta_description: 'ติดต่อแอดมินเพื่อจองทริป', footer_description: 'ด่าไป เดินไป', contact_phone: '0000000000', contact_email: 'test@example.com', contact_location: 'กรุงเทพฯ', copyright_year: '2026', line_url: 'https://line.me', leaderboard_title: 'สถิติเวทคนปากดี', share_title: 'ด่าไป เดินไป', share_description: 'ทริปท่องเที่ยวธรรมชาติ', share_image: '/logo/logo.jpg' };
const review = { id: 'review-test', tripId: past.id, reviewerName: 'ผู้ทดสอบ', rating: 5, comment: 'ข้อมูลจำลองสำหรับตรวจธีม', createdAt: booking.createdAt, isHidden: false };
const results = [];
async function contextFor(browser, viewport, role, profile = true) {
  const context = await browser.newContext({ viewport, locale: 'th-TH', timezoneId: 'Asia/Bangkok' });
  await context.route('**/*.supabase.co/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url()); const p = url.pathname;
    if (route.request().method() !== 'GET') return route.fulfill({ status: 403, contentType: 'application/json', body: '{"success":false,"error":"Read-only theme audit"}' });
    let body = { success: true };
    if (p === '/api/auth/session') body = !role ? {} : { user: { id: 'theme-user', name: 'ผู้ทดสอบ', image: '/logo/logo.jpg', role: role === 'admin' ? 'admin' : 'customer', username: role === 'admin' ? 'admin' : undefined, permissions: adminTabs }, expires: '2035-01-01T00:00:00Z' };
    else if (p === '/api/trips') body.trips = [trip, { ...trip, id: 'theme-trip-2', departureDate: '2030-10-13', name: 'ทริปตัวอย่างรอบที่สอง', availableSeats: 0 }, past];
    else if (p === '/api/vans') body.vans = [van];
    else if (p === '/api/admin/bookings') body.bookings = [booking];
    else if (p === '/api/bookings') body.bookings = role === 'admin' ? [booking, { ...booking, id: 'pending-test', status: 'pending', seatId: 'seat-1', seatLabel: '1' }] : role === 'ticket' ? [booking] : [];
    else if (p.startsWith('/api/bookings/')) body.booking = booking;
    else if (p === '/api/users') body.users = [user];
    else if (p === '/api/settings') body.settings = settings;
    else if (p === '/api/profile') body.profile = profile ? { ...booking, nationalId: '0000000000000', birthDate: '1995-01-01', emergencyName: 'ทดสอบ', emergencyPhone: '0000000000' } : null;
    else if (p.includes('profile-requests') || p === '/api/profile/requests') body.requests = [];
    else if (p === '/api/admins') body.admins = [{ id: 'theme-user', name: 'ผู้ทดสอบ', username: 'admin', permissions: adminTabs, isBlocked: false, createdAt: booking.createdAt }];
    else if (p === '/api/admin/leaderboard') body.people = [{ key: 'a'.repeat(64), nickname: 'ผู้ทดสอบ', tripCount: 3, isHidden: false }, { key: 'b'.repeat(64), nickname: 'รายชื่อที่ซ่อน', tripCount: 1, isHidden: true }];
    else if (p === '/api/leaderboard') body = { ...body, rankings: [{ rank: 1, nickname: 'ผู้ทดสอบ', tripCount: 3 }], total: 1, page: 1, pageCount: 1 };
    else if (p === '/api/holidays') body = { ...body, holidays: [{ date: '2030-10-13', name: 'วันหยุดตัวอย่าง' }], years: [2030], updatedAt: new Date().toISOString(), stale: false };
    else if (p === '/api/reviews/public') body = { ...body, trip: past, count: 1, average: 5, page: 1, pageCount: 1, reviews: [review] };
    else if (p === '/api/reviews') body = { ...body, review: null, reviews: [review] };
    else if (p.includes('/history')) body = { ...body, bookings: [booking], user };
    else if (p === '/api/admin-users') body.adminUsers = [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  return context;
}
async function capture(page, name, size) {
  await page.waitForTimeout(600);
  const metrics = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, background: getComputedStyle(document.body).backgroundColor, primary: getComputedStyle(document.documentElement).getPropertyValue('--primary').trim(), headings: [...document.querySelectorAll('h1,h2')].map(n => n.textContent).slice(0, 5), buttons: document.querySelectorAll('button').length }));
  await page.screenshot({ path: path.join(output, `${size}-${name}.png`), fullPage: true });
  results.push({ name, size, ...metrics, overflow: metrics.scrollWidth > metrics.width + 1 });
  console.log(size, name, metrics.scrollWidth > metrics.width + 1 ? 'OVERFLOW' : 'OK');
}
async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const [size, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
      const anon = await contextFor(browser, viewport, null); const page = await anon.newPage();
      page.on('pageerror', error => results.push({ size, type: 'pageerror', error: error.message, url: page.url() }));
      for (const [name, url] of [['home', '/'], ['admin-login', '/admin'], ['tickets-logged-out', '/tickets'], ['scanner', '/scanner'], ['privacy', '/privacy-policy'], ['terms', '/terms-of-service'], ['public-reviews', `/trips/${past.id}/reviews`], ['review-login', `/?tripId=${past.id}`]]) {
        await page.goto(base + url); await page.waitForTimeout(700); await capture(page, name, size);
      }
      await anon.close();
      const admin = await contextFor(browser, viewport, 'admin'); const ap = await admin.newPage();
      ap.on('pageerror', error => results.push({ size, type: 'pageerror', error: error.message, url: ap.url() }));
      for (const tab of adminTabs) { await ap.goto(`${base}/admin/${tab}`); await ap.waitForTimeout(650); await capture(ap, `admin-${tab}`, size); }
      await ap.goto(`${base}/admin/trips`); await ap.waitForTimeout(650);
      const create = ap.getByRole('button', { name: /สร้างทริป|เพิ่มทริป/ }).first();
      if (await create.count()) { await create.click(); await capture(ap, 'admin-trip-form', size); }
      await admin.close();
      const customer = await contextFor(browser, viewport, 'customer'); const cp = await customer.newPage();
      cp.on('pageerror', error => results.push({ size, type: 'pageerror', error: error.message, url: cp.url() }));
      for (const [name, url] of [['trip-booking', `/?tripId=${trip.id}`], ['review-form', `/?tripId=${past.id}`], ['tickets-empty', '/tickets']]) { await cp.goto(base + url); await cp.waitForTimeout(800); await capture(cp, name, size); }
      await cp.goto(`${base}/?tripId=${trip.id}`); await cp.waitForTimeout(800);
      await cp.getByRole('button').filter({ has: cp.getByText(trip.name, { exact: true }) }).first().click();
      await capture(cp, 'select-van', size);
      await cp.getByRole('button').filter({ hasText: /คันที่ 1/ }).last().click();
      await capture(cp, 'select-seat', size);
      await cp.getByRole('button', { name: '4', exact: true }).click();
      await capture(cp, 'booking-form', size);
      await cp.getByRole('button', { name: /ผู้ทดสอบ/ }).first().click();
      await capture(cp, 'account-dropdown', size);
      await customer.close();
      const ticket = await contextFor(browser, viewport, 'ticket'); const tp = await ticket.newPage();
      await tp.goto(`${base}/tickets`); await tp.waitForTimeout(800); await capture(tp, 'digital-ticket', size); await ticket.close();
      const registration = await contextFor(browser, viewport, 'customer', false); const rp = await registration.newPage();
      await rp.goto(`${base}/?tripId=${trip.id}`); await rp.waitForTimeout(800); await capture(rp, 'registration-modal', size); await registration.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2));
  console.log('OUTPUT', output);
  console.log('SCREENS', results.filter(r => r.name).length, 'OVERFLOWS', results.filter(r => r.overflow).length, 'ERRORS', results.filter(r => r.type === 'pageerror').length);
}
module.exports = { chromium, contextFor, settings, base };
if (require.main === module) main().catch(error => { fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2)); console.error(error); process.exitCode = 1; });
