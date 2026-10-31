import { isFormula, shiftFormula, remapFormula, moveRowRefs } from './formula';

// Pure data helpers for the Sheets pill. No React in here, so it is easy to test.
//
// A sheet is stored as JSON text:
//   {
//     v: 1, theme: 'docs',
//     cells: { "row,col": { v: 'text', b:1, i:1, u:1, s:1, fs:14, c:'#hex', bg:'#hex', a:'l|c|r', w:1, bd:'tbrl' } },
//     colW: { col: px }, rowH: { row: px },          // only sizes that were changed
//     colS: { col: {style} }, rowS: { row: {style} }, // whole-column / whole-row formatting
//     base: {style},                                  // whole-sheet formatting
//     nr, nc: number of rows / columns the sheet has
//     lists: { id: [{ t: 'option text', k: 'colorKey' }] }   // dropdown (pill) option lists
//     a cell with a dropdown carries dd: 'id' (its value is one of the option texts)
//     opts: { grid, headers, headerRow, banded, freezeR, freezeC, dw, dh }
//   }
// Only cells that hold something are stored.

export const DEFAULT_COL_W = 100;
export const DEFAULT_ROW_H = 26;
export const MIN_SIZE = 16;
export const MAX_SIZE = 800;

export const STYLE_KEYS = ['b', 'i', 'u', 's', 'fs', 'c', 'bg', 'a', 'w', 'bd', 'nf'];

export const THEMES = {
  docs: {
    label: 'Docs Blue',
    font: 'Arial, sans-serif',
    fg: '#1A202C',
    bg: '#FFFFFF',
    grid: '#CBD5E1',
    hdrBg: '#207ADB',
    hdrFg: '#FFFFFF',
    band: '#EAF2FC',
    axisBg: '#2D3748',
    axisFg: '#FFFFFF',
    axisFont: "Chewy, Arial, sans-serif",
    border: '#1A202C',
  },
  classic: {
    label: 'Classic',
    font: 'Arial, sans-serif',
    fg: '#1A202C',
    bg: '#FFFFFF',
    grid: '#D7DDE5',
    hdrBg: '#E2E8F0',
    hdrFg: '#1A202C',
    band: '#F7FAFC',
    axisBg: '#EEF2F7',
    axisFg: '#4A5568',
    axisFont: 'Arial, sans-serif',
    border: '#1A202C',
  },
  pop: {
    label: 'Marketing Pop',
    font: 'Arial, sans-serif',
    fg: '#1A202C',
    bg: '#FFFFFF',
    grid: '#E5C9A8',
    hdrBg: '#F6A053',
    hdrFg: '#1A202C',
    band: '#FFF4E5',
    axisBg: '#1A202C',
    axisFg: '#F6A053',
    axisFont: "Chewy, Arial, sans-serif",
    border: '#1A202C',
  },
  mint: {
    label: 'Fresh Mint',
    font: 'Arial, sans-serif',
    fg: '#1A202C',
    bg: '#FFFFFF',
    grid: '#CDE5D6',
    hdrBg: '#2F855A',
    hdrFg: '#FFFFFF',
    band: '#E6F6EC',
    axisBg: '#276749',
    axisFg: '#FFFFFF',
    axisFont: "Chewy, Arial, sans-serif",
    border: '#1A202C',
  },
  grape: {
    label: 'Grape',
    font: 'Arial, sans-serif',
    fg: '#1A202C',
    bg: '#FFFFFF',
    grid: '#D9CFEF',
    hdrBg: '#805AD5',
    hdrFg: '#FFFFFF',
    band: '#F1EBFB',
    axisBg: '#553C9A',
    axisFg: '#FFFFFF',
    axisFont: "Chewy, Arial, sans-serif",
    border: '#1A202C',
  },
  midnight: {
    label: 'Midnight',
    font: 'Arial, sans-serif',
    fg: '#E2E8F0',
    bg: '#1A202C',
    grid: '#2D3748',
    hdrBg: '#207ADB',
    hdrFg: '#FFFFFF',
    band: '#222B3B',
    axisBg: '#0F141C',
    axisFg: '#A0AEC0',
    axisFont: "Chewy, Arial, sans-serif",
    border: '#A0AEC0',
  },
  minimal: {
    label: 'Minimal',
    font: 'Arial, sans-serif',
    fg: '#1A202C',
    bg: '#FFFFFF',
    grid: '#EDF2F7',
    hdrBg: '#FFFFFF',
    hdrFg: '#1A202C',
    band: '#F7FAFC',
    axisBg: '#FFFFFF',
    axisFg: '#718096',
    axisFont: 'Arial, sans-serif',
    border: '#1A202C',
  },
};

export const THEME_ORDER = ['docs', 'classic', 'pop', 'mint', 'grape', 'midnight', 'minimal'];

export const defaultOpts = () => ({
  grid: true,
  headers: true,
  headerRow: false,
  banded: false,
  freezeR: 0,
  freezeC: 0,
  dw: DEFAULT_COL_W,
  dh: DEFAULT_ROW_H,
});

// Colours for dropdown pills.
export const DD_COLORS = {
  blue: { label: 'Blue', bg: '#A8DCFF', fg: '#1D4F91' },
  red: { label: 'Red', bg: '#FF9E92', fg: '#7A1D12' },
  yellow: { label: 'Yellow', bg: '#FFF08A', fg: '#7A5200' },
  green: { label: 'Green', bg: '#B7EDB4', fg: '#1E6B2A' },
  orange: { label: 'Orange', bg: '#FFCF99', fg: '#8A4B00' },
  purple: { label: 'Purple', bg: '#D9C8FF', fg: '#4B2C96' },
  pink: { label: 'Pink', bg: '#FFC4DC', fg: '#8A1F52' },
  teal: { label: 'Teal', bg: '#A8EDE3', fg: '#13675D' },
  gray: { label: 'Gray', bg: '#E2E8F0', fg: '#2D3748' },
};
export const DD_COLOR_ORDER = ['blue', 'red', 'yellow', 'green', 'orange', 'purple', 'pink', 'teal', 'gray'];

export const DD_PRESETS = {
  status: {
    label: 'Status  (Not started / In progress / Blocked / Done)',
    list: [
      { t: 'Not started', k: 'blue' },
      { t: 'In progress', k: 'yellow' },
      { t: 'Blocked', k: 'red' },
      { t: 'Done', k: 'green' },
    ],
  },
  priority: {
    label: 'Priority  (Low / Medium / High)',
    list: [
      { t: 'Low', k: 'green' },
      { t: 'Medium', k: 'yellow' },
      { t: 'High', k: 'red' },
    ],
  },
  yesno: {
    label: 'Yes / No',
    list: [
      { t: 'Yes', k: 'green' },
      { t: 'No', k: 'red' },
    ],
  },
};

export const DEFAULT_ROWS = 10;
export const DEFAULT_COLS = 10;
export const MAX_ROWS = 100000;
export const MAX_COLS = 1000;

export const emptySheet = () => ({
  v: 1,
  nr: DEFAULT_ROWS,
  nc: DEFAULT_COLS,
  lists: {},
  theme: 'docs',
  cells: {},
  colW: {},
  rowH: {},
  colS: {},
  rowS: {},
  base: {},
  opts: defaultOpts(),
});

// What a brand-new Sheets pill looks like: a small styled table to build on.
export const starterSheet = () => {
  const sheet = emptySheet();
  sheet.opts.headerRow = true;
  sheet.opts.banded = true;
  sheet.opts.freezeR = 1;
  const rows = [
    ['Campaign', 'Channel', 'Budget', 'Status'],
    ['Spring Sponsor Drive', 'Email', '1200', 'Not started'],
    ['Robot Reveal', 'Instagram', '300', 'In progress'],
    ['Build Season Recap', 'YouTube', '150', 'Done'],
    ['Total', '', '=SUM(C2:C4)', ''],
  ];
  rows.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value === '') return;
      sheet.cells[`${r},${c}`] = c === 2 && r > 0 ? { v: value, nf: 'cur', ...(r === 4 ? { b: 1 } : {}) } : { v: value, ...(r === 4 ? { b: 1 } : {}) };
    })
  );
  sheet.colW = { 0: 170, 1: 120, 3: 130 };
  return setDropdown(sheet, { r1: 1, r2: 3, c1: 3, c2: 3 }, DD_PRESETS.status.list);
};

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const cleanLists = (raw) => {
  const out = {};
  if (!isPlainObject(raw)) return out;
  Object.keys(raw)
    .slice(0, 60)
    .forEach((id) => {
      if (!Array.isArray(raw[id])) return;
      const list = raw[id]
        .slice(0, 60)
        .filter((o) => o && typeof o.t === 'string' && o.t.trim() !== '')
        .map((o) => ({ t: o.t.slice(0, 80), k: DD_COLORS[o.k] ? o.k : 'gray' }));
      if (list.length) out[id] = list;
    });
  return out;
};

export const normalizeSheet = (raw) => {
  const base = emptySheet();
  if (!isPlainObject(raw)) return base;
  const cells = isPlainObject(raw.cells) ? raw.cells : {};
  const filled = usedExtent({ cells });
  // Sheets saved before sizes existed keep everything they hold.
  const dim = (value, need, fallback, max) => {
    const n = Number.isInteger(value) && value >= 1 ? value : fallback;
    return Math.min(max, Math.max(n, need));
  };
  return {
    v: 1,
    lists: cleanLists(raw.lists),
    nr: dim(raw.nr, filled.row + 1, DEFAULT_ROWS, MAX_ROWS),
    nc: dim(raw.nc, filled.col + 1, DEFAULT_COLS, MAX_COLS),
    theme: THEMES[raw.theme] ? raw.theme : base.theme,
    cells,
    colW: isPlainObject(raw.colW) ? raw.colW : {},
    rowH: isPlainObject(raw.rowH) ? raw.rowH : {},
    colS: isPlainObject(raw.colS) ? raw.colS : {},
    rowS: isPlainObject(raw.rowS) ? raw.rowS : {},
    base: isPlainObject(raw.base) ? raw.base : {},
    opts: { ...base.opts, ...(isPlainObject(raw.opts) ? raw.opts : {}) },
  };
};

export const parseSheet = (text) => {
  if (typeof text === 'string' && text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (isPlainObject(parsed) && isPlainObject(parsed.cells)) {
        return normalizeSheet(parsed);
      }
    } catch (error) {
      // fall through to an empty sheet
    }
  }
  return starterSheet();
};

export const serializeSheet = (data) => JSON.stringify(data);

export const colName = (index) => {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

export const cellName = (row, col) => `${colName(col)}${row + 1}`;

export const key = (row, col) => `${row},${col}`;

export const parseKey = (k) => {
  const [r, c] = k.split(',');
  return [Number(r), Number(c)];
};

// Maps between a column/row index and its pixel position when some columns or
// rows have been resized. Works for any index, so the grid can go on forever.
export const makeAxis = (def, overrides) => {
  const sizes = new Map();
  Object.keys(overrides || {}).forEach((k) => {
    const index = Number(k);
    const size = Math.round(Number(overrides[k]));
    if (Number.isInteger(index) && index >= 0 && size >= 1 && size !== def) {
      sizes.set(index, Math.min(MAX_SIZE, Math.max(1, size)));
    }
  });
  const keys = [...sizes.keys()].sort((a, b) => a - b);
  const cum = [];
  let acc = 0;
  keys.forEach((k) => {
    acc += sizes.get(k) - def;
    cum.push(acc);
  });
  const smallest = Math.max(1, Math.min(def, ...(keys.length ? keys.map((k) => sizes.get(k)) : [def])));

  const countBefore = (index) => {
    let lo = 0;
    let hi = keys.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (keys[mid] < index) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const offset = (index) => {
    const n = countBefore(index);
    return index * def + (n ? cum[n - 1] : 0);
  };
  const sizeAt = (index) => (sizes.has(index) ? sizes.get(index) : def);
  const indexAt = (pos) => {
    if (pos <= 0) return 0;
    let lo = 0;
    let hi = Math.floor(pos / smallest) + 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offset(mid) <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  return { offset, sizeAt, indexAt };
};

export const usedExtent = (data) => {
  let row = -1;
  let col = -1;
  Object.keys(data.cells).forEach((k) => {
    const [r, c] = parseKey(k);
    if (r > row) row = r;
    if (c > col) col = c;
  });
  return { row, col };
};

const bandRow = (opts, r) =>
  opts.banded && (opts.headerRow ? r >= 2 && r % 2 === 0 : r % 2 === 1);

// The formatting a cell ends up with: theme < header row/banding < whole sheet
// < whole column < whole row < the cell itself.
// `used` (optional) is the filled area; the header row and banding stop at its
// edge so the sheet looks like a table rather than colouring the endless grid.
export const resolveStyle = (data, r, c, used) => {
  const theme = THEMES[data.theme] || THEMES.docs;
  const out = {};
  const inTable = !used || (r <= used.row && c <= used.col);
  if (inTable && bandRow(data.opts, r)) out.bg = theme.band;
  if (inTable && data.opts.headerRow && r === 0) {
    out.bg = theme.hdrBg;
    out.c = theme.hdrFg;
    out.b = 1;
  }
  Object.assign(out, data.base, data.colS[c], data.rowS[r], data.cells[key(r, c)]);
  return out;
};

const cleanStyle = (style) => {
  const next = { ...style };
  Object.keys(next).forEach((k) => {
    if (next[k] === null || next[k] === undefined || next[k] === '') delete next[k];
  });
  return next;
};

const withPatch = (style, patch) => cleanStyle({ ...(style || {}), ...patch });

const stripKeys = (cell, patchKeys) => {
  const next = { ...cell };
  patchKeys.forEach((k) => delete next[k]);
  return next;
};

// sel: { kind: 'cell' | 'col' | 'row' | 'all', r1, c1, r2, c2 } (inclusive).
// patch: style keys to set; a value of null removes that formatting.
export const applyStyle = (data, sel, patch) => {
  const patchKeys = Object.keys(patch);
  const cells = { ...data.cells };
  const next = { ...data, cells };

  if (sel.kind === 'cell') {
    for (let r = sel.r1; r <= sel.r2; r += 1) {
      for (let c = sel.c1; c <= sel.c2; c += 1) {
        const k = key(r, c);
        const merged = withPatch(cells[k], patch);
        if (Object.keys(merged).length) cells[k] = merged;
        else delete cells[k];
      }
    }
    return next;
  }

  const inRange = (r, c) => {
    if (sel.kind === 'all') return true;
    if (sel.kind === 'col') return c >= sel.c1 && c <= sel.c2;
    return r >= sel.r1 && r <= sel.r2;
  };

  // A whole-column/row/sheet change wins over formatting on single cells.
  Object.keys(cells).forEach((k) => {
    const [r, c] = parseKey(k);
    if (!inRange(r, c)) return;
    const stripped = stripKeys(cells[k], patchKeys);
    if (Object.keys(stripped).length) cells[k] = stripped;
    else delete cells[k];
  });

  if (sel.kind === 'all') {
    next.base = withPatch(data.base, patch);
    // Column/row formatting would otherwise still override the sheet-wide one.
    next.colS = mapStrip(data.colS, patchKeys);
    next.rowS = mapStrip(data.rowS, patchKeys);
  } else if (sel.kind === 'col') {
    next.colS = { ...data.colS };
    for (let c = sel.c1; c <= sel.c2; c += 1) {
      const merged = withPatch(data.colS[c], patch);
      if (Object.keys(merged).length) next.colS[c] = merged;
      else delete next.colS[c];
    }
    next.rowS = mapStrip(data.rowS, patchKeys);
  } else {
    next.rowS = { ...data.rowS };
    for (let r = sel.r1; r <= sel.r2; r += 1) {
      const merged = withPatch(data.rowS[r], patch);
      if (Object.keys(merged).length) next.rowS[r] = merged;
      else delete next.rowS[r];
    }
  }
  return next;
};

const mapStrip = (map, patchKeys) => {
  const out = {};
  Object.keys(map).forEach((k) => {
    const stripped = stripKeys(map[k], patchKeys);
    if (Object.keys(stripped).length) out[k] = stripped;
  });
  return out;
};

const SIDE_ORDER = ['t', 'r', 'b', 'l'];
const hasSide = (style, side) => Boolean(style && style.bd && style.bd.includes(side));
export const sideOn = hasSide;

const setSide = (cells, r, c, side, on) => {
  if (r < 0 || c < 0) return;
  const k = key(r, c);
  const cell = { ...(cells[k] || {}) };
  const sides = new Set((cell.bd || '').split(''));
  if (on) sides.add(side);
  else sides.delete(side);
  const bd = SIDE_ORDER.filter((s) => sides.has(s)).join('');
  if (bd) cell.bd = bd;
  else delete cell.bd;
  if (Object.keys(cell).length) cells[k] = cell;
  else delete cells[k];
};

const OPPOSITE = { t: ['b', -1, 0], b: ['t', 1, 0], l: ['r', 0, -1], r: ['l', 0, 1] };

const setEdge = (cells, r, c, side, on) => {
  setSide(cells, r, c, side, on);
  const [opposite, dr, dc] = OPPOSITE[side];
  setSide(cells, r + dr, c + dc, opposite, on); // both cells share the line
};

// mode: 'all' | 'outer' | 'top' | 'bottom' | 'left' | 'right' | 'none'
export const applyBorders = (data, sel, mode) => {
  const used = usedExtent(data);
  let { r1, r2, c1, c2 } = sel;
  if (sel.kind === 'col') {
    r1 = 0;
    r2 = Math.max(used.row, 0);
  } else if (sel.kind === 'row') {
    c1 = 0;
    c2 = Math.max(used.col, 0);
  } else if (sel.kind === 'all') {
    r1 = 0;
    c1 = 0;
    r2 = Math.max(used.row, 0);
    c2 = Math.max(used.col, 0);
  }
  const cells = { ...data.cells };
  for (let r = r1; r <= r2; r += 1) {
    for (let c = c1; c <= c2; c += 1) {
      const top = r === r1;
      const bottom = r === r2;
      const left = c === c1;
      const right = c === c2;
      const sides = {
        t: mode === 'all' || mode === 'none' || ((mode === 'outer' || mode === 'top') && top),
        b: mode === 'all' || mode === 'none' || ((mode === 'outer' || mode === 'bottom') && bottom),
        l: mode === 'all' || mode === 'none' || ((mode === 'outer' || mode === 'left') && left),
        r: mode === 'all' || mode === 'none' || ((mode === 'outer' || mode === 'right') && right),
      };
      SIDE_ORDER.forEach((side) => {
        if (sides[side]) setEdge(cells, r, c, side, mode !== 'none');
      });
    }
  }
  return { ...data, cells };
};

export const setCellValue = (data, r, c, value) => {
  const cells = { ...data.cells };
  const k = key(r, c);
  const cell = { ...(cells[k] || {}) };
  if (value === '' || value === null || value === undefined) delete cell.v;
  else cell.v = String(value);
  if (Object.keys(cell).length) cells[k] = cell;
  else delete cells[k];
  return { ...data, cells };
};

export const clearRange = (data, sel) => {
  const used = usedExtent(data);
  const r1 = sel.kind === 'col' || sel.kind === 'all' ? 0 : sel.r1;
  const r2 = sel.kind === 'col' || sel.kind === 'all' ? used.row : sel.r2;
  const c1 = sel.kind === 'row' || sel.kind === 'all' ? 0 : sel.c1;
  const c2 = sel.kind === 'row' || sel.kind === 'all' ? used.col : sel.c2;
  const cells = { ...data.cells };
  Object.keys(cells).forEach((k) => {
    const [r, c] = parseKey(k);
    if (r < r1 || r > r2 || c < c1 || c > c2) return;
    const cell = { ...cells[k] };
    delete cell.v;
    if (Object.keys(cell).length) cells[k] = cell;
    else delete cells[k];
  });
  return { ...data, cells };
};

export const clearFormatting = (data, sel) => {
  const used = usedExtent(data);
  const r1 = sel.kind === 'col' || sel.kind === 'all' ? 0 : sel.r1;
  const r2 = sel.kind === 'col' || sel.kind === 'all' ? used.row : sel.r2;
  const c1 = sel.kind === 'row' || sel.kind === 'all' ? 0 : sel.c1;
  const c2 = sel.kind === 'row' || sel.kind === 'all' ? used.col : sel.c2;
  const cells = { ...data.cells };
  Object.keys(cells).forEach((k) => {
    const [r, c] = parseKey(k);
    if (r < r1 || r > r2 || c < c1 || c > c2) return;
    const cell = { ...cells[k] };
    STYLE_KEYS.forEach((s) => delete cell[s]);
    if (Object.keys(cell).length) cells[k] = cell;
    else delete cells[k];
  });
  const next = { ...data, cells };
  if (sel.kind === 'col') {
    next.colS = { ...data.colS };
    for (let c = sel.c1; c <= sel.c2; c += 1) delete next.colS[c];
  } else if (sel.kind === 'row') {
    next.rowS = { ...data.rowS };
    for (let r = sel.r1; r <= sel.r2; r += 1) delete next.rowS[r];
  } else if (sel.kind === 'all') {
    next.base = {};
    next.colS = {};
    next.rowS = {};
  }
  return next;
};

export const setSize = (data, axis, indexes, size) => {
  const field = axis === 'col' ? 'colW' : 'rowH';
  const next = { ...data, [field]: { ...data[field] } };
  indexes.forEach((i) => {
    next[field][i] = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(size)));
  });
  return next;
};

// --- Copy / paste -----------------------------------------------------------

export const parseTSV = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const source = String(text);
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field === '') {
      inQuotes = true;
    } else if (ch === '\t') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

export const toTSV = (rows) =>
  rows
    .map((row) =>
      row
        .map((value) =>
          /[\t\n\r"]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
        )
        .join('\t')
    )
    .join('\n');

export const readRange = (data, sel) => {
  const used = usedExtent(data);
  const r1 = sel.kind === 'col' || sel.kind === 'all' ? 0 : sel.r1;
  const r2 = sel.kind === 'col' || sel.kind === 'all' ? Math.max(used.row, 0) : sel.r2;
  const c1 = sel.kind === 'row' || sel.kind === 'all' ? 0 : sel.c1;
  const c2 = sel.kind === 'row' || sel.kind === 'all' ? Math.max(used.col, 0) : sel.c2;
  const rows = [];
  for (let r = r1; r <= r2; r += 1) {
    const row = [];
    for (let c = c1; c <= c2; c += 1) {
      const cell = data.cells[key(r, c)];
      row.push(cell && cell.v ? cell.v : '');
    }
    rows.push(row);
  }
  return rows;
};

export const pasteRows = (data, row0, col0, rows) => {
  const cells = { ...data.cells };
  rows.forEach((values, ro) => {
    values.forEach((value, co) => {
      const k = key(row0 + ro, col0 + co);
      const cell = { ...(cells[k] || {}) };
      if (value === '') delete cell.v;
      else cell.v = value;
      if (Object.keys(cell).length) cells[k] = cell;
      else delete cells[k];
    });
  });
  return { ...data, cells };
};

// --- Insert / delete rows and columns -----------------------------------------

// Move every entry of an index-keyed map: `move(index)` returns the new index,
// or -1 to drop it.
const remapIndexMap = (map, move) => {
  const out = {};
  Object.keys(map || {}).forEach((k) => {
    const to = move(Number(k));
    if (to >= 0) out[to] = map[k];
  });
  return out;
};

// Move cells along an axis and keep every formula pointing at what it meant.
const remapCells = (cells, axis, move, change) => {
  const out = {};
  Object.keys(cells || {}).forEach((k) => {
    const [r, c] = parseKey(k);
    let cell = cells[k];
    if (isFormula(cell.v)) {
      const v = remapFormula(cell.v, axis, change);
      if (v !== cell.v) cell = { ...cell, v };
    }
    const to = move(axis === 'row' ? r : c);
    if (to < 0) return;
    out[axis === 'row' ? key(to, c) : key(r, to)] = cell;
  });
  return out;
};

const sizeField = (axis) => (axis === 'row' ? 'nr' : 'nc');
const maxLines = (axis) => (axis === 'row' ? MAX_ROWS : MAX_COLS);

// How many lines can still be added on this axis.
export const roomFor = (data, axis) => Math.max(0, maxLines(axis) - data[sizeField(axis)]);

// Insert `count` empty lines so the first new one sits at index `at`.
export const insertLines = (data, axis, at, count = 1) => {
  const rowAxis = axis === 'row';
  const n = Math.min(Math.max(1, count), roomFor(data, axis));
  if (n < 1) return data;
  const index = Math.max(0, Math.min(at, data[sizeField(axis)]));
  const move = (i) => (i >= index ? i + n : i);
  const opts = { ...data.opts };
  const freezeKey = rowAxis ? 'freezeR' : 'freezeC';
  if (index < (opts[freezeKey] || 0)) opts[freezeKey] += n;
  return {
    ...data,
    [sizeField(axis)]: data[sizeField(axis)] + n,
    cells: remapCells(data.cells, axis, move, { type: 'insert', at: index, count: n }),
    [rowAxis ? 'rowH' : 'colW']: remapIndexMap(data[rowAxis ? 'rowH' : 'colW'], move),
    [rowAxis ? 'rowS' : 'colS']: remapIndexMap(data[rowAxis ? 'rowS' : 'colS'], move),
    opts,
  };
};

// Add lines at the end of the sheet.
export const addLines = (data, axis, count) => insertLines(data, axis, data[sizeField(axis)], count);

// Delete lines first..last (inclusive); everything after moves up/left. A sheet
// always keeps at least one row and one column.
export const deleteLines = (data, axis, first, last) => {
  const rowAxis = axis === 'row';
  const total = data[sizeField(axis)];
  const a = Math.max(0, Math.min(first, last));
  const b = Math.min(total - 1, Math.max(first, last));
  if (b < a) return data;
  const n = Math.min(b - a + 1, total - 1);
  if (n < 1) return data;
  const bb = a + n - 1;
  const move = (i) => (i < a ? i : i > bb ? i - n : -1);
  const opts = { ...data.opts };
  const freezeKey = rowAxis ? 'freezeR' : 'freezeC';
  const frozen = opts[freezeKey] || 0;
  if (frozen > a) opts[freezeKey] = Math.max(a, frozen - n);
  return {
    ...data,
    [sizeField(axis)]: total - n,
    cells: remapCells(data.cells, axis, move, { type: 'delete', first: a, last: bb }),
    [rowAxis ? 'rowH' : 'colW']: remapIndexMap(data[rowAxis ? 'rowH' : 'colW'], move),
    [rowAxis ? 'rowS' : 'colS']: remapIndexMap(data[rowAxis ? 'rowS' : 'colS'], move),
    opts,
  };
};

// --- Dropdown pills --------------------------------------------------------------

const sameList = (a, b) => a.length === b.length && a.every((o, i) => o.t === b[i].t && o.k === b[i].k);

const cleanList = (list) =>
  list
    .map((o) => ({ t: String(o.t || '').trim().slice(0, 80), k: DD_COLORS[o.k] ? o.k : 'gray' }))
    .filter((o, i, all) => o.t !== '' && all.findIndex((x) => x.t === o.t) === i)
    .slice(0, 60);

const prune = (data) => {
  const inUse = new Set();
  Object.keys(data.cells).forEach((k) => {
    if (data.cells[k].dd) inUse.add(data.cells[k].dd);
  });
  const lists = {};
  Object.keys(data.lists || {}).forEach((id) => {
    if (inUse.has(id)) lists[id] = data.lists[id];
  });
  return { ...data, lists };
};

export const dropdownList = (data, r, c) => {
  const cell = data.cells[key(r, c)];
  return cell && cell.dd && data.lists && data.lists[cell.dd] ? data.lists[cell.dd] : null;
};

// Put a dropdown with `list` on every cell of the block (clipped to the sheet).
export const setDropdown = (data, block, list) => {
  const clean = cleanList(list);
  if (!clean.length) return data;
  const lists = { ...(data.lists || {}) };
  let id = Object.keys(lists).find((k) => sameList(lists[k], clean));
  if (!id) {
    let n = Object.keys(lists).length + 1;
    while (lists[`l${n}`]) n += 1;
    id = `l${n}`;
    lists[id] = clean;
  }
  const cells = { ...data.cells };
  for (let r = Math.max(0, block.r1); r <= Math.min(block.r2, data.nr - 1); r += 1) {
    for (let c = Math.max(0, block.c1); c <= Math.min(block.c2, data.nc - 1); c += 1) {
      const k = key(r, c);
      cells[k] = { ...(cells[k] || {}), dd: id };
    }
  }
  return prune({ ...data, cells, lists });
};

export const removeDropdown = (data, block) => {
  const cells = { ...data.cells };
  Object.keys(cells).forEach((k) => {
    const [r, c] = parseKey(k);
    if (r < block.r1 || r > block.r2 || c < block.c1 || c > block.c2 || !cells[k].dd) return;
    const cell = { ...cells[k] };
    delete cell.dd;
    if (Object.keys(cell).length) cells[k] = cell;
    else delete cells[k];
  });
  return prune({ ...data, cells });
};

// Change the options of an existing list for every cell that uses it.
export const updateList = (data, id, list) => {
  const clean = cleanList(list);
  if (!clean.length || !data.lists || !data.lists[id]) return data;
  return { ...data, lists: { ...data.lists, [id]: clean } };
};

// --- Fill, sort ----------------------------------------------------------------

// Copy the first row (or first column) of the selection into the rest, moving
// formulas the way a spreadsheet does.
export const fillRange = (data, sel, direction) => {
  const cells = { ...data.cells };
  const down = direction === 'down';
  for (let r = sel.r1; r <= sel.r2; r += 1) {
    for (let c = sel.c1; c <= sel.c2; c += 1) {
      if ((down && r === sel.r1) || (!down && c === sel.c1)) continue;
      const sr = down ? sel.r1 : r;
      const sc = down ? c : sel.c1;
      const source = data.cells[key(sr, sc)];
      const k = key(r, c);
      if (!source) {
        delete cells[k];
      } else {
        const copy = { ...source };
        if (isFormula(copy.v)) copy.v = shiftFormula(copy.v, r - sr, c - sc);
        cells[k] = copy;
      }
    }
  }
  return { ...data, cells };
};

const compareForSort = (a, b) => {
  const blankA = a === '' || a === null || a === undefined;
  const blankB = b === '' || b === null || b === undefined;
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1; // blanks last
  const rank = (v) => (typeof v === 'number' ? 0 : typeof v === 'boolean' ? 2 : 1);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (typeof a === 'string') return a.toLowerCase().localeCompare(b.toLowerCase());
  return a < b ? -1 : a > b ? 1 : 0;
};

// Sort the rows of a block by one column. `valueOf(r, c)` supplies computed values.
// `block` is { r1, r2, c1, c2 }; `byCol` is the column to sort on.
export const sortBlock = (data, block, byCol, ascending, valueOf) => {
  const rows = [];
  for (let r = block.r1; r <= block.r2; r += 1) rows.push(r);
  const order = rows
    .map((r, i) => ({ r, i, v: valueOf(r, byCol) }))
    .sort((x, y) => {
      const d = compareForSort(x.v, y.v);
      // Blanks stay at the bottom either way.
      const blank = (x.v === '' || x.v === undefined || x.v === null) || (y.v === '' || y.v === undefined || y.v === null);
      return (blank ? d : ascending ? d : -d) || x.i - y.i;
    });
  const cells = { ...data.cells };
  rows.forEach((target, i) => {
    const sourceRow = order[i].r;
    for (let c = block.c1; c <= block.c2; c += 1) {
      const source = data.cells[key(sourceRow, c)];
      const k = key(target, c);
      if (!source) {
        delete cells[k];
      } else {
        const copy = { ...source };
        if (isFormula(copy.v)) copy.v = moveRowRefs(copy.v, sourceRow, target);
        cells[k] = copy;
      }
    }
  });
  return { ...data, cells };
};

// --- Find & replace --------------------------------------------------------------

export const findCells = (data, text, matchCase) => {
  if (!text) return [];
  const needle = matchCase ? text : text.toLowerCase();
  const hits = [];
  Object.keys(data.cells).forEach((k) => {
    const v = data.cells[k].v;
    if (v === undefined || v === null) return;
    const hay = matchCase ? String(v) : String(v).toLowerCase();
    if (hay.includes(needle)) {
      const [r, c] = parseKey(k);
      hits.push({ r, c });
    }
  });
  return hits.sort((a, b) => a.r - b.r || a.c - b.c);
};

export const replaceInCells = (data, text, replacement, matchCase, only) => {
  if (!text) return { data, count: 0 };
  const cells = { ...data.cells };
  const flags = matchCase ? 'g' : 'gi';
  const re = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  let count = 0;
  Object.keys(cells).forEach((k) => {
    if (only) {
      const [r, c] = parseKey(k);
      if (r !== only.r || c !== only.c) return;
    }
    const cell = cells[k];
    if (cell.v === undefined || cell.v === null) return;
    const before = String(cell.v);
    const after = before.replace(re, () => {
      count += 1;
      return replacement;
    });
    if (after !== before) cells[k] = { ...cell, v: after };
  });
  return { data: { ...data, cells }, count };
};

export const normalizeRange = (anchor, focus) => ({
  r1: Math.min(anchor.r, focus.r),
  r2: Math.max(anchor.r, focus.r),
  c1: Math.min(anchor.c, focus.c),
  c2: Math.max(anchor.c, focus.c),
});
