const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'Code.gs'), 'utf8');

function load(extra = {}) {
  const context = {
    console,
    Object,
    Array,
    Error,
    JSON,
    Math,
    String,
    parseInt,
    ...extra,
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

const basePayload = (element) => ({
  category: 'Marketing',
  section: 'Campaigns',
  lesson: 'Budget',
  expectedPageVersion: 0,
  expectedTocVersion: 0,
  tocData: [],
  pageElements: [element],
});

const bigSheet = (cellCount) => {
  const cells = {};
  for (let i = 0; i < cellCount; i += 1) {
    cells[`${i},0`] = { v: `Row ${i} — some reasonably long text to fill space` };
  }
  return JSON.stringify({ v: 1, cells });
};

test('accepts a well-formed Sheets pill', () => {
  const context = load();
  const result = context.validateSavePayload(
    basePayload({ type: 'SheetsPill', title: '  Q3 Budget ', text: bigSheet(3) })
  );
  assert.equal(result.pageElements[0].type, 'SheetsPill');
  assert.equal(result.pageElements[0].title, 'Q3 Budget');
});

test('rejects Sheets data that is not a cells object', () => {
  const context = load();
  for (const text of ['not json', '[]', '{"cells":[]}', '{"v":1}']) {
    assert.throws(
      () => context.validateSavePayload(basePayload({ type: 'SheetsPill', text })),
      (error) => error.code === 'INVALID_PAYLOAD'
    );
  }
});

test('allows Sheets data far larger than a normal paragraph', () => {
  const context = load();
  const text = bigSheet(5000);
  assert.ok(text.length > 20000);
  assert.doesNotThrow(() =>
    context.validateSavePayload(basePayload({ type: 'SheetsPill', text }))
  );
  assert.throws(() =>
    context.validateSavePayload(
      basePayload({ type: 'Paragraph', text: 'x'.repeat(20001) })
    )
  );
});

test('stores a big sheet as numbered chunks that each fit in a cell', () => {
  const context = load();
  const text = bigSheet(2500);
  const rows = context.buildPageRows(
    'Marketing', 'Campaigns', 'Budget',
    [{ type: 'Paragraph', text: 'before' }, { type: 'SheetsPill', title: 'Budget', text }, { type: 'Paragraph', text: 'after' }],
    1
  );
  const sheetRows = rows.filter((row) => row[0] === 'SheetsPill');
  assert.equal(sheetRows[0][3], 'Budget');
  assert.ok(sheetRows.slice(1).every((row) => row[3] === ''));
  assert.ok(sheetRows.length > 1);
  assert.ok(sheetRows.every((row) => row[1].length <= 40000));
  assert.deepEqual(
    sheetRows.map((row) => row[2]),
    sheetRows.map((_, index) => `${index + 1}/${sheetRows.length}`)
  );
  assert.equal(sheetRows.map((row) => row[1]).join(''), text);
});

test('reads chunked sheets back as one element, between other elements', () => {
  const text = bigSheet(2500);
  const context0 = load();
  const rows = context0.buildPageRows(
    'Marketing', 'Campaigns', 'Budget',
    [
      { type: 'Paragraph', text: 'before' },
      { type: 'SheetsPill', title: 'First', text },
      { type: 'SheetsPill', title: 'Second', text: bigSheet(1) },
      { type: 'Paragraph', text: 'after' },
    ],
    3
  );
  const sheet = {
    getLastRow: () => rows.length,
    getRange: (row, column, rowCount, columnCount) => ({
      getValues: () => [rows[0].slice(0, columnCount)],
      getValue: () => rows[0][column - 1],
    }),
    getDataRange: () => ({ getValues: () => rows }),
  };
  const context = load({
    SpreadsheetApp: { openById: () => ({ getSheets: () => [sheet] }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (content) => ({ content, setMimeType() { return this; } }),
    },
  });
  const response = JSON.parse(
    context.doGet({ parameter: { category: 'Marketing', section: 'Campaigns', lesson: 'Budget' } }).content
  );
  const types = response.data.map((item) => item.type);
  assert.deepEqual(types, ['Title', 'Paragraph', 'SheetsPill', 'SheetsPill', 'Paragraph']);
  assert.equal(response.data[2].text, text);
  assert.equal(response.data[2].title, 'First');
  assert.equal(response.data[3].text, bigSheet(1));
  assert.equal(response.data[3].title, 'Second');
});

test('the Media -> Marketing migration renames the tab and page categories', () => {
  const makeSheet = (name, first) => ({
    name,
    first,
    getName() { return this.name; },
    setName(value) { this.name = value; },
    getLastRow: () => 2,
    getRange() {
      const sheet = this;
      return {
        getValue: () => sheet.first,
        setValue: (value) => { sheet.first = value; },
      };
    },
  });
  const toc = [makeSheet('Media', 'x'), makeSheet('Build', 'x')];
  const pages = [makeSheet('p1', 'Media'), makeSheet('p2', 'Build'), makeSheet('p3', ' media ')];
  const book = (sheets) => ({
    getSheetByName: (name) => sheets.find((s) => s.name === name) || null,
    getSheets: () => sheets,
  });
  const context = load({
    Logger: { log() {} },
    SpreadsheetApp: {
      openById: (id) => (id.startsWith('1Nw') ? book(toc) : book(pages)),
    },
  });
  context.migrateMediaToMarketing();
  assert.deepEqual(toc.map((s) => s.name), ['Marketing', 'Build']);
  assert.deepEqual(pages.map((s) => s.first), ['Marketing', 'Build', 'Marketing']);
});

test('accepts the newer text pills and keeps the chosen code language', () => {
  const context = load();
  for (const type of ['NotePill', 'ChecklistPill', 'StepsPill', 'LinkPill', 'ImagePill']) {
    const result = context.validateSavePayload(basePayload({ type, text: 'line one\nline two' }));
    assert.equal(result.pageElements[0].type, type);
    assert.equal(result.pageElements[0].text, 'line one\nline two');
  }
  const code = context.validateSavePayload(basePayload({ type: 'CodePill', text: 'x = 1', language: 'Python' }));
  assert.equal(code.pageElements[0].language, 'Python');
  assert.throws(
    () => context.validateSavePayload(basePayload({ type: 'MadeUpPill', text: 'x' })),
    (error) => error.code === 'INVALID_PAYLOAD'
  );
});
