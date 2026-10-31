const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

// The model is plain ES-module JavaScript. Strip the `export` keywords and run
// it so these tests need no build step.
const source = fs
  .readFileSync(path.join(__dirname, '..', 'components', 'sheets', 'sheetModel.js'), 'utf8')
  .replace(/^export /gm, '');
const context = { console, JSON, Math, Number, String, Object, Array, Map, Set };
vm.createContext(context);
vm.runInContext(source + '\nthis.api = { colName, cellName, makeAxis, emptySheet, starterSheet, parseSheet, applyStyle, applyBorders, resolveStyle, parseTSV, toTSV, pasteRows, readRange, setCellValue, clearRange, clearFormatting, usedExtent, setSize, normalizeSheet, insertLines, deleteLines };', context);
const m = context.api;
const clone = (v) => JSON.parse(JSON.stringify(v));

test('column letters run A..Z, AA.. forever', () => {
  assert.equal(m.colName(0), 'A');
  assert.equal(m.colName(25), 'Z');
  assert.equal(m.colName(26), 'AA');
  assert.equal(m.colName(701), 'ZZ');
  assert.equal(m.colName(702), 'AAA');
  assert.equal(m.cellName(2, 1), 'B3');
});

test('axis offsets and lookups agree, with and without resized columns', () => {
  const plain = m.makeAxis(100, {});
  assert.equal(plain.offset(5), 500);
  assert.equal(plain.indexAt(499), 4);
  assert.equal(plain.indexAt(500), 5);

  const axis = m.makeAxis(100, { 1: 200, 3: 50 });
  assert.equal(axis.offset(0), 0);
  assert.equal(axis.offset(1), 100);
  assert.equal(axis.offset(2), 300);
  assert.equal(axis.offset(4), 450);
  assert.equal(axis.offset(1000000), 1000000 * 100 + 100 - 50);
  for (let i = 0; i < 60; i += 1) {
    const start = axis.offset(i);
    assert.equal(axis.indexAt(start), i);
    assert.equal(axis.indexAt(start + axis.sizeAt(i) - 1), i);
  }
  // Far out: still exact and instant.
  const far = axis.offset(5000000);
  assert.equal(axis.indexAt(far), 5000000);
});

test('only filled cells are stored', () => {
  let data = m.emptySheet();
  data = m.setCellValue(data, 1000000, 500000, 'far away');
  assert.deepEqual(Object.keys(data.cells), ['1000000,500000']);
  data = m.setCellValue(data, 1000000, 500000, '');
  assert.deepEqual(Object.keys(data.cells), []);
});

test('styles layer: theme < sheet < column < row < cell', () => {
  let data = m.emptySheet();
  data = m.applyStyle(data, { kind: 'all' }, { bg: '#111111' });
  data = m.applyStyle(data, { kind: 'col', c1: 2, c2: 2 }, { bg: '#222222' });
  data = m.applyStyle(data, { kind: 'row', r1: 3, r2: 3 }, { bg: '#333333' });
  data = m.applyStyle(data, { kind: 'cell', r1: 3, r2: 3, c1: 2, c2: 2 }, { bg: '#444444' });
  assert.equal(m.resolveStyle(data, 0, 0).bg, '#111111');
  assert.equal(m.resolveStyle(data, 0, 2).bg, '#222222');
  assert.equal(m.resolveStyle(data, 3, 0).bg, '#333333');
  assert.equal(m.resolveStyle(data, 3, 2).bg, '#444444');
});

test('formatting a whole column replaces earlier cell formatting in it', () => {
  let data = m.emptySheet();
  data = m.applyStyle(data, { kind: 'cell', r1: 0, r2: 4, c1: 1, c2: 1 }, { b: 1, bg: '#ff0000' });
  data = m.applyStyle(data, { kind: 'col', c1: 1, c2: 1 }, { bg: '#00ff00' });
  assert.equal(m.resolveStyle(data, 2, 1).bg, '#00ff00');
  assert.equal(m.resolveStyle(data, 2, 1).b, 1);
});

test('removing formatting with null leaves no empty leftovers', () => {
  let data = m.emptySheet();
  const sel = { kind: 'cell', r1: 0, r2: 1, c1: 0, c2: 1 };
  data = m.applyStyle(data, sel, { b: 1 });
  assert.equal(Object.keys(data.cells).length, 4);
  data = m.applyStyle(data, sel, { b: null });
  assert.equal(Object.keys(data.cells).length, 0);
});

test('header row and banding come from the options', () => {
  const data = m.emptySheet();
  data.opts.headerRow = true;
  data.opts.banded = true;
  assert.equal(m.resolveStyle(data, 0, 0).b, 1);
  assert.ok(m.resolveStyle(data, 0, 0).bg);
  assert.equal(m.resolveStyle(data, 1, 0).bg, undefined);
  assert.ok(m.resolveStyle(data, 2, 0).bg);
});

test('borders are mirrored onto the neighbouring cell so the line is drawn once', () => {
  let data = m.emptySheet();
  data = m.applyBorders(data, { kind: 'cell', r1: 1, r2: 2, c1: 1, c2: 2 }, 'outer');
  assert.equal(data.cells['1,1'].bd, 'tl');
  assert.equal(data.cells['2,2'].bd, 'rb');
  assert.equal(data.cells['0,1'].bd, 'b'); // the line above the block
  assert.equal(data.cells['1,0'].bd, 'r');
  data = m.applyBorders(data, { kind: 'cell', r1: 1, r2: 2, c1: 1, c2: 2 }, 'none');
  assert.deepEqual(Object.keys(data.cells), []);
});

test('copy and paste round-trip tab-separated text, including quotes and newlines', () => {
  const rows = [['a', 'b\tc'], ['line1\nline2', 'say "hi"']];
  assert.deepEqual(clone(m.parseTSV(m.toTSV(rows))), rows);
  assert.deepEqual(clone(m.parseTSV('1\t2\r\n3\t4\r\n')), [['1', '2'], ['3', '4']]);
  let data = m.emptySheet();
  data = m.pasteRows(data, 2, 3, [['x', 'y'], ['z', '']]);
  assert.equal(data.cells['2,3'].v, 'x');
  assert.equal(data.cells['3,3'].v, 'z');
  assert.equal(data.cells['3,4'], undefined);
  assert.deepEqual(clone(m.readRange(data, { kind: 'cell', r1: 2, r2: 3, c1: 3, c2: 4 })), [['x', 'y'], ['z', '']]);
});

test('clearing contents keeps formatting; clearing formatting keeps contents', () => {
  let data = m.emptySheet();
  data = m.setCellValue(data, 0, 0, 'hello');
  data = m.applyStyle(data, { kind: 'cell', r1: 0, r2: 0, c1: 0, c2: 0 }, { b: 1 });
  const sel = { kind: 'cell', r1: 0, r2: 0, c1: 0, c2: 0 };
  const cleared = m.clearRange(data, sel);
  assert.equal(cleared.cells['0,0'].v, undefined);
  assert.equal(cleared.cells['0,0'].b, 1);
  const plain = m.clearFormatting(data, sel);
  assert.equal(plain.cells['0,0'].v, 'hello');
  assert.equal(plain.cells['0,0'].b, undefined);
});

test('bad or missing sheet data falls back to a usable starter sheet', () => {
  for (const text of ['', 'nope', '[]', '{"cells":5}']) {
    const sheet = m.parseSheet(text);
    assert.ok(sheet.cells);
    assert.ok(sheet.opts);
  }
  const roundTrip = m.parseSheet(JSON.stringify(m.starterSheet()));
  assert.equal(roundTrip.cells['0,0'].v, 'Campaign');
});

test('resizing clamps to sensible limits', () => {
  const data = m.setSize(m.emptySheet(), 'col', [0, 2], 5000);
  assert.equal(data.colW[0], 800);
  assert.equal(m.setSize(data, 'row', [1], 1).rowH[1], 16);
});

test('inserting rows/columns shifts cells, sizes, styles and the freeze line', () => {
  let d = m.emptySheet();
  d.cells = { '0,0': { v: 'a' }, '2,1': { v: 'b' }, '5,3': { v: 'c' } };
  d.rowH = { 2: 50 };
  d.colW = { 1: 150 };
  d.rowS = { 5: { b: 1 } };
  d.opts.freezeR = 1;
  d = m.insertLines(d, 'row', 2, 2);
  assert.equal(d.cells['0,0'].v, 'a');
  assert.equal(d.cells['4,1'].v, 'b');
  assert.equal(d.cells['7,3'].v, 'c');
  assert.equal(d.rowH[4], 50);
  assert.ok(d.rowS[7]);
  assert.equal(d.colW[1], 150);
  assert.equal(d.opts.freezeR, 1);
  d = m.insertLines(d, 'row', 0, 1);
  assert.equal(d.opts.freezeR, 2);
  d = m.insertLines(d, 'col', 1, 1);
  assert.equal(d.cells['5,2'].v, 'b');
  assert.equal(d.colW[2], 150);
});

test('deleting rows/columns removes them and closes the gap', () => {
  let d = m.emptySheet();
  d.cells = { '0,0': { v: 'a' }, '2,1': { v: 'b' }, '3,1': { v: 'c' }, '5,3': { v: 'd' } };
  d.rowH = { 2: 50, 6: 70 };
  d.opts.freezeR = 4;
  d = m.deleteLines(d, 'row', 2, 3);
  assert.equal(d.cells['0,0'].v, 'a');
  assert.equal(d.cells['2,1'], undefined);
  assert.equal(d.cells['3,3'].v, 'd');
  assert.equal(d.rowH[2], undefined);
  assert.equal(d.rowH[4], 70);
  assert.equal(d.opts.freezeR, 2);
  d = m.deleteLines(d, 'col', 3, 3);
  assert.equal(Object.keys(d.cells).length, 1);
  const flipped = m.deleteLines(m.insertLines(m.emptySheet(), 'col', 0, 3), 'col', 2, 0);
  assert.equal(Object.keys(flipped.cells).length, 0);
});
