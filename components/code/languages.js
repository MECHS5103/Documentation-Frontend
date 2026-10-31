// Languages the Code pill knows: their look (header colour, body tint, light or
// dark body), the indent a Tab key inserts, and the rules used to colour the code.

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

// --- Rule building blocks (each is a regex source with no capturing groups) -----
const lineComment = (prefix) => `${esc(prefix)}[^\\n]*`;
const blockComment = (open, close) => `${esc(open)}[\\s\\S]*?(?:${esc(close)}|(?![\\s\\S]))`;
const dq = '"(?:\\\\.|[^"\\\\\\n])*"?';
const sq = "'(?:\\\\.|[^'\\\\\\n])*'?";
const template = '`(?:\\\\[\\s\\S]|[^`\\\\])*`?';
const tripleDq = '"""[\\s\\S]*?(?:"""|(?![\\s\\S]))';
const tripleSq = "'''[\\s\\S]*?(?:'''|(?![\\s\\S]))";
const number = '\\b(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|\\d[\\d_]*\\.?\\d*(?:[eE][+-]?\\d+)?[fFlLdDuU]*)\\b';
const words = (list) => `\\b(?:${list.join('|')})\\b`;
const call = '\\b[A-Za-z_$][\\w$]*(?=\\s*\\()';
const capitalised = '\\b[A-Z][A-Za-z0-9_]*\\b';

const CLIKE_KEYWORDS = [
  'abstract', 'assert', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'do', 'else', 'enum',
  'extends', 'final', 'finally', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'interface', 'native',
  'new', 'package', 'private', 'protected', 'public', 'return', 'static', 'strictfp', 'super', 'switch',
  'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'volatile', 'while', 'var', 'record', 'sealed',
  'permits', 'yield', 'true', 'false', 'null', 'void', 'int', 'long', 'double', 'float', 'boolean', 'byte',
  'short', 'char',
];

const LANGUAGES = [
  {
    id: 'java', label: 'Java', ext: '.java', aliases: [],
    header: '#D35F00', headerText: '#FFFFFF', tint: '#FFF6EE', indent: 4,
    rules: [
      ['comment', blockComment('/*', '*/')], ['comment', lineComment('//')],
      ['string', tripleDq], ['string', dq], ['string', sq],
      ['annotation', '@[A-Za-z_]\\w*'], ['keyword', words(CLIKE_KEYWORDS)], ['number', number],
      ['function', call], ['type', capitalised],
    ],
  },
  {
    id: 'kotlin', label: 'Kotlin', ext: '.kt', aliases: ['kt'],
    header: '#7F52FF', headerText: '#FFFFFF', tint: '#F6F2FF', indent: 4,
    rules: [
      ['comment', blockComment('/*', '*/')], ['comment', lineComment('//')],
      ['string', tripleDq], ['string', dq], ['string', sq],
      ['annotation', '@[A-Za-z_]\\w*'],
      ['keyword', words(['as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', 'interface', 'is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'val', 'var', 'when', 'while', 'import', 'override', 'private', 'public', 'protected', 'internal', 'open', 'abstract', 'data', 'sealed', 'companion', 'init', 'lateinit', 'const', 'suspend', 'by'])],
      ['number', number], ['function', call], ['type', capitalised],
    ],
  },
  {
    id: 'python', label: 'Python', ext: '.py', aliases: ['py'],
    header: '#3776AB', headerText: '#FFFFFF', tint: '#F1F6FB', indent: 4,
    rules: [
      ['comment', lineComment('#')], ['string', tripleDq], ['string', tripleSq], ['string', dq], ['string', sq],
      ['annotation', '@[A-Za-z_][\\w.]*'],
      ['keyword', words(['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield', 'self', 'match', 'case'])],
      ['number', number], ['function', call], ['type', capitalised],
    ],
  },
  {
    id: 'javascript', label: 'JavaScript', ext: '.js', aliases: ['js', 'jsx', 'node'],
    header: '#F0DB4F', headerText: '#1A202C', tint: '#FFFEF0', indent: 2,
    rules: [
      ['comment', blockComment('/*', '*/')], ['comment', lineComment('//')],
      ['string', template], ['string', dq], ['string', sq],
      ['keyword', words(['async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'null', 'of', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while', 'with', 'yield'])],
      ['number', number], ['function', call], ['type', capitalised],
    ],
  },
  {
    id: 'typescript', label: 'TypeScript', ext: '.ts', aliases: ['ts', 'tsx'],
    header: '#3178C6', headerText: '#FFFFFF', tint: '#F0F6FD', indent: 2,
    rules: [
      ['comment', blockComment('/*', '*/')], ['comment', lineComment('//')],
      ['string', template], ['string', dq], ['string', sq],
      ['annotation', '@[A-Za-z_]\\w*'],
      ['keyword', words(['abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case', 'catch', 'class', 'const', 'continue', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'keyof', 'let', 'namespace', 'never', 'new', 'null', 'number', 'of', 'private', 'protected', 'public', 'readonly', 'return', 'static', 'string', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'unknown', 'var', 'void', 'while', 'yield'])],
      ['number', number], ['function', call], ['type', capitalised],
    ],
  },
  {
    id: 'c', label: 'C', ext: '.c', aliases: [],
    header: '#5A6BA8', headerText: '#FFFFFF', tint: '#F3F4FA', indent: 4,
    rules: [
      ['comment', blockComment('/*', '*/')], ['comment', lineComment('//')],
      ['string', dq], ['string', sq], ['annotation', '^[ \\t]*#\\s*\\w+'],
      ['keyword', words(['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'NULL', 'true', 'false', 'bool'])],
      ['number', number], ['function', call], ['type', capitalised],
    ],
  },
  {
    id: 'cpp', label: 'C++', ext: '.cpp', aliases: ['c++', 'cc', 'arduino', 'h', 'hpp'],
    header: '#00599C', headerText: '#FFFFFF', tint: '#F0F6FB', indent: 4,
    rules: [
      ['comment', blockComment('/*', '*/')], ['comment', lineComment('//')],
      ['string', dq], ['string', sq], ['annotation', '^[ \\t]*#\\s*\\w+'],
      ['keyword', words(['alignas', 'auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'constexpr', 'continue', 'default', 'delete', 'do', 'double', 'else', 'enum', 'explicit', 'extern', 'false', 'final', 'float', 'for', 'friend', 'if', 'inline', 'int', 'long', 'namespace', 'new', 'noexcept', 'nullptr', 'operator', 'override', 'private', 'protected', 'public', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'template', 'this', 'throw', 'true', 'try', 'typedef', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'while'])],
      ['number', number], ['function', call], ['type', capitalised],
    ],
  },
  {
    id: 'csharp', label: 'C#', ext: '.cs', aliases: ['cs', 'c#'],
    header: '#68217A', headerText: '#FFFFFF', tint: '#F8F1FA', indent: 4,
    rules: [
      ['comment', blockComment('/*', '*/')], ['comment', lineComment('//')],
      ['string', '@?"(?:""|\\\\.|[^"\\\\])*"?'], ['string', sq],
      ['keyword', words(['abstract', 'as', 'async', 'await', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'decimal', 'default', 'do', 'double', 'else', 'enum', 'false', 'finally', 'float', 'for', 'foreach', 'if', 'in', 'int', 'interface', 'internal', 'is', 'long', 'namespace', 'new', 'null', 'object', 'out', 'override', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sealed', 'short', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'using', 'var', 'virtual', 'void', 'while'])],
      ['number', number], ['function', call], ['type', capitalised],
    ],
  },
  {
    id: 'json', label: 'JSON', ext: '.json', aliases: [],
    header: '#5B6B7B', headerText: '#FFFFFF', tint: '#F5F7FA', indent: 2,
    rules: [
      ['key', '"(?:\\\\.|[^"\\\\\\n])*"(?=\\s*:)'], ['string', dq],
      ['keyword', words(['true', 'false', 'null'])], ['number', '-?\\b\\d+\\.?\\d*(?:[eE][+-]?\\d+)?\\b'],
    ],
  },
  {
    id: 'html', label: 'HTML', ext: '.html', aliases: ['htm'],
    header: '#E34F26', headerText: '#FFFFFF', tint: '#FFF3EF', indent: 2,
    rules: [
      ['comment', blockComment('<!--', '-->')], ['tag', '<\\/?[A-Za-z][\\w:-]*'], ['tag', '\\/?>'],
      ['string', dq], ['string', sq], ['attr', '[A-Za-z_:][\\w:.-]*(?=\\s*=)'],
    ],
  },
  {
    id: 'xml', label: 'XML', ext: '.xml', aliases: ['svg', 'xaml'],
    header: '#0F7B6C', headerText: '#FFFFFF', tint: '#F0FAF8', indent: 2,
    rules: [
      ['comment', blockComment('<!--', '-->')], ['tag', '<[?\\/!]?[A-Za-z][\\w:.-]*'], ['tag', '[?\\/]?>'],
      ['string', dq], ['string', sq], ['attr', '[A-Za-z_:][\\w:.-]*(?=\\s*=)'],
    ],
  },
  {
    id: 'css', label: 'CSS', ext: '.css', aliases: ['scss', 'less'],
    header: '#1572B6', headerText: '#FFFFFF', tint: '#F0F7FC', indent: 2,
    rules: [
      ['comment', blockComment('/*', '*/')], ['string', dq], ['string', sq], ['annotation', '@[\\w-]+'],
      ['number', '#[0-9a-fA-F]{3,8}\\b'], ['attr', '[A-Za-z-]+(?=\\s*:)'], ['type', '[.#][A-Za-z_][\\w-]*'],
      ['number', '-?\\d*\\.?\\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr)?\\b'], ['function', call],
    ],
  },
  {
    id: 'sql', label: 'SQL', ext: '.sql', aliases: ['mysql', 'postgres', 'sqlite'], ci: true,
    header: '#336791', headerText: '#FFFFFF', tint: '#F0F5F9', indent: 2,
    rules: [
      ['comment', lineComment('--')], ['comment', blockComment('/*', '*/')], ['string', sq], ['string', dq],
      ['keyword', words(['select', 'from', 'where', 'and', 'or', 'not', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table', 'drop', 'alter', 'add', 'join', 'inner', 'left', 'right', 'outer', 'on', 'group', 'by', 'order', 'having', 'limit', 'offset', 'as', 'distinct', 'null', 'is', 'in', 'like', 'between', 'union', 'all', 'primary', 'key', 'foreign', 'references', 'index', 'view', 'case', 'when', 'then', 'else', 'end', 'asc', 'desc', 'count', 'sum', 'avg', 'min', 'max'])],
      ['number', number], ['function', call],
    ],
  },
  {
    id: 'yaml', label: 'YAML', ext: '.yml', aliases: ['yml'],
    header: '#CB171E', headerText: '#FFFFFF', tint: '#FFF2F2', indent: 2,
    rules: [
      ['comment', lineComment('#')], ['key', '^[ \\t]*(?:- )?[\\w.\\-/ ]+(?=:(?:\\s|$))'], ['string', dq], ['string', sq],
      ['keyword', words(['true', 'false', 'null', 'yes', 'no'])], ['number', number],
    ],
  },
  {
    id: 'bash', label: 'Shell / Terminal', ext: '.sh', aliases: ['sh', 'shell', 'zsh', 'terminal', 'console', 'cmd'],
    header: '#2F855A', headerText: '#FFFFFF', tint: '#1A202C', dark: true, indent: 2,
    rules: [
      ['comment', lineComment('#')], ['string', dq], ['string', sq],
      ['variable', '\\$(?:\\{[^}]*\\}|\\w+|[@#?*$!0-9])'],
      ['keyword', words(['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'in', 'return', 'exit', 'export', 'local', 'source', 'sudo', 'echo', 'cd', 'ls', 'git', 'npm', 'node', 'cat', 'grep', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'curl', 'pip', 'python', 'gradlew'])],
      ['attr', '\\B-{1,2}[A-Za-z][\\w-]*'], ['number', number],
    ],
  },
  {
    id: 'powershell', label: 'PowerShell', ext: '.ps1', aliases: ['ps', 'ps1', 'pwsh'], ci: true,
    header: '#2D6CB5', headerText: '#FFFFFF', tint: '#0F2A52', dark: true, indent: 4,
    rules: [
      ['comment', lineComment('#')], ['string', dq], ['string', sq],
      ['variable', '\\$[\\w:]+'],
      ['keyword', words(['if', 'else', 'elseif', 'foreach', 'for', 'while', 'function', 'return', 'param', 'try', 'catch', 'finally', 'switch', 'break', 'continue'])],
      ['function', '\\b[A-Z][a-z]+-[A-Za-z]+\\b'], ['attr', '\\B-[A-Za-z]\\w*'], ['number', number],
    ],
  },
  {
    id: 'text', label: 'Plain text', ext: '.txt', aliases: ['plain', 'plaintext', 'none'],
    header: '#4A5568', headerText: '#FFFFFF', tint: '#F7FAFC', indent: 2,
    rules: [],
  },
];

export const CODE_LANGUAGES = LANGUAGES;

const byKey = {};
LANGUAGES.forEach((lang) => {
  byKey[lang.id] = lang;
  byKey[lang.label.toLowerCase()] = lang;
  lang.aliases.forEach((alias) => {
    byKey[alias] = lang;
  });
});

// Accepts whatever was saved before ("Java", "java", "C++", "") and finds the language.
export const findLanguage = (name) => {
  const key = String(name || '').trim().toLowerCase();
  return byKey[key] || (key ? null : byKey.java);
};

// A language the list doesn't know is shown as plain text under its own name.
export const languageFor = (name) => {
  const known = findLanguage(name);
  if (known) return known;
  return { ...byKey.text, id: 'custom', label: String(name).trim().slice(0, 40) || 'Code' };
};

// --- Colouring -----------------------------------------------------------------

export const TOKEN_COLORS_LIGHT = {
  keyword: '#9B2C9B', string: '#2F855A', comment: '#718096', number: '#C05621', type: '#0B7285',
  function: '#2B6CB0', annotation: '#B7791F', tag: '#C53030', attr: '#B7791F', key: '#2B6CB0', variable: '#C05621',
};
export const TOKEN_COLORS_DARK = {
  keyword: '#D6A5FF', string: '#9AE6B4', comment: '#8794A8', number: '#FBB669', type: '#7EDCEB',
  function: '#90CDF4', annotation: '#F6E05E', tag: '#FEB2B2', attr: '#F6E05E', key: '#90CDF4', variable: '#FBB669',
};

const compiled = new Map();
const compile = (lang) => {
  if (compiled.has(lang.id)) return compiled.get(lang.id);
  let result = null;
  if (lang.rules.length) {
    const source = lang.rules.map(([, src]) => `(${src})`).join('|');
    result = { re: new RegExp(source, `gm${lang.ci ? 'i' : ''}`), kinds: lang.rules.map(([kind]) => kind) };
  }
  compiled.set(lang.id, result);
  return result;
};

// Splits code into lines of { text, kind } pieces (kind is undefined for plain text).
export const highlight = (code, lang) => {
  const lines = [[]];
  const push = (text, kind) => {
    const parts = text.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part !== '') lines[lines.length - 1].push({ text: part, kind });
    });
  };
  const program = compile(lang);
  const source = String(code || '');
  if (!program) {
    push(source, undefined);
    return lines;
  }
  const { re, kinds } = program;
  re.lastIndex = 0;
  let pos = 0;
  let m = re.exec(source);
  while (m) {
    if (m[0] === '') {
      re.lastIndex += 1;
    } else {
      if (m.index > pos) push(source.slice(pos, m.index), undefined);
      let which = 0;
      for (let i = 1; i < m.length; i += 1) {
        if (m[i] !== undefined) {
          which = i - 1;
          break;
        }
      }
      push(m[0], kinds[which]);
      pos = m.index + m[0].length;
    }
    m = re.exec(source);
  }
  if (pos < source.length) push(source.slice(pos), undefined);
  return lines;
};
