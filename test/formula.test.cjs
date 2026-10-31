const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs
  .readFileSync(path.join(__dirname, '..', 'components', 'sheets', 'formula.js'), 'utf8')
  .replace(/^export /gm, '');
const context = { console, JSON, Math, Number, String, Object, Array, Map, Set, Date, RegExp, Error, Infinity };
vm.createContext(context);
vm.runInContext(source + '\nthis.api = { createEvaluator, shiftFormula, remapFormula, literalValue, formatValue, isFormula };', context);
const f = context.api;

const sheet = (rows, bounds) => {
  const cells = {};
  rows.forEach((row, r) => row.forEach((v, c) => { if (v !== '') cells[`${r},${c}`] = { v }; }));
  return f.createEvaluator(cells, bounds);
};
const show = (rows, r, c) => sheet(rows).display(r, c);

test('arithmetic, precedence, percent, text join', () => {
  assert.equal(show([['=1+2*3']], 0, 0), '7');
  assert.equal(show([['=(1+2)*3']], 0, 0), '9');
  assert.equal(show([['=2^3^2']], 0, 0), '64'); // left associative like spreadsheets
  assert.equal(show([['=-2^2']], 0, 0), '4');
  assert.equal(show([['=50%']], 0, 0), '0.5');
  assert.equal(show([['="a"&"b"&1']], 0, 0), 'ab1');
  assert.equal(show([['=0.1+0.2']], 0, 0), '0.3');
});

test('references, ranges and the common aggregate functions', () => {
  const rows = [['1', '2', '=A1+B1'], ['3', '4', '=SUM(A1:B2)'], ['x', '', '=AVERAGE(A1:A3)'], ['', '', '=COUNT(A1:B3)']];
  const ev = sheet(rows);
  assert.equal(ev.display(0, 2), '3');
  assert.equal(ev.display(1, 2), '10');
  assert.equal(ev.display(2, 2), '2'); // text skipped inside a range
  assert.equal(ev.display(3, 2), '4');
  assert.equal(show([['=MAX(1,5,3)'], ['=MIN(4,2)'], ['=MEDIAN(1,9,5)'], ['=PRODUCT(2,3,4)']], 2, 0), '5');
});

test('IF, IFERROR, logic and errors', () => {
  assert.equal(show([['=IF(1>2,"yes","no")']], 0, 0), 'no');
  assert.equal(show([['=IF(AND(1<2,2<3),1,0)']], 0, 0), '1');
  assert.equal(show([['=1/0']], 0, 0), '#DIV/0!');
  assert.equal(show([['=IFERROR(1/0,"oops")']], 0, 0), 'oops');
  assert.equal(show([['=NOPE(1)']], 0, 0), '#NAME?');
  assert.equal(show([['=1+']], 0, 0), '#ERROR!');
  assert.equal(show([['="a"+1']], 0, 0), '#VALUE!');
  assert.equal(show([['=A2'], ['=A1']], 0, 0), '#CIRC!');
  assert.equal(show([['=A1']], 0, 0), '#CIRC!');
});

test('text functions', () => {
  assert.equal(show([['=UPPER("abc")&LOWER("DEF")']], 0, 0), 'ABCdef');
  assert.equal(show([['=LEFT("hello",2)&RIGHT("hello",3)&MID("hello",2,2)']], 0, 0), 'hellloel'.slice(0,0) + 'he' + 'llo' + 'el');
  assert.equal(show([['=LEN("abcd")']], 0, 0), '4');
  assert.equal(show([['=TRIM("  a   b ")']], 0, 0), 'a b');
  assert.equal(show([['=SUBSTITUTE("a-b-c","-","+")']], 0, 0), 'a+b+c');
  assert.equal(show([['=TEXT(1234.5,"#,##0.00")']], 0, 0), '1,234.50');
});

test('SUMIF / COUNTIF / VLOOKUP', () => {
  const rows = [['a', '1'], ['b', '2'], ['a', '3'], ['', '=SUMIF(A1:A3,"a",B1:B3)'], ['', '=COUNTIF(B1:B3,">1")'], ['', '=VLOOKUP("b",A1:B3,2,FALSE)']];
  const ev = sheet(rows);
  assert.equal(ev.display(3, 1), '4');
  assert.equal(ev.display(4, 1), '2');
  assert.equal(ev.display(5, 1), '2');
});

test('rounding and number formats', () => {
  assert.equal(show([['=ROUND(2.5,0)'], ['=ROUND(-2.5,0)'], ['=ROUND(1.005,2)']], 0, 0), '3');
  assert.equal(show([['=ROUND(-2.5,0)']], 0, 0), '-3');
  assert.equal(f.formatValue(1234.567, 'cur'), '$1,234.57');
  assert.equal(f.formatValue(0.1234, 'pct'), '12.34%');
  assert.equal(f.formatValue(1234.5, 'n0'), '1,235');
  assert.equal(f.formatValue(-0.001, 'n2'), '0.00');
  assert.equal(f.formatValue(46022, 'date'), '12/31/2025');
  const ev = f.createEvaluator({ '0,0': { v: '1234.5', nf: 'cur' }, '0,1': { v: '007', nf: 'text' } });
  assert.equal(ev.display(0, 0), '$1,234.50');
  assert.equal(ev.display(0, 1), '007');
});

test('typed numbers are recognised', () => {
  assert.equal(f.literalValue('12'), 12);
  assert.equal(f.literalValue('1,200'), 1200);
  assert.equal(f.literalValue('$1,200.50'), 1200.5);
  assert.equal(f.literalValue('25%'), 0.25);
  assert.equal(f.literalValue('abc'), 'abc');
  assert.equal(f.literalValue('12abc'), '12abc');
  assert.equal(show([['$1,200', '=A1*2']], 0, 1), '2400');
});

test('bounded sheets give #REF! outside their edge', () => {
  const ev = f.createEvaluator({ '0,0': { v: '=Z99' } }, { rows: 10, cols: 10 });
  assert.equal(ev.display(0, 0), '#REF!');
});

test('shiftFormula moves relative references only', () => {
  assert.equal(f.shiftFormula('=A1+$B$2+C$3+$D4', 1, 1), '=B2+$B$2+D$3+$D5');
  assert.equal(f.shiftFormula('=SUM(A1:B2)', 2, 0), '=SUM(A3:B4)');
  assert.equal(f.shiftFormula('=A1', -1, 0), '=#REF!');
  assert.equal(f.shiftFormula('plain', 1, 1), 'plain');
  assert.equal(f.shiftFormula('=A1&"A1"', 1, 0), '=A2&"A1"');
});

test('remapFormula follows inserts and deletes', () => {
  assert.equal(f.remapFormula('=A1+A3', 'row', { type: 'insert', at: 1, count: 2 }), '=A1+A5');
  assert.equal(f.remapFormula('=SUM(A1:A3)', 'row', { type: 'insert', at: 1, count: 1 }), '=SUM(A1:A4)');
  assert.equal(f.remapFormula('=A1+B1', 'col', { type: 'insert', at: 0, count: 1 }), '=B1+C1');
  assert.equal(f.remapFormula('=A2', 'row', { type: 'delete', first: 1, last: 1 }), '=#REF!');
  assert.equal(f.remapFormula('=A3', 'row', { type: 'delete', first: 1, last: 1 }), '=A2');
  assert.equal(f.remapFormula('=SUM(A1:A4)', 'row', { type: 'delete', first: 1, last: 2 }), '=SUM(A1:A2)');
  assert.equal(f.remapFormula('=SUM(A2:A3)', 'row', { type: 'delete', first: 1, last: 2 }), '=SUM(#REF!)');
});
