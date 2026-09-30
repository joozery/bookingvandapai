const fs = require('node:fs');
const { chromium, contextFor, settings, base } = require('./audit-theme.cjs');
(async()=>{
const assert=require('node:assert/strict');const browser=await chromium.launch({channel:'chrome',headless:true});
try {for(const [size,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
const context=await contextFor(browser,viewport,'admin');let saved={...settings,banner_image:'',background_image:''};let uploads=0;
await context.route('**/*.supabase.co/storage/v1/object/images/homepage/**',async route=>{if(route.request().method()==='POST'){uploads++;return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({Key:'images/test'})});}return route.fulfill({status:200,contentType:'image/png',body:fs.readFileSync('public/logo/scenic_van_trip.png')});});
await context.route('**/*.supabase.co/storage/v1/object/public/images/homepage/**',route=>route.fulfill({status:200,contentType:'image/png',body:fs.readFileSync('public/logo/scenic_van_trip.png')}));
await context.route('**/api/settings',async route=>{if(route.request().method()==='PUT')saved=route.request().postDataJSON();return route.fulfill({contentType:'application/json',body:JSON.stringify({success:true,settings:saved})});});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/admin/settings');
await page.locator('#banner_image').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('invalid')});await page.locator('p[role=alert]').waitFor();assert.equal(uploads,0);
await page.locator('#banner_image').setInputFiles('public/logo/scenic_van_trip.png');await page.waitForFunction(()=>document.querySelector('#banner_image')?.disabled===false);await page.waitForTimeout(1300);assert.ok(saved.banner_image.includes('/homepage/banner_image/'));
await page.locator('#background_image').setInputFiles('public/logo/scenic_van_trip.png');await page.waitForFunction(()=>document.querySelector('#background_image')?.disabled===false);await page.waitForTimeout(1300);assert.ok(saved.background_image.includes('/homepage/background_image/'));assert.equal(uploads,2);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
await page.goto(base+'/');await page.waitForTimeout(900);assert.ok(await page.locator('.theme-hero').evaluate(el=>getComputedStyle(el).backgroundImage.includes('/homepage/banner_image/')));assert.ok(await page.locator('.theme-page').evaluate(el=>getComputedStyle(el,'::before').backgroundImage.includes('/homepage/background_image/')));
await page.goto(base+'/admin/settings');await page.locator('#banner_image').waitFor();await page.locator('#banner_image').locator('..').locator('button').click();await page.waitForTimeout(1300);assert.equal(saved.banner_image,'');assert.ok(saved.background_image);assert.deepEqual(errors,[]);await context.close();console.log(size+' upload, validation, autosave, render, reset: PASS');
}}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

