const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, URL, AbortSignal, process: { env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  } }, require: name => {
    if (dependencies[name]) return dependencies[name];
    throw new Error(`Unexpected dependency ${name}`);
  }, ...globals });
  return exports;
}
const share = load('src/lib/shareSettings.ts');
const metadata = fetch => load('src/lib/shareMetadata.ts', { './shareSettings': share }, { fetch });

test('saved share copy reaches OG and Twitter; each request reads fresh settings', async () => {
  let title = 'First saved title';
  const reader = metadata(async (url, options) => {
    assert.match(url, /object\/authenticated\/images\/settings\/footer.json$/);
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => ({ share_title: title, share_description: 'Description', share_image: 'https://example.com/photo.png' }) };
  });
  let result = await reader.loadShareMetadata();
  assert.equal(result.openGraph.title, title);
  assert.equal(result.twitter.description, 'Description');
  assert.equal(result.openGraph.images[0].url, 'https://example.com/photo.png');
  title = 'Updated title';
  result = await reader.loadShareMetadata();
  assert.equal(result.openGraph.title, title);
});

test('missing, failed, and malformed storage responses retain usable defaults', async () => {
  for (const fetch of [
    async () => ({ ok: false }),
    async () => { throw new Error('Network unavailable'); },
    async () => ({ ok: true, json: async () => { throw new Error('Invalid JSON'); } }),
    async () => ({ ok: true, json: async () => null }),
    async () => ({ ok: true, json: async () => ({ footer_description: 'Legacy settings' }) }),
  ]) {
    const result = await metadata(fetch).loadShareMetadata();
    assert.equal(result.title, share.defaultShareSettings.share_title);
    assert.equal(result.openGraph.images[0].url, '/logo/logo.jpg');
  }
});

test('blank copy falls back and unsafe image protocols are rejected', () => {
  for (const image of ['javascript:alert(1)', 'data:image/svg+xml,test', '//example.com/image', '/\\example.com/image']) {
    assert.equal(share.validShareImage(image), false);
    assert.equal(share.normalizeShareSettings({ share_image: image }).share_image, '/logo/logo.jpg');
  }
  assert.equal(share.normalizeShareSettings({ share_title: '  ' }).share_title, share.defaultShareSettings.share_title);
  assert.equal(share.validShareImage('https://example.com/image.png'), true);
});
