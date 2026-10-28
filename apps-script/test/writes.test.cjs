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
  const updates = [];
  const context = {
    console,
    Object,
    Array,
    Error,
    JSON,
    Sheets: {
      Spreadsheets: {
        Values: {
          update(body, spreadsheetId, range, options) {
            updates.push({ body, spreadsheetId, range, options });
          },
        },
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, updates };
}

test('writes all values with RAW input semantics', () => {
  const { context, updates } = loadScript();
  context.writeRawValues('spreadsheet', "Sheet's Name", [
    ['Paragraph', '=1+1', ''],
  ]);

  assert.equal(updates.length, 1);
  assert.equal(updates[0].range, "'Sheet''s Name'!A1");
  assert.equal(updates[0].options.valueInputOption, 'RAW');
  assert.equal(updates[0].body.values[0][1], '=1+1');
});

test('builds one bounded page matrix without interpreting text', () => {
  const { context } = loadScript();
  const rows = context.buildPageRows('Category', 'Section', 'Lesson', [
    { type: 'Paragraph', text: '=IMPORTDATA("https://example.com")' },
  ], 9);

  assert.deepEqual(JSON.parse(JSON.stringify(rows)), [
    ['Category', 'Section', 'Lesson', 9],
    ['Title', '', '', ''],
    ['Paragraph', '=IMPORTDATA("https://example.com")', '', ''],
  ]);
});

test('stores a TOC revision even when the TOC is empty', () => {
  const { context } = loadScript();
  assert.deepEqual(JSON.parse(JSON.stringify(context.buildTocRows([], 3))), [
    ['', '', 3],
  ]);
});
