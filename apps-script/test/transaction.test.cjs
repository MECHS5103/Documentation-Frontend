const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'src', 'Code.gs'),
  'utf8'
);

const clone = (value) => JSON.parse(JSON.stringify(value));

class FakeSheet {
  constructor(name, values, events) {
    this.name = name;
    this.values = clone(values || []);
    this.events = events;
  }

  getName() {
    return this.name;
  }

  getLastRow() {
    let last = 0;
    this.values.forEach((row, rowIndex) => {
      if (row.some((value) => value !== '')) last = rowIndex + 1;
    });
    return last;
  }

  getLastColumn() {
    let last = 0;
    this.values.forEach((row) => {
      row.forEach((value, columnIndex) => {
        if (value !== '') last = Math.max(last, columnIndex + 1);
      });
    });
    return last;
  }

  getDataRange() {
    return this.getRange(
      1,
      1,
      Math.max(this.getLastRow(), 1),
      Math.max(this.getLastColumn(), 1)
    );
  }

  getRange(row, column, rowCount = 1, columnCount = 1) {
    const sheet = this;
    return {
      getValue() {
        return sheet.values[row - 1]?.[column - 1] ?? '';
      },
      getValues() {
        return Array.from({ length: rowCount }, (_, rowOffset) =>
          Array.from(
            { length: columnCount },
            (_, columnOffset) =>
              sheet.values[row - 1 + rowOffset]?.[column - 1 + columnOffset] ?? ''
          )
        );
      },
      clearContent() {
        sheet.events.push({ type: 'clear', sheet: sheet.name });
        for (let rowOffset = 0; rowOffset < rowCount; rowOffset += 1) {
          for (let columnOffset = 0; columnOffset < columnCount; columnOffset += 1) {
            const targetRow = row - 1 + rowOffset;
            const targetColumn = column - 1 + columnOffset;
            if (!sheet.values[targetRow]) sheet.values[targetRow] = [];
            sheet.values[targetRow][targetColumn] = '';
          }
        }
        return this;
      },
    };
  }

  apply(values) {
    values.forEach((row, rowIndex) => {
      if (!this.values[rowIndex]) this.values[rowIndex] = [];
      row.forEach((value, columnIndex) => {
        this.values[rowIndex][columnIndex] = value;
      });
    });
  }

  usedValues() {
    const rows = this.getLastRow();
    const columns = this.getLastColumn();
    if (!rows || !columns) return [];
    return this.getRange(1, 1, rows, columns).getValues();
  }
}

class FakeSpreadsheet {
  constructor(sheets, events) {
    this.sheets = sheets;
    this.events = events;
  }

  getSheets() {
    return this.sheets;
  }

  getSheetByName(name) {
    return this.sheets.find((sheet) => sheet.getName() === name) || null;
  }

  insertSheet(name) {
    const sheet = new FakeSheet(name, [], this.events);
    this.sheets.push(sheet);
    return sheet;
  }

  deleteSheet(sheet) {
    this.sheets = this.sheets.filter((candidate) => candidate !== sheet);
  }
}

function loadScript({ failOnceFor = null, lockAvailable = true } = {}) {
  const events = [];
  const pageSheet = new FakeSheet(
    'Programming_Variables',
    [
      ['Programming', 'JavaScript', 'Variables', 4],
      ['Title', '', '', ''],
      ['Paragraph', 'Old content', '', ''],
      ['Credits', 'Earlier Editor', '', ''],
      ['Paragraph', 'Stale tail', '', ''],
    ],
    events
  );
  const tocSheet = new FakeSheet(
    'Programming',
    [
      ['SubjectText', 'JavaScript', 7],
      ['LessonText', 'Variables', ''],
      ['LessonText', 'Stale lesson', ''],
    ],
    events
  );
  const spreadsheets = {
    pages: new FakeSpreadsheet([pageSheet], events),
    toc: new FakeSpreadsheet([tocSheet], events),
  };
  const lock = {
    released: false,
    tryLock() {
      events.push({ type: 'lock' });
      return lockAvailable;
    },
    releaseLock() {
      this.released = true;
      events.push({ type: 'unlock' });
    },
  };
  let shouldFail = Boolean(failOnceFor);

  const context = {
    console,
    Object,
    Array,
    Error,
    JSON,
    Date,
    LockService: { getScriptLock: () => lock },
    SpreadsheetApp: {
      openById(id) {
        return spreadsheets[id];
      },
    },
    Sheets: {
      Spreadsheets: {
        Values: {
          update(body, spreadsheetId, range, options) {
            events.push({
              type: 'update',
              spreadsheetId,
              values: clone(body.values),
              options: clone(options),
            });
            if (shouldFail && spreadsheetId === failOnceFor) {
              shouldFail = false;
              throw new Error('simulated write failure');
            }
            const match = range.match(/^'((?:[^']|'')+)'!A1$/);
            const sheetName = match[1].replace(/''/g, "'");
            spreadsheets[spreadsheetId].getSheetByName(sheetName).apply(body.values);
          },
        },
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(source, context);
  return { context, events, lock, pageSheet, tocSheet };
}

const payload = (overrides = {}) => ({
  category: 'Programming',
  section: 'JavaScript',
  lesson: 'Variables',
  expectedPageVersion: 4,
  expectedTocVersion: 7,
  tocData: [
    { type: 'SubjectText', text: 'JavaScript' },
    { type: 'LessonText', text: 'Variables' },
    { type: 'LessonText', text: 'Functions' },
  ],
  pageElements: [{ type: 'Paragraph', text: 'New content', language: '' }],
  ...overrides,
});

const principal = {
  uid: 'editor-uid',
  email: 'editor@example.com',
  displayName: 'Example Editor',
};

test('locks, checks versions, writes both sheets, then clears stale cells', () => {
  const { context, events, lock, pageSheet, tocSheet } = loadScript();
  const result = context.saveVersionedContent(payload(), principal, {
    pages: 'pages',
    toc: 'toc',
  });

  assert.deepEqual(clone(result), { pageVersion: 5, tocVersion: 8 });
  assert.equal(lock.released, true);
  assert.equal(pageSheet.usedValues()[0][3], 5);
  assert.equal(tocSheet.usedValues()[0][2], 8);

  const updateIndexes = events
    .map((event, index) => (event.type === 'update' ? index : -1))
    .filter((index) => index >= 0);
  const firstClear = events.findIndex((event) => event.type === 'clear');
  assert.equal(updateIndexes.length, 2);
  assert.ok(firstClear > updateIndexes[1], 'stale cells clear only after both writes');
  assert.ok(
    events
      .filter((event) => event.type === 'update')
      .every((event) => event.options.valueInputOption === 'RAW')
  );
});

test('rejects stale versions before any sheet write', () => {
  const { context, events, lock } = loadScript();
  assert.throws(
    () =>
      context.saveVersionedContent(
        payload({ expectedPageVersion: 3 }),
        principal,
        { pages: 'pages', toc: 'toc' }
      ),
    (error) => error.code === 'VERSION_CONFLICT'
  );
  assert.equal(events.some((event) => event.type === 'update'), false);
  assert.equal(lock.released, true);
});

test('does not rewrite or bump an unchanged TOC', () => {
  const { context, events } = loadScript();
  const result = context.saveVersionedContent(
    payload({
      tocData: [
        { type: 'SubjectText', text: 'JavaScript' },
        { type: 'LessonText', text: 'Variables' },
        { type: 'LessonText', text: 'Stale lesson' },
      ],
    }),
    principal,
    { pages: 'pages', toc: 'toc' }
  );

  assert.deepEqual(clone(result), { pageVersion: 5, tocVersion: 7 });
  assert.deepEqual(
    events
      .filter((event) => event.type === 'update')
      .map((event) => event.spreadsheetId),
    ['pages']
  );
});

test('restores the first sheet if the second sheet write fails', () => {
  const { context, pageSheet, tocSheet, lock } = loadScript({
    failOnceFor: 'toc',
  });
  const originalPage = pageSheet.usedValues();
  const originalToc = tocSheet.usedValues();

  assert.throws(
    () =>
      context.saveVersionedContent(payload(), principal, {
        pages: 'pages',
        toc: 'toc',
      }),
    /simulated write failure/
  );
  assert.deepEqual(pageSheet.usedValues(), originalPage);
  assert.deepEqual(tocSheet.usedValues(), originalToc);
  assert.equal(lock.released, true);
});

test('reports a busy save without touching spreadsheets', () => {
  const { context, events, lock } = loadScript({ lockAvailable: false });
  assert.throws(
    () =>
      context.saveVersionedContent(payload(), principal, {
        pages: 'pages',
        toc: 'toc',
      }),
    (error) => error.code === 'SAVE_BUSY'
  );
  assert.equal(events.some((event) => event.type === 'update'), false);
  assert.equal(lock.released, false);
});
