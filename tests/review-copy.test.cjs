const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsCopy = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/reviewCopy.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsCopy });
const { resolveReviewCopy, reviewCopyUpdates, defaultReviewCopy } = exportsCopy;
const defaults = { reviewTitle: 'Default title', reviewDescription: 'Default description' };

test('old trips use the configured defaults', () => {
  assert.equal(resolveReviewCopy({}, defaults).reviewTitle, defaults.reviewTitle);
  assert.equal(resolveReviewCopy({}, defaults).reviewDescription, defaults.reviewDescription);
});
test('each override is independent and blank text falls back', () => {
  const result = resolveReviewCopy({ reviewTitle: 'Trip title', reviewDescription: '  \n ' }, defaults);
  assert.equal(result.reviewTitle, 'Trip title');
  assert.equal(result.reviewDescription, defaults.reviewDescription);
  assert.equal(resolveReviewCopy({ reviewDescription: 'Trip details' }, defaults).reviewTitle, defaults.reviewTitle);
});
test('clearing an override restores inheritance, including future default changes', () => {
  const cleared = reviewCopyUpdates({ reviewTitle: '', reviewDescription: '  ' });
  assert.equal(cleared.reviewTitle, null);
  assert.equal(resolveReviewCopy(cleared, { ...defaults, reviewTitle: 'New default' }).reviewTitle, 'New default');
});
test('missing global values use built-in copy', () => {
  assert.equal(resolveReviewCopy({}, {}).reviewTitle, defaultReviewCopy.reviewTitle);
  assert.equal(resolveReviewCopy({}, { reviewDescription: '' }).reviewDescription, defaultReviewCopy.reviewDescription);
});
test('partial trip updates preserve copy and validate input', () => {
  assert.equal(Object.keys(reviewCopyUpdates({ status: 'completed' })).length, 0);
  for (const body of [{ reviewTitle: 123 }, { reviewDescription: {} }, { reviewTitle: 'a'.repeat(301) }, { reviewDescription: 'a'.repeat(3001) }]) {
    assert.throws(() => reviewCopyUpdates(body));
  }
  assert.equal(reviewCopyUpdates({ reviewDescription: ' First\nSecond ' }).reviewDescription, 'First\nSecond');
});
