// Pure data helpers for the Sheets pill. No React in here, so it is easy to test.
//
// A sheet is stored as JSON text:
//   {
//     v: 1, theme: 'docs',
//     cells: { "row,col": { v: 'text', b:1, i:1, u:1, s:1, fs:14, c:'#hex', bg:'#hex', a:'l|c|r', w:1, bd:'tbrl' } },
//     colW: { col: px }, rowH: { row: px },          // only sizes that were changed
//     colS: { col: {style} }, rowS: { row: {style} }, // whole-column / whole-row formatting
//     base: {style},                                  // whole-sheet formatting
//     opts: { grid, headers, headerRow, banded, freezeR, freezeC, dw, dh }
//   }
// Only cells that hold something are stored, so the grid itself can be endless.

export const DEFAULT_COL_W = 100;
export const DEFAULT_ROW_H = 26;
export const MIN_SIZE = 16;
export const MAX_SIZE = 800;

export const STYLE_KEYS = ['b', 'i', 'u', 's', 'fs', 'c', 'bg', 'a', 'w', 'bd'];

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

export const emptySheet = () => ({
  v: 1,
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
    ['Spring Sponsor Drive', 'Email', '$1,200', 'Planned'],
    ['Robot Reveal', 'Instagram', '$300', 'In progress'],
    ['Build Season Recap', 'YouTube', '$150', 'Done'],
  ];
  rows.forEach((row, r) =>
    row.forEach((value, c) => {
      sheet.cells[`${r},${c}`] = { v: value };
    })
  );
  sheet.colW = { 0: 170, 1: 120, 3: 120 };
  return sheet;
};

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const normalizeSheet = (raw) => {
  const base = emptySheet();
  if (!isPlainObject(raw)) return base;
  return {
    v: 1,
    theme: THEMES[raw.theme] ? raw.theme : base.theme,
    cells: isPlainObject(raw.cells) ? raw.cells : {},
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

export const normalizeRange = (anchor, focus) => ({
  r1: Math.min(anchor.r, focus.r),
  r2: Math.max(anchor.r, focus.r),
  c1: Math.min(anchor.c, focus.c),
  c2: Math.max(anchor.c, focus.c),
});
