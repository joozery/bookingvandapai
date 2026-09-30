// Compare against the source snapshot captured immediately before the theme edit.
// Ignores presentation only; text, image/SVG data, handlers and component structure
// must remain identical. This is a local audit, not a production build dependency.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const baseline = fs.readFileSync(path.join(os.tmpdir(), 'dapai-theme-baseline-path.txt'), 'utf8');
const ignoredAttributes = new Set(['className', 'style']);
function normalized(file, content) {
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const records = [];
  function visit(node) {
    if (ts.isJsxAttribute(node) && ignoredAttributes.has(node.name.getText(source))) return;
    // Chart colors are presentation; the SVG illustration in DigitalTicket stays exact.
    if (file.endsWith('DashboardOverview.tsx') && ts.isJsxAttribute(node) && ['fill', 'stroke'].includes(node.name.getText(source))) return;
    if (ts.isPropertyAssignment(node) && ['dot', 'hatch', 'color'].includes(node.name.getText(source))) return;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (/^(?:#[a-f\d]{3,8}|rgba?\(|var\(--|repeating-linear-gradient)/i.test(node.text)) return;
      if (/(?:^|\s)(?:[\w:-]+:)?(?:bg|text|border|hover|focus|ring|shadow|from|to|via|flex|grid|inline-flex|h|w|p|m|absolute|relative|space-y|group|rounded|overflow|block|cursor|items)-/.test(node.text)) return;
      records.push(['string', node.text]); return;
    }
    if (ts.isJsxText(node)) { records.push(['text', node.text]); return; }
    if (ts.isIdentifier(node)) records.push(['identifier', node.text]);
    if (ts.isNumericLiteral(node)) records.push(['number', node.text]);
    ts.forEachChild(node, visit);
  }
  visit(source);
  // User approved moving the existing invitation block into the top banner.
  // Compare its complete token inventory independently of its position.
  return JSON.stringify(file.endsWith('LandingPage.tsx') ? records.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))) : records);
}
let checked = 0; const changed = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (file.endsWith('.tsx')) {
      const before = fs.readFileSync(path.join(baseline, file), 'utf8');
      if (normalized(file, before) !== normalized(file, fs.readFileSync(file, 'utf8'))) changed.push(file);
      checked++;
    }
  }
}
walk('src');
console.log('Components checked:', checked, 'Nonvisual changes:', changed);
if (changed.length) process.exitCode = 1;
