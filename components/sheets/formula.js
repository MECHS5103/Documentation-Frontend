// A small spreadsheet formula engine: parser, evaluator, and reference
// rewriting (for fill, paste, and inserting / deleting rows and columns).
// Pure JavaScript with no dependencies so it can be tested without a build.

// --- Cell references ----------------------------------------------------------

const REF_RE = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})$/;

const lettersToIndex = (letters) => {
  let n = 0;
  const up = letters.toUpperCase();
  for (let i = 0; i < up.length; i += 1) n = n * 26 + (up.charCodeAt(i) - 64);
  return n - 1;
};

const indexToLetters = (index) => {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};

const parseRef = (text) => {
  const m = REF_RE.exec(text);
  if (!m) return null;
  const col = lettersToIndex(m[2]);
  const row = Number(m[4]) - 1;
  if (row < 0 || col > 18277) return null;
  return { r: row, c: col, ar: m[3] === '$', ac: m[1] === '$' };
};

const refText = (ref) =>
  `${ref.ac ? '$' : ''}${indexToLetters(ref.c)}${ref.ar ? '$' : ''}${ref.r + 1}`;

// --- Tokenizer ------------------------------------------------------------------

const ERRORS = ['#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#N/A', '#NUM!', '#CIRC!', '#ERROR!'];

// Every token keeps its start / end so formulas can be rewritten in place.
export const tokenize = (src) => {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i += 1;
    } else if (ch === '"') {
      let j = i + 1;
      let value = '';
      let closed = false;
      while (j < n) {
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            value += '"';
            j += 2;
            continue;
          }
          closed = true;
          j += 1;
          break;
        }
        value += src[j];
        j += 1;
      }
      if (!closed) throw new Error('#ERROR!');
      tokens.push({ t: 'str', v: value, s: i, e: j });
      i = j;
    } else if (/[0-9.]/.test(ch)) {
      const m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new Error('#ERROR!');
      tokens.push({ t: 'num', v: Number(m[0]), s: i, e: i + m[0].length });
      i += m[0].length;
    } else if (/[A-Za-z_$]/.test(ch)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_.$]/.test(src[j])) j += 1;
      const word = src.slice(i, j);
      if (src[j] === '(') {
        tokens.push({ t: 'fn', v: word.toUpperCase(), s: i, e: j });
      } else {
        const ref = parseRef(word);
        if (ref) {
          tokens.push({ t: 'ref', ref, s: i, e: j });
        } else if (/^(true|false)$/i.test(word)) {
          tokens.push({ t: 'bool', v: word.toLowerCase() === 'true', s: i, e: j });
        } else {
          tokens.push({ t: 'name', v: word, s: i, e: j });
        }
      }
      i = j;
    } else if (ch === '#') {
      const hit = ERRORS.find((e) => src.startsWith(e, i));
      if (!hit) throw new Error('#ERROR!');
      tokens.push({ t: 'err', v: hit, s: i, e: i + hit.length });
      i += hit.length;
    } else {
      const two = src.slice(i, i + 2);
      if (two === '<=' || two === '>=' || two === '<>') {
        tokens.push({ t: 'op', v: two, s: i, e: i + 2 });
        i += 2;
      } else if ('+-*/^&=<>%(),:'.includes(ch)) {
        tokens.push({ t: 'op', v: ch, s: i, e: i + 1 });
        i += 1;
      } else {
        throw new Error('#ERROR!');
      }
    }
  }
  return tokens;
};

// --- Parser ----------------------------------------------------------------------
// Grammar (lowest to highest precedence):
//   comparison  =  <  >  <=  >=  <>
//   concat      &
//   sum         +  -
//   product     *  /
//   power       ^
//   unary       -  +
//   postfix     %

export const parse = (tokens) => {
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (v) => tokens[p] && tokens[p].t === 'op' && tokens[p].v === v;
  const take = () => tokens[p++];

  const primary = () => {
    const tok = take();
    if (!tok) throw new Error('#ERROR!');
    if (tok.t === 'num') return { k: 'num', v: tok.v };
    if (tok.t === 'str') return { k: 'str', v: tok.v };
    if (tok.t === 'bool') return { k: 'bool', v: tok.v };
    if (tok.t === 'err') return { k: 'err', v: tok.v };
    if (tok.t === 'name') return { k: 'err', v: '#NAME?' };
    if (tok.t === 'ref') {
      if (isOp(':')) {
        take();
        const end = take();
        if (!end || end.t !== 'ref') throw new Error('#ERROR!');
        return { k: 'range', a: tok.ref, b: end.ref };
      }
      return { k: 'ref', ref: tok.ref };
    }
    if (tok.t === 'fn') {
      take(); // (
      const args = [];
      if (isOp(')')) {
        take();
      } else {
        for (;;) {
          if (isOp(',') || isOp(')')) args.push({ k: 'empty' });
          else args.push(comparison());
          if (isOp(',')) {
            take();
            continue;
          }
          if (isOp(')')) {
            take();
            break;
          }
          throw new Error('#ERROR!');
        }
      }
      return { k: 'fn', name: tok.v, args };
    }
    if (tok.t === 'op' && tok.v === '(') {
      const inner = comparison();
      if (!isOp(')')) throw new Error('#ERROR!');
      take();
      return inner;
    }
    throw new Error('#ERROR!');
  };

  const postfix = () => {
    let node = primary();
    while (isOp('%')) {
      take();
      node = { k: 'pct', x: node };
    }
    return node;
  };
  const unary = () => {
    if (isOp('-')) {
      take();
      return { k: 'neg', x: unary() };
    }
    if (isOp('+')) {
      take();
      return unary();
    }
    return postfix();
  };
  const power = () => {
    let left = unary();
    while (isOp('^')) {
      take();
      left = { k: 'bin', op: '^', l: left, r: unary() };
    }
    return left;
  };
  const product = () => {
    let left = power();
    while (isOp('*') || isOp('/')) {
      const op = take().v;
      left = { k: 'bin', op, l: left, r: power() };
    }
    return left;
  };
  const sum = () => {
    let left = product();
    while (isOp('+') || isOp('-')) {
      const op = take().v;
      left = { k: 'bin', op, l: left, r: product() };
    }
    return left;
  };
  const concat = () => {
    let left = sum();
    while (isOp('&')) {
      take();
      left = { k: 'bin', op: '&', l: left, r: sum() };
    }
    return left;
  };
  function comparison() {
    let left = concat();
    while (peek() && peek().t === 'op' && ['=', '<', '>', '<=', '>=', '<>'].includes(peek().v)) {
      const op = take().v;
      left = { k: 'bin', op, l: left, r: concat() };
    }
    return left;
  }

  const ast = comparison();
  if (p < tokens.length) throw new Error('#ERROR!');
  return ast;
};

// --- Values ------------------------------------------------------------------------

class SheetError {
  constructor(code) {
    this.code = code;
  }
  toString() {
    return this.code;
  }
}
const err = (code) => new SheetError(code);
export const isError = (v) => v instanceof SheetError;

const isBlank = (v) => v === null || v === undefined || v === '';

const toNumber = (v) => {
  if (isError(v)) return v;
  if (isBlank(v)) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const t = String(v).trim();
  if (t !== '' && !Number.isNaN(Number(t))) return Number(t);
  return err('#VALUE!');
};

const toText = (v) => {
  if (isError(v)) return v;
  if (isBlank(v)) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return numberToText(v);
  return String(v);
};

const toBool = (v) => {
  if (isError(v)) return v;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (isBlank(v)) return false;
  const t = String(v).trim().toUpperCase();
  if (t === 'TRUE') return true;
  if (t === 'FALSE') return false;
  return err('#VALUE!');
};

export const numberToText = (n) => {
  if (!Number.isFinite(n)) return '#NUM!';
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return String(n);
  return String(Number(n.toPrecision(12)));
};

// What a typed cell value means: numbers and booleans are recognised, formulas
// are evaluated by the caller.
export const isFormula = (text) => typeof text === 'string' && text.length > 1 && text[0] === '=';

export const literalValue = (text) => {
  if (isBlank(text)) return '';
  const t = String(text).trim();
  if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return Number(t);
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ''));
  if (/^[+-]?(\d+\.?\d*|\.\d+)%$/.test(t)) return Number(t.slice(0, -1)) / 100;
  if (/^\$-?\d{1,3}(,\d{3})*(\.\d+)?$|^-\$\d{1,3}(,\d{3})*(\.\d+)?$|^\$-?\d+(\.\d+)?$/.test(t)) {
    return Number(t.replace(/[$,]/g, ''));
  }
  if (/^true$/i.test(t)) return true;
  if (/^false$/i.test(t)) return false;
  return String(text);
};

// --- Dates (serial numbers, 1 = 1900-01-01 like spreadsheets) -----------------------

const EPOCH = Date.UTC(1899, 11, 30);
export const serialFromDate = (date) => (date.getTime() - EPOCH) / 86400000;
export const dateFromSerial = (serial) => new Date(EPOCH + Math.round(serial * 86400000));

// --- Function library ---------------------------------------------------------------

const flatten = (args) => {
  const out = [];
  args.forEach((a) => {
    if (a && a.__range) a.values.forEach((row) => row.forEach((v) => out.push({ v, fromRange: true })));
    else out.push({ v: a, fromRange: false });
  });
  return out;
};

// Numbers found in the arguments. Inside ranges only real numbers count (text
// and blanks are skipped); typed arguments are converted like a spreadsheet does.
const collectNumbers = (args) => {
  const nums = [];
  for (const { v, fromRange } of flatten(args)) {
    if (isError(v)) return v;
    if (fromRange) {
      if (typeof v === 'number') nums.push(v);
    } else if (!isBlank(v)) {
      const n = toNumber(v);
      if (isError(n)) return n;
      nums.push(n);
    }
  }
  return nums;
};

const scalar = (v) => (v && v.__range ? (v.values[0] ? v.values[0][0] : '') : v);

const criteriaTest = (criteria) => {
  const text = isBlank(criteria) ? '' : String(criteria);
  const m = /^(<=|>=|<>|=|<|>)?(.*)$/s.exec(text);
  const op = m[1] || '=';
  const rhs = m[2];
  const rhsNum = rhs.trim() !== '' && !Number.isNaN(Number(rhs)) ? Number(rhs) : null;
  const wild = (s) =>
    new RegExp(`^${s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i');
  return (value) => {
    const isNum = typeof value === 'number';
    if (rhsNum !== null && (isNum || (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))))) {
      const x = isNum ? value : Number(value);
      switch (op) {
        case '=': return x === rhsNum;
        case '<>': return x !== rhsNum;
        case '<': return x < rhsNum;
        case '>': return x > rhsNum;
        case '<=': return x <= rhsNum;
        default: return x >= rhsNum;
      }
    }
    const s = isBlank(value) ? '' : String(value);
    if (op === '=') return wild(rhs).test(s);
    if (op === '<>') return !wild(rhs).test(s);
    if (rhsNum !== null) return false;
    const a = s.toLowerCase();
    const b = rhs.toLowerCase();
    if (op === '<') return a < b;
    if (op === '>') return a > b;
    if (op === '<=') return a <= b;
    return a >= b;
  };
};

const numFn = (fn) => (args) => {
  const nums = [];
  for (const a of args) {
    const n = toNumber(scalar(a));
    if (isError(n)) return n;
    nums.push(n);
  }
  return fn(...nums);
};

const roundTo = (x, digits) => {
  const f = 10 ** digits;
  const scaled = Math.abs(x) * f;
  const rounded = Math.round(Number((scaled).toPrecision(15)));
  return (Math.sign(x) * rounded) / f;
};

const FUNCTIONS = {
  SUM: (args) => {
    const n = collectNumbers(args);
    return isError(n) ? n : n.reduce((a, b) => a + b, 0);
  },
  PRODUCT: (args) => {
    const n = collectNumbers(args);
    return isError(n) ? n : n.length ? n.reduce((a, b) => a * b, 1) : 0;
  },
  AVERAGE: (args) => {
    const n = collectNumbers(args);
    if (isError(n)) return n;
    return n.length ? n.reduce((a, b) => a + b, 0) / n.length : err('#DIV/0!');
  },
  MIN: (args) => {
    const n = collectNumbers(args);
    return isError(n) ? n : n.length ? Math.min(...n) : 0;
  },
  MAX: (args) => {
    const n = collectNumbers(args);
    return isError(n) ? n : n.length ? Math.max(...n) : 0;
  },
  MEDIAN: (args) => {
    const n = collectNumbers(args);
    if (isError(n)) return n;
    if (!n.length) return err('#NUM!');
    const s = [...n].sort((a, b) => a - b);
    const mid = s.length >> 1;
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  },
  COUNT: (args) => flatten(args).filter(({ v }) => typeof v === 'number').length,
  COUNTA: (args) => flatten(args).filter(({ v }) => !isBlank(v)).length,
  COUNTBLANK: (args) => flatten(args).filter(({ v }) => isBlank(v)).length,
  ABS: numFn((x) => Math.abs(x)),
  SQRT: numFn((x) => (x < 0 ? err('#NUM!') : Math.sqrt(x))),
  INT: numFn((x) => Math.floor(x)),
  SIGN: numFn((x) => Math.sign(x)),
  EXP: numFn((x) => Math.exp(x)),
  LN: numFn((x) => (x <= 0 ? err('#NUM!') : Math.log(x))),
  LOG10: numFn((x) => (x <= 0 ? err('#NUM!') : Math.log10(x))),
  PI: () => Math.PI,
  POWER: numFn((a, b) => {
    const r = a ** b;
    return Number.isFinite(r) ? r : err('#NUM!');
  }),
  MOD: numFn((a, b) => (b === 0 ? err('#DIV/0!') : a - b * Math.floor(a / b))),
  ROUND: (args) => {
    const x = toNumber(scalar(args[0]));
    const d = args[1] === undefined ? 0 : toNumber(scalar(args[1]));
    if (isError(x)) return x;
    if (isError(d)) return d;
    return roundTo(x, Math.trunc(d));
  },
  ROUNDUP: (args) => {
    const x = toNumber(scalar(args[0]));
    const d = args[1] === undefined ? 0 : toNumber(scalar(args[1]));
    if (isError(x)) return x;
    if (isError(d)) return d;
    const f = 10 ** Math.trunc(d);
    return (Math.sign(x) * Math.ceil(Number((Math.abs(x) * f).toPrecision(15)))) / f;
  },
  ROUNDDOWN: (args) => {
    const x = toNumber(scalar(args[0]));
    const d = args[1] === undefined ? 0 : toNumber(scalar(args[1]));
    if (isError(x)) return x;
    if (isError(d)) return d;
    const f = 10 ** Math.trunc(d);
    return (Math.sign(x) * Math.floor(Number((Math.abs(x) * f).toPrecision(15)))) / f;
  },
  CEILING: numFn((x) => Math.ceil(x)),
  FLOOR: numFn((x) => Math.floor(x)),
  RAND: () => Math.random(),
  RANDBETWEEN: numFn((a, b) => Math.floor(Math.random() * (Math.floor(b) - Math.ceil(a) + 1)) + Math.ceil(a)),
  IF: null, // lazy, handled in evaluate
  IFERROR: null, // lazy
  AND: (args) => {
    const items = flatten(args).filter(({ v, fromRange }) => !(fromRange && isBlank(v)));
    if (!items.length) return err('#VALUE!');
    let all = true;
    for (const { v } of items) {
      const b = toBool(v);
      if (isError(b)) return b;
      if (!b) all = false;
    }
    return all;
  },
  OR: (args) => {
    const items = flatten(args).filter(({ v, fromRange }) => !(fromRange && isBlank(v)));
    if (!items.length) return err('#VALUE!');
    let any = false;
    for (const { v } of items) {
      const b = toBool(v);
      if (isError(b)) return b;
      if (b) any = true;
    }
    return any;
  },
  NOT: (args) => {
    const b = toBool(scalar(args[0]));
    return isError(b) ? b : !b;
  },
  TRUE: () => true,
  FALSE: () => false,
  CONCAT: (args) => {
    let out = '';
    for (const { v } of flatten(args)) {
      const t = toText(v);
      if (isError(t)) return t;
      out += t;
    }
    return out;
  },
  CONCATENATE: (args) => FUNCTIONS.CONCAT(args),
  UPPER: (args) => {
    const t = toText(scalar(args[0]));
    return isError(t) ? t : t.toUpperCase();
  },
  LOWER: (args) => {
    const t = toText(scalar(args[0]));
    return isError(t) ? t : t.toLowerCase();
  },
  PROPER: (args) => {
    const t = toText(scalar(args[0]));
    return isError(t) ? t : t.toLowerCase().replace(/(^|[^a-z0-9'])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  },
  TRIM: (args) => {
    const t = toText(scalar(args[0]));
    return isError(t) ? t : t.trim().replace(/\s+/g, ' ');
  },
  LEN: (args) => {
    const t = toText(scalar(args[0]));
    return isError(t) ? t : t.length;
  },
  LEFT: (args) => {
    const t = toText(scalar(args[0]));
    const n = args[1] === undefined ? 1 : toNumber(scalar(args[1]));
    if (isError(t)) return t;
    if (isError(n) || n < 0) return err('#VALUE!');
    return t.slice(0, Math.trunc(n));
  },
  RIGHT: (args) => {
    const t = toText(scalar(args[0]));
    const n = args[1] === undefined ? 1 : toNumber(scalar(args[1]));
    if (isError(t)) return t;
    if (isError(n) || n < 0) return err('#VALUE!');
    return n === 0 ? '' : t.slice(-Math.trunc(n));
  },
  MID: (args) => {
    const t = toText(scalar(args[0]));
    const s = toNumber(scalar(args[1]));
    const n = toNumber(scalar(args[2]));
    if (isError(t)) return t;
    if (isError(s) || isError(n) || s < 1 || n < 0) return err('#VALUE!');
    return t.substr(Math.trunc(s) - 1, Math.trunc(n));
  },
  SUBSTITUTE: (args) => {
    const t = toText(scalar(args[0]));
    const from = toText(scalar(args[1]));
    const to = toText(scalar(args[2]));
    if (isError(t)) return t;
    if (isError(from)) return from;
    if (isError(to)) return to;
    return from === '' ? t : t.split(from).join(to);
  },
  REPT: (args) => {
    const t = toText(scalar(args[0]));
    const n = toNumber(scalar(args[1]));
    if (isError(t)) return t;
    if (isError(n) || n < 0 || n > 1000) return err('#VALUE!');
    return t.repeat(Math.trunc(n));
  },
  TEXT: (args) => {
    const x = toNumber(scalar(args[0]));
    const fmt = toText(scalar(args[1]));
    if (isError(x)) return x;
    if (isError(fmt)) return fmt;
    return formatByPattern(x, fmt);
  },
  VALUE: (args) => {
    const v = literalValue(toText(scalar(args[0])));
    return typeof v === 'number' ? v : err('#VALUE!');
  },
  ISNUMBER: (args) => typeof scalar(args[0]) === 'number',
  ISTEXT: (args) => {
    const v = scalar(args[0]);
    return typeof v === 'string' && v !== '';
  },
  ISBLANK: (args) => isBlank(scalar(args[0])),
  ISERROR: (args) => isError(scalar(args[0])),
  SUMIF: (args) => {
    const range = args[0];
    if (!range || !range.__range) return err('#VALUE!');
    const test = criteriaTest(scalar(args[1]));
    const sumRange = args[2] && args[2].__range ? args[2] : range;
    let total = 0;
    for (let r = 0; r < range.values.length; r += 1) {
      for (let c = 0; c < range.values[r].length; c += 1) {
        if (test(range.values[r][c])) {
          const v = sumRange.values[r] ? sumRange.values[r][c] : undefined;
          if (isError(v)) return v;
          if (typeof v === 'number') total += v;
        }
      }
    }
    return total;
  },
  COUNTIF: (args) => {
    const range = args[0];
    if (!range || !range.__range) return err('#VALUE!');
    const test = criteriaTest(scalar(args[1]));
    let n = 0;
    range.values.forEach((row) => row.forEach((v) => { if (test(v)) n += 1; }));
    return n;
  },
  AVERAGEIF: (args) => {
    const range = args[0];
    if (!range || !range.__range) return err('#VALUE!');
    const test = criteriaTest(scalar(args[1]));
    const avgRange = args[2] && args[2].__range ? args[2] : range;
    let total = 0;
    let n = 0;
    for (let r = 0; r < range.values.length; r += 1) {
      for (let c = 0; c < range.values[r].length; c += 1) {
        if (test(range.values[r][c])) {
          const v = avgRange.values[r] ? avgRange.values[r][c] : undefined;
          if (typeof v === 'number') {
            total += v;
            n += 1;
          }
        }
      }
    }
    return n ? total / n : err('#DIV/0!');
  },
  TODAY: () => Math.floor(serialFromDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000))),
  NOW: () => serialFromDate(new Date(Date.now() - new Date().getTimezoneOffset() * 60000)),
  DATE: numFn((y, m, d) => serialFromDate(new Date(Date.UTC(y, m - 1, d)))),
  YEAR: numFn((s) => dateFromSerial(s).getUTCFullYear()),
  MONTH: numFn((s) => dateFromSerial(s).getUTCMonth() + 1),
  DAY: numFn((s) => dateFromSerial(s).getUTCDate()),
  ROW: () => err('#N/A'),
  VLOOKUP: (args) => {
    const key = scalar(args[0]);
    const table = args[1];
    const index = toNumber(scalar(args[2]));
    const approx = args[3] === undefined ? true : toBool(scalar(args[3]));
    if (!table || !table.__range || isError(index) || isError(approx)) return err('#VALUE!');
    if (index < 1 || index > (table.values[0] || []).length) return err('#REF!');
    const same = (a, b) =>
      typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : a === b;
    if (!approx) {
      for (const row of table.values) if (same(row[0], key)) return row[Math.trunc(index) - 1];
      return err('#N/A');
    }
    let found = null;
    for (const row of table.values) {
      if (isBlank(row[0])) continue;
      if (typeof row[0] === typeof key && row[0] <= key) found = row;
      else if (typeof row[0] === typeof key) break;
    }
    return found ? found[Math.trunc(index) - 1] : err('#N/A');
  },
};

// --- Number formatting ----------------------------------------------------------------

const withCommas = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const formatFixed = (x, decimals, { commas = true, prefix = '', suffix = '' } = {}) => {
  if (!Number.isFinite(x)) return '#NUM!';
  const negative = x < 0 && roundTo(Math.abs(x), decimals) !== 0;
  const abs = Math.abs(roundTo(Math.abs(x), decimals));
  const [int, frac] = abs.toFixed(decimals).split('.');
  const body = `${prefix}${commas ? withCommas(int) : int}${frac ? `.${frac}` : ''}${suffix}`;
  return negative ? `-${body}` : body;
};

const pad2 = (n) => String(n).padStart(2, '0');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const formatDate = (serial, pattern = 'mm/dd/yyyy') => {
  const d = dateFromSerial(serial);
  const y = d.getUTCFullYear();
  const mo = d.getUTCMonth();
  const day = d.getUTCDate();
  return pattern
    .replace(/yyyy/gi, String(y))
    .replace(/mmmm/gi, MONTHS[mo])
    .replace(/mmm/gi, MONTHS[mo].slice(0, 3))
    .replace(/mm/g, pad2(mo + 1))
    .replace(/dd/gi, pad2(day));
};

// A tiny subset of the TEXT() patterns: 0, 0.00, #,##0, #,##0.00, 0%, 0.0%,
// dates (mm/dd/yyyy and friends).
const formatByPattern = (x, pattern) => {
  if (/[ymd]/i.test(pattern) && /yyyy|mm|dd/i.test(pattern)) return formatDate(x, pattern);
  const pct = pattern.endsWith('%');
  const core = pct ? pattern.slice(0, -1) : pattern;
  const m = /^(\$?)(#,##)?([0#]+)(?:\.([0#]+))?$/.exec(core);
  if (!m) return String(x);
  const decimals = m[4] ? m[4].length : 0;
  return formatFixed(pct ? x * 100 : x, decimals, { commas: Boolean(m[2]), prefix: m[1], suffix: pct ? '%' : '' });
};

export const NUMBER_FORMATS = [
  ['auto', 'Automatic'],
  ['n0', 'Integer  1,235'],
  ['n2', 'Number  1,234.57'],
  ['cur', 'Currency  $1,234.57'],
  ['pct', 'Percent  12.35%'],
  ['date', 'Date  12/31/2026'],
  ['text', 'Plain text'],
];

// How a value should look in a cell under a number format.
export const formatValue = (value, nf) => {
  if (isError(value)) return value.code;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') {
    switch (nf) {
      case 'n0': return formatFixed(value, 0);
      case 'n2': return formatFixed(value, 2);
      case 'cur': return formatFixed(value, 2, { prefix: '$' });
      case 'pct': return formatFixed(value * 100, 2, { commas: false, suffix: '%' });
      case 'date': return formatDate(value);
      default: return numberToText(value);
    }
  }
  return value === null || value === undefined ? '' : String(value);
};

// --- Evaluator --------------------------------------------------------------------------

const compareValues = (op, a, b) => {
  const rank = (v) => (typeof v === 'number' ? 0 : typeof v === 'boolean' ? 2 : 1);
  const norm = (v) => (isBlank(v) ? (typeof b === 'number' || typeof a === 'number' ? 0 : '') : v);
  const x = norm(a);
  const y = norm(b);
  let cmp;
  if (rank(x) !== rank(y)) cmp = rank(x) - rank(y);
  else if (typeof x === 'string') {
    const lx = x.toLowerCase();
    const ly = y.toLowerCase();
    cmp = lx < ly ? -1 : lx > ly ? 1 : 0;
  } else cmp = x < y ? -1 : x > y ? 1 : 0;
  switch (op) {
    case '=': return cmp === 0;
    case '<>': return cmp !== 0;
    case '<': return cmp < 0;
    case '>': return cmp > 0;
    case '<=': return cmp <= 0;
    default: return cmp >= 0;
  }
};

const MAX_RANGE_CELLS = 250000;

// Creates an evaluator over a cell map. `value(r, c)` gives the computed value of
// a cell (numbers, text, booleans or errors) and `display(r, c)` how it is shown.
export const createEvaluator = (cells, bounds) => {
  const memo = new Map();
  const visiting = new Set();
  const parsed = new Map();
  const maxR = bounds && bounds.rows ? bounds.rows : Infinity;
  const maxC = bounds && bounds.cols ? bounds.cols : Infinity;

  const nfAt = (r, c) => {
    if (bounds && bounds.nfOf) return bounds.nfOf(r, c);
    const cell = cells[`${r},${c}`];
    return cell ? cell.nf : undefined;
  };

  const astFor = (text) => {
    if (!parsed.has(text)) {
      try {
        parsed.set(text, parse(tokenize(text.slice(1))));
      } catch (e) {
        parsed.set(text, { k: 'err', v: '#ERROR!' });
      }
    }
    return parsed.get(text);
  };

  const cellValue = (r, c) => {
    if (r < 0 || c < 0 || r >= maxR || c >= maxC) return err('#REF!');
    const k = `${r},${c}`;
    if (memo.has(k)) return memo.get(k);
    const cell = cells[k];
    const raw = cell && cell.v !== undefined ? cell.v : '';
    let result;
    const nf = nfAt(r, c);
    if (isFormula(raw) && nf !== 'text') {
      if (visiting.has(k)) return err('#CIRC!');
      visiting.add(k);
      try {
        result = evaluate(astFor(raw));
        if (result && result.__range) result = scalar(result);
        if (isBlank(result) && result !== '') result = '';
      } catch (e) {
        result = err('#ERROR!');
      }
      visiting.delete(k);
    } else if (nf === 'text') {
      result = String(raw);
    } else {
      result = literalValue(raw);
    }
    memo.set(k, result);
    return result;
  };

  const rangeValues = (a, b) => {
    const r1 = Math.min(a.r, b.r);
    const r2 = Math.max(a.r, b.r);
    const c1 = Math.min(a.c, b.c);
    const c2 = Math.max(a.c, b.c);
    if (r1 >= maxR || c1 >= maxC) return err('#REF!');
    const rr2 = Math.min(r2, maxR - 1);
    const cc2 = Math.min(c2, maxC - 1);
    if ((rr2 - r1 + 1) * (cc2 - c1 + 1) > MAX_RANGE_CELLS) return err('#REF!');
    const values = [];
    for (let r = r1; r <= rr2; r += 1) {
      const row = [];
      for (let c = c1; c <= cc2; c += 1) row.push(cellValue(r, c));
      values.push(row);
    }
    return { __range: true, values };
  };

  function evaluate(node) {
    switch (node.k) {
      case 'num':
      case 'str':
      case 'bool':
        return node.v;
      case 'empty':
        return '';
      case 'err':
        return err(node.v);
      case 'ref':
        return cellValue(node.ref.r, node.ref.c);
      case 'range':
        return rangeValues(node.a, node.b);
      case 'neg': {
        const n = toNumber(scalar(evaluate(node.x)));
        return isError(n) ? n : -n;
      }
      case 'pct': {
        const n = toNumber(scalar(evaluate(node.x)));
        return isError(n) ? n : n / 100;
      }
      case 'bin': {
        const l = scalar(evaluate(node.l));
        const r = scalar(evaluate(node.r));
        if (isError(l)) return l;
        if (isError(r)) return r;
        if (node.op === '&') return toText(l) + toText(r);
        if (['=', '<>', '<', '>', '<=', '>='].includes(node.op)) return compareValues(node.op, l, r);
        const a = toNumber(l);
        const b = toNumber(r);
        if (isError(a)) return a;
        if (isError(b)) return b;
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return b === 0 ? err('#DIV/0!') : a / b;
          default: {
            const p = a ** b;
            return Number.isFinite(p) ? p : err('#NUM!');
          }
        }
      }
      case 'fn': {
        if (node.name === 'IF') {
          if (node.args.length < 2 || node.args.length > 3) return err('#ERROR!');
          const cond = toBool(scalar(evaluate(node.args[0])));
          if (isError(cond)) return cond;
          if (cond) return evaluate(node.args[1]);
          return node.args[2] ? evaluate(node.args[2]) : false;
        }
        if (node.name === 'IFERROR') {
          if (node.args.length < 1 || node.args.length > 2) return err('#ERROR!');
          const first = scalar(evaluate(node.args[0]));
          if (!isError(first)) return first;
          return node.args[1] ? evaluate(node.args[1]) : '';
        }
        const fn = FUNCTIONS[node.name];
        if (!fn) return err('#NAME?');
        const args = node.args.map(evaluate);
        for (const a of args) {
          if (isError(a)) return a;
        }
        return fn(args);
      }
      default:
        return err('#ERROR!');
    }
  }

  return {
    value: cellValue,
    display: (r, c) => {
      const cell = cells[`${r},${c}`];
      const raw = cell && cell.v !== undefined ? cell.v : '';
      if (raw === '') return '';
      const nf = nfAt(r, c);
      // Typed values keep looking the way they were typed unless a format is chosen.
      if (!isFormula(raw) && (!nf || nf === 'auto')) return String(raw);
      return formatValue(cellValue(r, c), nf);
    },
    isNumber: (r, c) => typeof cellValue(r, c) === 'number',
  };
};

// --- Rewriting references --------------------------------------------------------------

// Apply `fn(ref)` to every reference in a formula. fn returns a new ref, or null
// for "this reference no longer exists" (becomes #REF!).
const rewrite = (formula, fn) => {
  let tokens;
  try {
    tokens = tokenize(formula.slice(1));
  } catch (e) {
    return formula;
  }
  let out = '=';
  let pos = 0;
  const body = formula.slice(1);
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (tok.t !== 'ref') continue;
    out += body.slice(pos, tok.s);
    const next = tokens[i + 1];
    const afterNext = tokens[i + 2];
    if (next && next.t === 'op' && next.v === ':' && afterNext && afterNext.t === 'ref') {
      const result = fn(tok.ref, afterNext.ref);
      out += result ? `${refText(result.a)}:${refText(result.b)}` : '#REF!';
      pos = afterNext.e;
      i += 2;
    } else {
      const result = fn(tok.ref, null);
      out += result ? refText(result.a) : '#REF!';
      pos = tok.e;
    }
  }
  return out + body.slice(pos);
};

// Move a formula by (dr, dc): relative references shift, $-anchored ones stay.
export const shiftFormula = (formula, dr, dc) => {
  if (!isFormula(formula)) return formula;
  const shift = (ref) => {
    const r = ref.ar ? ref.r : ref.r + dr;
    const c = ref.ac ? ref.c : ref.c + dc;
    return r < 0 || c < 0 ? null : { ...ref, r, c };
  };
  return rewrite(formula, (a, b) => {
    const na = shift(a);
    const nb = b ? shift(b) : null;
    if (!na || (b && !nb)) return null;
    return { a: na, b: nb };
  });
};

// When a row moves from `from` to `to` (sorting), single references to cells in
// that same row follow it; everything else keeps pointing where it did.
export const moveRowRefs = (formula, from, to) => {
  if (!isFormula(formula)) return formula;
  return rewrite(formula, (a, b) => {
    if (b) return { a, b };
    return a.r === from && !a.ar ? { a: { ...a, r: to }, b: null } : { a, b: null };
  });
};

// After rows/columns are inserted or deleted: `insert(index, count)` or
// `del(first, last)` on one axis; references follow the cells they point at.
export const remapFormula = (formula, axis, change) => {
  if (!isFormula(formula)) return formula;
  const key = axis === 'row' ? 'r' : 'c';
  const mapPoint = (i) => {
    if (change.type === 'insert') return i >= change.at ? i + change.count : i;
    if (i < change.first) return i;
    if (i > change.last) return i - (change.last - change.first + 1);
    return -1;
  };
  return rewrite(formula, (a, b) => {
    if (!b) {
      const to = mapPoint(a[key]);
      return to < 0 ? null : { a: { ...a, [key]: to }, b: null };
    }
    // Ranges shrink / grow with the lines inside them.
    const lo = Math.min(a[key], b[key]);
    const hi = Math.max(a[key], b[key]);
    let nlo;
    let nhi;
    if (change.type === 'insert') {
      nlo = lo >= change.at ? lo + change.count : lo;
      nhi = hi >= change.at ? hi + change.count : hi;
    } else {
      const n = change.last - change.first + 1;
      if (lo >= change.first && hi <= change.last) return null;
      nlo = lo < change.first ? lo : lo > change.last ? lo - n : change.first;
      nhi = hi < change.first ? hi : hi > change.last ? hi - n : change.first - 1;
      if (nhi < nlo) return null;
    }
    const swap = a[key] > b[key];
    return {
      a: { ...a, [key]: swap ? nhi : nlo },
      b: { ...b, [key]: swap ? nlo : nhi },
    };
  });
};

export const FUNCTION_NAMES = Object.keys(FUNCTIONS).sort();
