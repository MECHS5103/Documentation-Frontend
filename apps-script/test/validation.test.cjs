const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'Code.gs'),
  'utf8'
);

function loadScript() {
  const context = { console, Object, Array, Error, JSON };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

const validPayload = () => ({
  action: 'saveContent',
  category: 'Programming',
  section: 'JavaScript',
  lesson: 'Variables',
  expectedPageVersion: 4,
  expectedTocVersion: 7,
  tocData: [{ type: 'LessonText', text: 'Variables' }],
  pageElements: [
    { type: 'Paragraph', text: 'Use const for values that do not change.' },
    {
      type: 'VideoPill',
      title: 'Variables',
      caption: 'A short lesson',
      videoUrl: 'https://example.com/video.mp4',
    },
  ],
});

test('normalizes a complete save payload', () => {
  const context = loadScript();
  const result = context.validateSavePayload(validPayload());
  assert.equal(result.category, 'Programming');
  assert.equal(result.pageElements.length, 2);
  assert.equal(result.expectedPageVersion, 4);
  assert.equal(result.expectedTocVersion, 7);
});

for (const [name, mutate] of [
  ['non-array collections', (value) => { value.pageElements = {}; }],
  ['missing identifiers', (value) => { value.lesson = ''; }],
  ['unknown element types', (value) => { value.pageElements[0].type = 'Unknown'; }],
  ['invalid category characters', (value) => { value.category = 'Bad/Category'; }],
  ['non-HTTPS video URLs', (value) => { value.pageElements[1].videoUrl = 'http://example.com/video.mp4'; }],
  ['missing page version', (value) => { delete value.expectedPageVersion; }],
  ['negative TOC version', (value) => { value.expectedTocVersion = -1; }],
]) {
  test(`rejects ${name}`, () => {
    const context = loadScript();
    const payload = validPayload();
    mutate(payload);
    assert.throws(() => context.validateSavePayload(payload));
  });
}

test('caps element counts before any sheet work', () => {
  const context = loadScript();
  const payload = validPayload();
  payload.pageElements = Array.from({ length: 201 }, () => ({
    type: 'Paragraph',
    text: 'x',
  }));
  assert.throws(() => context.validateSavePayload(payload), /too many/i);
});

test('accepts and normalizes rename entries', () => {
  const context = loadScript();
  const body = validPayload();
  body.renames = [
    { type: 'section', from: ' Old ', to: ' New ' },
    { type: 'lesson', section: 'New', from: 'A', to: 'B' },
  ];
  const result = context.validateSavePayload(body);
  assert.equal(result.renames.length, 2);
  assert.equal(result.renames[0].from, 'Old');
  assert.equal(result.renames[1].section, 'New');
});

test('defaults to no renames and rejects malformed ones', () => {
  const context = loadScript();
  assert.equal(context.validateSavePayload(validPayload()).renames.length, 0);
  for (const bad of [
    'nope',
    [{ type: 'category', from: 'a', to: 'b' }],
    [{ type: 'lesson', from: 'a', to: 'b' }],
    [{ type: 'section', from: 'a', to: '' }],
  ]) {
    const body = validPayload();
    body.renames = bad;
    assert.throws(() => context.validateSavePayload(body));
  }
});
