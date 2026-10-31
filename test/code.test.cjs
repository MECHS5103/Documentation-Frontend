const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = fs
  .readFileSync(path.join(__dirname, '..', 'components', 'code', 'languages.js'), 'utf8')
  .replace(/^export /gm, '');
const context = { console, String, Map, RegExp, Object, Array };
vm.createContext(context);
vm.runInContext(source + '\nthis.api = { findLanguage, languageFor, highlight, CODE_LANGUAGES };', context);
const api = context.api;

const kinds = (code, lang) =>
  api.highlight(code, api.findLanguage(lang)).map((line) => line.map((p) => `${p.kind || '-'}:${p.text}`));

test('old saved language names still resolve', () => {
  assert.equal(api.findLanguage('Java').id, 'java');
  assert.equal(api.findLanguage('java').id, 'java');
  assert.equal(api.findLanguage('C++').id, 'cpp');
  assert.equal(api.findLanguage('JS').id, 'javascript');
  assert.equal(api.findLanguage('').id, 'java'); // empty used to mean the default
  assert.equal(api.findLanguage('Brainfuck'), null);
  assert.equal(api.languageFor('Brainfuck').label, 'Brainfuck');
});

test('Java: keywords, types, strings, numbers, comments, annotations', () => {
  const [line] = kinds('public static int x = 5; // hi', 'java');
  assert.ok(line.includes('keyword:public'));
  assert.ok(line.includes('keyword:int'));
  assert.ok(line.includes('number:5'));
  assert.ok(line.some((p) => p.startsWith('comment:// hi')));
  assert.ok(kinds('@Override void run() {}', 'java')[0].includes('annotation:@Override'));
  assert.ok(kinds('String s = "a\\"b";', 'java')[0].includes('type:String'));
  assert.ok(kinds('String s = "a\\"b";', 'java')[0].includes('string:"a\\"b"'));
  assert.ok(kinds('motor.set(1.5)', 'java')[0].includes('function:set'));
});

test('multi-line comments and text stay intact across lines', () => {
  const lines = api.highlight('/* a\n b */\nint x;', api.findLanguage('java'));
  assert.equal(lines.length, 3);
  assert.equal(lines[0][0].kind, 'comment');
  assert.equal(lines[1][0].kind, 'comment');
  assert.equal(lines.map((l) => l.map((p) => p.text).join('')).join('\n'), '/* a\n b */\nint x;');
});

test('python, json, html, css, bash, sql', () => {
  assert.ok(kinds('def run(self): # go', 'python')[0].includes('keyword:def'));
  assert.ok(kinds('x = """doc\nmore"""', 'python')[0].some((p) => p.startsWith('string:"""doc')));
  assert.ok(kinds('{"a": [1, true]}', 'json')[0].includes('key:"a"'));
  assert.ok(kinds('{"a": [1, true]}', 'json')[0].includes('keyword:true'));
  assert.ok(kinds('<div class="x">hi</div>', 'html')[0].includes('tag:<div'));
  assert.ok(kinds('<div class="x">hi</div>', 'html')[0].includes('attr:class'));
  assert.ok(kinds('a { color: #fff; }', 'css')[0].includes('attr:color'));
  assert.ok(kinds('echo $HOME --flag', 'bash')[0].includes('variable:$HOME'));
  assert.ok(kinds('echo $HOME --flag', 'bash')[0].includes('attr:--flag'));
  assert.ok(kinds('SELECT * FROM t', 'sql')[0].includes('keyword:SELECT'));
});

test('unknown languages and empty code do not crash', () => {
  const lines = api.highlight('anything at all', api.languageFor('Zig'));
  assert.equal(lines[0][0].text, 'anything at all');
  assert.equal(api.highlight('', api.findLanguage('java')).length, 1);
});
