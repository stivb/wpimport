const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = { window: {}, console };
vm.runInNewContext(fs.readFileSync('mashup-import.js', 'utf8'), context);

const files = {
  '2026/11/photo.png': 'images/photo.png',
  '2026/11/exact-100x200.png': 'images/exact-100x200.png',
  '2026/10/duplicate.png': 'images/duplicate.png',
  '2026/11/duplicate.png': 'images/duplicate-2.png',
  'flat name.png': 'images/flat name.png',
};
const base = 'https://example.com/wp-content/uploads/';
assert.equal(context.resolveImageUrl(base + '2026/11/photo-1024x572.png?w=10', 'site1', files), 'site1/images/photo.png');
assert.equal(context.resolveImageUrl(base + '2026/11/exact-100x200.png', 'site1', files), 'site1/images/exact-100x200.png');
assert.equal(context.resolveImageUrl(base + '2026/09/duplicate-100x200.png', 'site1', files), base + '2026/09/duplicate-100x200.png');
assert.equal(context.resolveImageUrl(base + '2026/11/flat%20name.png', 'site1', files), 'site1/images/flat%20name.png');
assert.equal(context.rewriteContentImages(`<img src='${base}2026/11/photo-100x200.png'>`, 'site1', files), "<img src='site1/images/photo.png'>");
console.log('Image URL resolution tests passed.');
