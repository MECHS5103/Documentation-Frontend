import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as M from './sheetModel';
import * as F from './formula';

const HEADER_W = 46;
const HEADER_H = 24;
const BLUE = '#207ADB';
const INK = '#1A202C';
const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40];
const HEIGHTS = [240, 320, 420, 560, 720];
const PALETTE = [
  '#1A202C', '#2D3748', '#4A5568', '#A0AEC0', '#E2E8F0', '#FFFFFF',
  '#E53E3E', '#F6A053', '#ECC94B', '#2F855A', '#319795', '#207ADB',
  '#805AD5', '#D53F8C', '#FED7D7', '#FEEBC8', '#FEFCBF', '#C6F6D5',
  '#B2F5EA', '#BEE3F8', '#E9D8FD', '#FED7E2',
];
const MAX_HISTORY = 100;

// ---------------------------------------------------------------- small UI --

const btn = (active, extra) => ({
  height: 28,
  minWidth: 28,
  padding: '0 8px',
  border: `2px solid ${INK}`,
  borderBottomWidth: 3,
  borderRadius: 8,
  background: active ? BLUE : '#FFFFFF',
  color: active ? '#FFFFFF' : INK,
  fontFamily: 'Chewy, Arial, sans-serif',
  fontSize: 13,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  boxSizing: 'border-box',
  lineHeight: 1,
  ...extra,
});

const field = {
  height: 28,
  border: `2px solid ${INK}`,
  borderRadius: 8,
  background: '#FFFFFF',
  color: INK,
  fontFamily: 'Arial, sans-serif',
  fontSize: 13,
  padding: '0 6px',
  boxSizing: 'border-box',
};

const Sep = () => <span style={{ width: 2, height: 22, background: '#CBD5E1', margin: '0 2px' }} />;

const AlignIcon = ({ kind }) => {
  const lines = {
    l: [[0, 14], [0, 9], [0, 12]],
    c: [[1, 13], [3.5, 10.5], [2, 12]],
    r: [[0, 14], [5, 14], [2, 14]],
  }[kind];
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
      {lines.map(([x1, x2], i) => (
        <line key={i} x1={x1} x2={x2} y1={1.5 + i * 4.5} y2={1.5 + i * 4.5} stroke="currentColor" strokeWidth="2" />
      ))}
    </svg>
  );
};

const BorderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
    <rect x="1.5" y="1.5" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" />
    <line x1="7" x2="7" y1="1.5" y2="12.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="1.5" x2="12.5" y1="7" y2="7" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

// The coloured pill a dropdown cell shows.
const DropdownPill = ({ text, option, caret, height, size, bold }) => {
  const colors = option ? M.DD_COLORS[option.k] || M.DD_COLORS.gray : M.DD_COLORS.gray;
  if (text === '') {
    return caret ? <span style={{ marginLeft: 'auto', color: '#A0AEC0', fontSize: 11, paddingRight: 2 }}>▾</span> : null;
  }
  return (
    <span
      style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        boxSizing: 'border-box',
        height,
        padding: '0 8px 0 10px',
        borderRadius: 999,
        background: colors.bg,
        color: colors.fg,
        fontSize: size,
        fontWeight: bold ? 700 : 500,
        lineHeight: 1,
        overflow: 'hidden',
      }}>
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span>
      {caret && <span style={{ marginLeft: 6, fontSize: 10, flexShrink: 0 }}>▼</span>}
    </span>
  );
};

const Menu = ({ children, style }) => (
  <div
    onMouseDown={(e) => e.stopPropagation()}
    style={{
      position: 'absolute',
      top: 32,
      left: 0,
      zIndex: 60,
      background: '#FFFFFF',
      border: `2px solid ${INK}`,
      borderBottomWidth: 4,
      borderRadius: 10,
      padding: 6,
      minWidth: 150,
      boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
      ...style,
    }}>
    {children}
  </div>
);

const MenuItem = ({ children, onClick, active }) => (
  <div
    role="button"
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    style={{
      padding: '6px 8px',
      borderRadius: 6,
      cursor: 'pointer',
      fontFamily: 'Arial, sans-serif',
      fontSize: 13,
      background: active ? '#E8F1FC' : 'transparent',
      color: INK,
      whiteSpace: 'nowrap',
    }}>
    {children}
  </div>
);

// The browser's colour picker fires "input" on every pixel you drag; the native
// "change" event fires once when you settle on a colour.
const CustomColor = ({ onPick }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const handler = () => onPick(el.value.toUpperCase());
    el.addEventListener('change', handler);
    return () => el.removeEventListener('change', handler);
  }, [onPick]);
  return <input ref={ref} type="color" style={{ width: 28, height: 22, padding: 0, border: 'none', background: 'none' }} />;
};

const ColorMenu = ({ onPick, autoLabel }) => (
  <Menu style={{ width: 196 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
      {PALETTE.map((color) => (
        <div
          key={color}
          role="button"
          title={color}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(color)}
          style={{
            height: 24,
            borderRadius: 6,
            background: color,
            border: `2px solid ${color === '#FFFFFF' ? '#A0AEC0' : INK}`,
            cursor: 'pointer',
            boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
    <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
      <MenuItem onClick={() => onPick(null)}>{autoLabel}</MenuItem>
      <label style={{ fontFamily: 'Arial', fontSize: 12, color: INK, display: 'flex', alignItems: 'center', gap: 4 }}>
        Custom
        <CustomColor onPick={onPick} />
      </label>
    </div>
  </Menu>
);

// ------------------------------------------------------------------ grid ----

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export default function SheetGrid({ text, onChange, editable = false }) {
  const rootRef = useRef(null);
  const scrollerRef = useRef(null);
  const editRef = useRef(null);
  const lastEmitted = useRef(text);
  const history = useRef({ past: [], future: [] });
  const drag = useRef(null);
  const pendingScroll = useRef(null);
  const cancelEdit = useRef(false);
  // The window listeners must stay the same function while a drag lasts, but
  // always run the newest handler, so they forward to a ref.
  const dragMove = useRef(null);
  const dragUp = useRef(null);
  const moveListener = useRef((e) => dragMove.current && dragMove.current(e));
  const upListener = useRef((e) => dragUp.current && dragUp.current(e));

  const [data, setDataState] = useState(() => M.parseSheet(text));
  const dataRef = useRef(data);
  const [sel, setSel] = useState({ kind: 'cell', ar: 0, ac: 0, fr: 0, fc: 0 });
  const [editing, setEditing] = useState(null); // { r, c, value, from: 'cell' | 'bar' }
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [view, setView] = useState({ w: 700, h: 420 });
  const [menu, setMenu] = useState(null);
  const [find, setFind] = useState(null); // { text, repl, matchCase, index } while the find bar is open
  const clip = useRef(null);
  const [ddCell, setDdCell] = useState(null); // { r, c } while a dropdown cell's options are open
  const [ddEditor, setDdEditor] = useState(null); // { id, list: [{ t, k }] } while editing option lists
  const [cursor, setCursor] = useState('cell');
  const [sizeDraft, setSizeDraft] = useState({ w: null, h: null });

  const setData = useCallback((next) => {
    dataRef.current = next;
    setDataState(next);
  }, []);

  // Pick up changes that come from outside (reload, cancel, switching pages).
  useEffect(() => {
    if (text !== lastEmitted.current) {
      lastEmitted.current = text;
      setData(M.parseSheet(text));
      history.current = { past: [], future: [] };
      setEditing(null);
    }
  }, [text, setData]);

  const emit = useCallback(
    (next) => {
      const serialized = M.serializeSheet(next);
      lastEmitted.current = serialized;
      if (onChange) onChange(serialized);
    },
    [onChange]
  );

  // Every change goes through here so it can be undone.
  const commit = useCallback(
    (next) => {
      const prev = dataRef.current;
      if (next === prev) return;
      history.current.past.push(prev);
      if (history.current.past.length > MAX_HISTORY) history.current.past.shift();
      history.current.future = [];
      setData(next);
      emit(next);
    },
    [emit, setData]
  );

  const undo = () => {
    const h = history.current;
    if (!h.past.length) return;
    h.future.push(dataRef.current);
    const prev = h.past.pop();
    setData(prev);
    emit(prev);
  };
  const redo = () => {
    const h = history.current;
    if (!h.future.length) return;
    h.past.push(dataRef.current);
    const next = h.future.pop();
    setData(next);
    emit(next);
  };

  // ------------------------------------------------------------- geometry --
  const theme = M.THEMES[data.theme] || M.THEMES.docs;
  const opts = data.opts;
  const nr = data.nr;
  const nc = data.nc;
  const hw = opts.headers ? HEADER_W : 0;
  const hh = opts.headers ? HEADER_H : 0;
  const colAxis = useMemo(() => M.makeAxis(opts.dw || M.DEFAULT_COL_W, data.colW), [opts.dw, data.colW]);
  const rowAxis = useMemo(() => M.makeAxis(opts.dh || M.DEFAULT_ROW_H, data.rowH), [opts.dh, data.rowH]);
  const contentW = Math.max(60, view.w - hw);
  const contentH = Math.max(40, view.h - hh);

  // Frozen panes can take at most most of the view, or nothing would scroll.
  const freezeC = useMemo(() => {
    let n = clamp(opts.freezeC || 0, 0, Math.min(30, nc - 1));
    while (n > 0 && colAxis.offset(n) > contentW * 0.6) n -= 1;
    return n;
  }, [opts.freezeC, colAxis, contentW, nc]);
  const freezeR = useMemo(() => {
    let n = clamp(opts.freezeR || 0, 0, Math.min(50, nr - 1));
    while (n > 0 && rowAxis.offset(n) > contentH * 0.6) n -= 1;
    return n;
  }, [opts.freezeR, rowAxis, contentH, nr]);
  const frozenW = colAxis.offset(freezeC);
  const frozenH = rowAxis.offset(freezeR);

  const totalW = colAxis.offset(nc);
  const totalH = rowAxis.offset(nr);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const measure = () => setView({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (pendingScroll.current && scrollerRef.current) {
      const { x, y } = pendingScroll.current;
      if (x !== undefined) scrollerRef.current.scrollLeft = x;
      if (y !== undefined) scrollerRef.current.scrollTop = y;
      pendingScroll.current = null;
    }
  });

  const onScroll = (e) => {
    const el = e.currentTarget;
    const x = el.scrollLeft;
    const y = el.scrollTop;
    setScroll({ x, y });
  };

  const dispX = (c) => (c < freezeC ? colAxis.offset(c) : colAxis.offset(c) - scroll.x);
  const dispY = (r) => (r < freezeR ? rowAxis.offset(r) : rowAxis.offset(r) - scroll.y);

  const visibleCols = useMemo(() => {
    const list = [];
    for (let c = 0; c < freezeC; c += 1) list.push(c);
    const first = Math.max(freezeC, colAxis.indexAt(scroll.x + frozenW));
    const last = Math.min(nc - 1, colAxis.indexAt(scroll.x + contentW));
    for (let c = first; c <= last; c += 1) list.push(c);
    return list;
  }, [freezeC, colAxis, scroll.x, frozenW, contentW, nc]);
  const visibleRows = useMemo(() => {
    const list = [];
    for (let r = 0; r < freezeR; r += 1) list.push(r);
    const first = Math.max(freezeR, rowAxis.indexAt(scroll.y + frozenH));
    const last = Math.min(nr - 1, rowAxis.indexAt(scroll.y + contentH));
    for (let r = first; r <= last; r += 1) list.push(r);
    return list;
  }, [freezeR, rowAxis, scroll.y, frozenH, contentH, nr]);

  // ------------------------------------------------------------ selection --
  const range = useMemo(() => {
    const n = M.normalizeRange({ r: sel.ar, c: sel.ac }, { r: sel.fr, c: sel.fc });
    return { kind: sel.kind, ...n };
  }, [sel]);
  const used = useMemo(() => ({ row: nr - 1, col: nc - 1 }), [nr, nc]);
  const evaluator = useMemo(
    () =>
      F.createEvaluator(data.cells, {
        rows: nr,
        cols: nc,
        nfOf: (r, c) => M.resolveStyle(data, r, c, used).nf,
      }),
    [data, nr, nc, used]
  );
  const activeStyle = M.resolveStyle(data, sel.ar, sel.ac, used);
  const activeCell = data.cells[M.key(sel.ar, sel.ac)];
  const activeValue = activeCell && activeCell.v ? activeCell.v : '';

  const selName = (() => {
    if (sel.kind === 'all') return 'All';
    if (sel.kind === 'col') {
      return range.c1 === range.c2 ? `${M.colName(range.c1)}:${M.colName(range.c1)}` : `${M.colName(range.c1)}:${M.colName(range.c2)}`;
    }
    if (sel.kind === 'row') return range.r1 === range.r2 ? `${range.r1 + 1}:${range.r1 + 1}` : `${range.r1 + 1}:${range.r2 + 1}`;
    if (range.r1 === range.r2 && range.c1 === range.c2) return M.cellName(range.r1, range.c1);
    return `${M.cellName(range.r1, range.c1)}:${M.cellName(range.r2, range.c2)}`;
  })();

  const ensureVisible = (r, c) => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = {};
    if (c >= freezeC) {
      const left = colAxis.offset(c);
      const right = left + colAxis.sizeAt(c);
      if (left < el.scrollLeft + frozenW) target.x = Math.max(0, left - frozenW);
      else if (right > el.scrollLeft + contentW) target.x = right - contentW;
    }
    if (r >= freezeR) {
      const top = rowAxis.offset(r);
      const bottom = top + rowAxis.sizeAt(r);
      if (top < el.scrollTop + frozenH) target.y = Math.max(0, top - frozenH);
      else if (bottom > el.scrollTop + contentH) target.y = bottom - contentH;
    }
    if (target.x !== undefined || target.y !== undefined) {
      pendingScroll.current = target;
      // Applying right away covers moves that stay inside the current extent.
      if (target.x !== undefined) el.scrollLeft = target.x;
      if (target.y !== undefined) el.scrollTop = target.y;
    }
  };

  const moveActive = (dr, dc, extend) => {
    const r = clamp((extend ? sel.fr : sel.ar) + dr, 0, nr - 1);
    const c = clamp((extend ? sel.fc : sel.ac) + dc, 0, nc - 1);
    if (extend) {
      setSel({ ...sel, kind: sel.kind === 'all' ? 'cell' : sel.kind, fr: r, fc: c });
    } else {
      setSel({ kind: 'cell', ar: r, ac: c, fr: r, fc: c });
    }
    ensureVisible(r, c);
  };

  // --------------------------------------------------------------- editing --
  const startEdit = (r, c, value, from = 'cell') => {
    if (!editable) return;
    const cell = dataRef.current.cells[M.key(r, c)];
    if (from === 'cell' && M.dropdownList(dataRef.current, r, c)) {
      // A dropdown cell opens its options instead of a text box.
      setDdCell({ r, c });
      setMenu('ddcell');
      return;
    }
    setEditing({ r, c, value: value !== undefined ? value : cell && cell.v ? cell.v : '', from });
    setMenu(null);
  };

  const finishEdit = (move) => {
    const e = editing;
    if (!e) return;
    cancelEdit.current = false;
    const current = dataRef.current.cells[M.key(e.r, e.c)];
    if ((current && current.v ? current.v : '') !== e.value) {
      commit(M.setCellValue(dataRef.current, e.r, e.c, e.value));
    }
    setEditing(null);
    if (move) {
      const r = clamp(e.r + move[0], 0, nr - 1);
      const c = clamp(e.c + move[1], 0, nc - 1);
      setSel({ kind: 'cell', ar: r, ac: c, fr: r, fc: c });
      ensureVisible(r, c);
    }
    if (scrollerRef.current) scrollerRef.current.focus({ preventScroll: true });
  };

  const abortEdit = () => {
    cancelEdit.current = true;
    setEditing(null);
    if (scrollerRef.current) scrollerRef.current.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (editing && editing.from === 'cell' && editRef.current) {
      editRef.current.focus();
      const length = editRef.current.value.length;
      editRef.current.setSelectionRange(length, length);
    }
  }, [editing && editing.r, editing && editing.c, editing && editing.from]); // eslint-disable-line react-hooks/exhaustive-deps

  // ------------------------------------------------------------- formatting --
  const selOps = () => ({ ...range });
  const apply = (patch) => {
    if (!editable) return;
    commit(M.applyStyle(dataRef.current, selOps(), patch));
  };
  const toggle = (k) => apply({ [k]: activeStyle[k] ? null : 1 });
  const setOpt = (patch) => commit({ ...dataRef.current, opts: { ...dataRef.current.opts, ...patch } });

  const cols = () => {
    const out = [];
    for (let c = range.c1; c <= range.c2; c += 1) out.push(c);
    return out;
  };
  const rows = () => {
    const out = [];
    for (let r = range.r1; r <= range.r2; r += 1) out.push(r);
    return out;
  };

  const lineEdit = (action) => {
    if (!editable) return;
    const d = dataRef.current;
    const onRows = action.endsWith('row');
    const axis = onRows ? 'row' : 'col';
    const first = onRows ? range.r1 : range.c1;
    const last = onRows ? range.r2 : range.c2;
    const wholeSheet = sel.kind === 'all';
    const count = last - first + 1;
    // Selecting whole columns means rows can't be meaningfully edited and vice versa.
    if ((onRows && sel.kind === 'col') || (!onRows && sel.kind === 'row')) {
      setMenu(null);
      return;
    }
    if (action.startsWith('del')) {
      if (wholeSheet) { setMenu(null); return; }
      commit(M.deleteLines(d, axis, first, last));
      if (onRows) setSel({ kind: 'row', ar: first, ac: 0, fr: first, fc: 0 });
      else setSel({ kind: 'col', ar: 0, ac: first, fr: 0, fc: first });
    } else {
      const before = action.startsWith('insBefore');
      commit(M.insertLines(d, axis, before ? first : last + 1, count));
      if (!before) {
        const a = last + 1;
        const b = last + count;
        setSel(onRows
          ? { kind: 'row', ar: a, ac: 0, fr: b, fc: 0 }
          : { kind: 'col', ar: 0, ac: a, fr: 0, fc: b });
      }
    }
    setMenu(null);
  };
  const lineCount = (onRows) => (onRows ? range.r2 - range.r1 + 1 : range.c2 - range.c1 + 1);
  const noun = (onRows) => {
    const n = lineCount(onRows);
    return `${n} ${onRows ? 'row' : 'column'}${n === 1 ? '' : 's'}`;
  };

  // --- add rows / columns, fill, sort, number format ----------------------------
  const addMore = (axis, count) => {
    if (!editable) return;
    const d = dataRef.current;
    if (M.roomFor(d, axis) < 1) return;
    commit(M.addLines(d, axis, count));
    setMenu(null);
  };

  const fill = (direction) => {
    if (!editable) return;
    const r = { ...range };
    if (direction === 'down' && r.r1 === r.r2 && r.r1 + 1 < nr) {
      r.r2 = r.r1 + 1; // a single cell fills into the one below, like a spreadsheet
    }
    if (direction === 'right' && r.c1 === r.c2 && r.c1 + 1 < nc) r.c2 = r.c1 + 1;
    if (r.kind === 'col' || r.kind === 'all') { r.r1 = 0; r.r2 = nr - 1; }
    if (r.kind === 'row' || r.kind === 'all') { r.c1 = 0; r.c2 = nc - 1; }
    commit(M.fillRange(dataRef.current, r, direction));
    setSel({ kind: 'cell', ar: r.r1, ac: r.c1, fr: r.r2, fc: r.c2 });
    setMenu(null);
  };

  const lastUsed = () => M.usedExtent(dataRef.current);

  const sortSheet = (ascending) => {
    if (!editable) return;
    const u = lastUsed();
    const start = Math.max(freezeR, opts.headerRow ? 1 : 0);
    if (u.row < start) return;
    commit(M.sortBlock(dataRef.current, { r1: start, r2: u.row, c1: 0, c2: Math.max(u.col, sel.ac) }, sel.ac, ascending, evaluator.value));
    setMenu(null);
  };
  const sortSelection = (ascending) => {
    if (!editable) return;
    const block = { r1: range.r1, r2: range.r2, c1: range.c1, c2: range.c2 };
    if (range.kind === 'col' || range.kind === 'all') {
      block.r1 = Math.max(freezeR, opts.headerRow ? 1 : 0);
      block.r2 = Math.max(block.r1, lastUsed().row);
    }
    if (range.kind === 'row' || range.kind === 'all') { block.c1 = 0; block.c2 = Math.max(0, lastUsed().col); }
    commit(M.sortBlock(dataRef.current, block, block.c1, ascending, evaluator.value));
    setMenu(null);
  };

  // --- dropdown pills ---------------------------------------------------------------
  const ddBlock = () => {
    const b = { r1: range.r1, r2: range.r2, c1: range.c1, c2: range.c2 };
    if (range.kind === 'col' || range.kind === 'all') { b.r1 = 0; b.r2 = nr - 1; }
    if (range.kind === 'row' || range.kind === 'all') { b.c1 = 0; b.c2 = nc - 1; }
    return b;
  };
  const activeDdList = M.dropdownList(data, sel.ar, sel.ac);
  const applyDropdown = (list) => {
    if (!editable) return;
    commit(M.setDropdown(dataRef.current, ddBlock(), list));
    setMenu(null);
  };
  const removeDd = () => {
    if (!editable) return;
    commit(M.removeDropdown(dataRef.current, ddBlock()));
    setMenu(null);
  };
  const openDdEditor = (existing) => {
    const cell = dataRef.current.cells[M.key(sel.ar, sel.ac)];
    const list = existing && activeDdList ? activeDdList : [{ t: '', k: 'blue' }, { t: '', k: 'yellow' }];
    setDdEditor({ id: existing && cell ? cell.dd : null, list: list.map((o) => ({ ...o })) });
    setMenu(null);
  };
  const saveDdEditor = () => {
    if (!ddEditor) return;
    const d = dataRef.current;
    commit(ddEditor.id ? M.updateList(d, ddEditor.id, ddEditor.list) : M.setDropdown(d, ddBlock(), ddEditor.list));
    setDdEditor(null);
  };
  const pickOption = (text) => {
    if (!ddCell) return;
    commit(M.setCellValue(dataRef.current, ddCell.r, ddCell.c, text));
    setMenu(null);
    setDdCell(null);
    if (scrollerRef.current) scrollerRef.current.focus({ preventScroll: true });
  };

  // --- find & replace --------------------------------------------------------------
  const matches = useMemo(
    () => (find ? M.findCells(data, find.text, find.matchCase) : []),
    [find && find.text, find && find.matchCase, data] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const goToMatch = (index) => {
    if (!matches.length) return;
    const i = ((index % matches.length) + matches.length) % matches.length;
    setFind((f) => ({ ...f, index: i }));
    const { r, c } = matches[i];
    setSel({ kind: 'cell', ar: r, ac: c, fr: r, fc: c });
    ensureVisible(r, c);
  };
  const replaceOne = () => {
    if (!editable || !find || !matches.length) return;
    const i = Math.min(find.index || 0, matches.length - 1);
    const out = M.replaceInCells(dataRef.current, find.text, find.repl || '', find.matchCase, matches[i]);
    if (out.count) commit(out.data);
  };
  const replaceAll = () => {
    if (!editable || !find || !matches.length) return;
    const out = M.replaceInCells(dataRef.current, find.text, find.repl || '', find.matchCase);
    if (out.count) commit(out.data);
  };

  const applySize = (axis, value) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n < M.MIN_SIZE) return;
    if (sel.kind === 'all') {
      setOpt(axis === 'col' ? { dw: Math.min(M.MAX_SIZE, n) } : { dh: Math.min(M.MAX_SIZE, n) });
    } else {
      commit(M.setSize(dataRef.current, axis, axis === 'col' ? cols() : rows(), n));
    }
  };

  const freezeAction = (kind) => {
    if (kind === 'none') setOpt({ freezeR: 0, freezeC: 0 });
    else if (kind === 'row') setOpt({ freezeR: 1 });
    else if (kind === 'col') setOpt({ freezeC: 1 });
    else {
      setOpt({
        freezeR: sel.kind === 'col' ? opts.freezeR : range.r2 + 1,
        freezeC: sel.kind === 'row' ? opts.freezeC : range.c2 + 1,
      });
    }
    setMenu(null);
  };

  // ----------------------------------------------------------------- mouse --
  const localPoint = (e) => {
    const rect = rootRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const colAtX = (x) => {
    const cx = x - hw;
    return Math.min(nc - 1, colAxis.indexAt(cx < frozenW ? Math.max(0, cx) : cx + scroll.x));
  };
  const rowAtY = (y) => {
    const cy = y - hh;
    return Math.min(nr - 1, rowAxis.indexAt(cy < frozenH ? Math.max(0, cy) : cy + scroll.y));
  };

  const hitTest = (x, y) => {
    const el = scrollerRef.current;
    if (x > el.clientWidth || y > el.clientHeight) return { zone: 'scrollbar' };
    const inColHdr = hh > 0 && y < hh;
    const inRowHdr = hw > 0 && x < hw;
    if (inColHdr && inRowHdr) return { zone: 'corner' };
    if (inColHdr) {
      const c = colAtX(x);
      const edgeRight = hw + dispX(c) + colAxis.sizeAt(c);
      const edgeLeft = hw + dispX(c);
      if (Math.abs(x - edgeRight) <= 4) return { zone: 'colhdr', c, resize: c };
      if (c > 0 && Math.abs(x - edgeLeft) <= 4) return { zone: 'colhdr', c, resize: c - 1 };
      return { zone: 'colhdr', c };
    }
    if (inRowHdr) {
      const r = rowAtY(y);
      const edgeBottom = hh + dispY(r) + rowAxis.sizeAt(r);
      const edgeTop = hh + dispY(r);
      if (Math.abs(y - edgeBottom) <= 4) return { zone: 'rowhdr', r, resize: r };
      if (r > 0 && Math.abs(y - edgeTop) <= 4) return { zone: 'rowhdr', r, resize: r - 1 };
      return { zone: 'rowhdr', r };
    }
    return { zone: 'cell', r: rowAtY(y), c: colAtX(x) };
  };

  const onMouseMoveHover = (e) => {
    if (drag.current) return;
    const p = localPoint(e);
    const h = hitTest(p.x, p.y);
    const next = h.resize !== undefined ? (h.zone === 'colhdr' ? 'col-resize' : 'row-resize') : 'cell';
    if (next !== cursor) setCursor(next);
  };

  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    const p = localPoint(e);
    const h = hitTest(p.x, p.y);
    if (h.zone === 'scrollbar') return;
    e.preventDefault();
    if (
      editing &&
      h.zone === 'cell' &&
      F.isFormula(editing.value) &&
      /[=(,+\-*/&^<>:]$/.test(editing.value) &&
      !(h.r === editing.r && h.c === editing.c)
    ) {
      // While typing a formula, clicking a cell puts its name in the formula.
      setEditing({ ...editing, value: editing.value + M.cellName(h.r, h.c) });
      if (editing.from === 'cell' && editRef.current) editRef.current.focus();
      return;
    }
    if (scrollerRef.current) scrollerRef.current.focus({ preventScroll: true });
    setMenu(null);

    if (h.resize !== undefined) {
      if (!editable) return;
      const axis = h.zone === 'colhdr' ? 'col' : 'row';
      const index = h.resize;
      drag.current = {
        type: 'resize',
        axis,
        index,
        start: axis === 'col' ? p.x : p.y,
        size: axis === 'col' ? colAxis.sizeAt(index) : rowAxis.sizeAt(index),
        before: dataRef.current,
      };
      attachDrag();
      return;
    }

    if (h.zone === 'corner') {
      setSel({ kind: 'all', ar: 0, ac: 0, fr: 0, fc: 0 });
      return;
    }
    if (h.zone === 'colhdr') {
      if (e.shiftKey) setSel((cur) => ({ ...cur, kind: 'col', fc: h.c }));
      else setSel({ kind: 'col', ar: 0, ac: h.c, fr: 0, fc: h.c });
      drag.current = { type: 'select', zone: 'colhdr' };
      attachDrag();
      return;
    }
    if (h.zone === 'rowhdr') {
      if (e.shiftKey) setSel((cur) => ({ ...cur, kind: 'row', fr: h.r }));
      else setSel({ kind: 'row', ar: h.r, ac: 0, fr: h.r, fc: 0 });
      drag.current = { type: 'select', zone: 'rowhdr' };
      attachDrag();
      return;
    }
    if (e.shiftKey) setSel((cur) => ({ ...cur, kind: 'cell', fr: h.r, fc: h.c }));
    else setSel({ kind: 'cell', ar: h.r, ac: h.c, fr: h.r, fc: h.c });
    if (editable && !e.shiftKey && M.dropdownList(dataRef.current, h.r, h.c)) {
      const right = hw + dispX(h.c) + colAxis.sizeAt(h.c);
      const wasActive = sel.kind === 'cell' && sel.ar === h.r && sel.ac === h.c && sel.fr === h.r && sel.fc === h.c;
      if (wasActive || right - p.x <= 30) {
        setDdCell({ r: h.r, c: h.c });
        setMenu('ddcell');
        e.stopPropagation(); // keep the click-away listener from closing it right away
      }
    }
    drag.current = { type: 'select', zone: 'cell' };
    attachDrag();
  };

  const attachDrag = () => {
    window.addEventListener('mousemove', moveListener.current);
    window.addEventListener('mouseup', upListener.current);
  };

  dragMove.current = (e) => {
    const d = drag.current;
    if (!d) return;
    const p = localPoint(e);
    if (d.type === 'resize') {
      const delta = (d.axis === 'col' ? p.x : p.y) - d.start;
      const size = clamp(Math.round(d.size + delta), M.MIN_SIZE, M.MAX_SIZE);
      setData(M.setSize(d.before, d.axis, [d.index], size));
      return;
    }
    const h = hitTest(p.x, p.y);
    if (d.zone === 'colhdr') setSel((cur) => ({ ...cur, fc: colAtX(Math.max(p.x, hw)) }));
    else if (d.zone === 'rowhdr') setSel((cur) => ({ ...cur, fr: rowAtY(Math.max(p.y, hh)) }));
    else if (h.zone === 'cell' || h.zone === 'colhdr' || h.zone === 'rowhdr' || h.zone === 'corner') {
      setSel((cur) => ({ ...cur, fr: rowAtY(Math.max(p.y, hh)), fc: colAtX(Math.max(p.x, hw)) }));
    }
  };

  dragUp.current = () => {
    const d = drag.current;
    drag.current = null;
    window.removeEventListener('mousemove', moveListener.current);
    window.removeEventListener('mouseup', upListener.current);
    if (d && d.type === 'resize') {
      const after = dataRef.current;
      if (after !== d.before) {
        // Record the whole drag as a single undo step.
        history.current.past.push(d.before);
        history.current.future = [];
        emit(after);
      }
    }
  };

  useEffect(() => {
    const move = moveListener.current;
    const up = upListener.current;
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  const onDoubleClick = (e) => {
    const p = localPoint(e);
    const h = hitTest(p.x, p.y);
    if (h.zone === 'cell' && editable) startEdit(h.r, h.c);
  };

  // Close menus when clicking elsewhere on the page.
  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  // -------------------------------------------------------------- keyboard --
  const onKeyDown = (e) => {
    if (editing) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;

    if (mod && !e.altKey) {
      const lower = k.toLowerCase();
      if (lower === 'z') {
        e.preventDefault();
        if (editable) (e.shiftKey ? redo : undo)();
        return;
      }
      if (lower === 'y') {
        e.preventDefault();
        if (editable) redo();
        return;
      }
      if (lower === 'a') {
        e.preventDefault();
        setSel({ kind: 'all', ar: 0, ac: 0, fr: 0, fc: 0 });
        return;
      }
      if (lower === 'f' || lower === 'h') {
        e.preventDefault();
        setFind((f) => f || { text: '', repl: '', matchCase: false, index: 0 });
        return;
      }
      if (editable && (lower === 'd' || lower === 'r')) {
        e.preventDefault();
        fill(lower === 'd' ? 'down' : 'right');
        return;
      }
      if (editable && (lower === 'b' || lower === 'i' || lower === 'u')) {
        e.preventDefault();
        toggle(lower);
        return;
      }
      return; // let copy / cut / paste events through
    }

    const shift = e.shiftKey;
    const arrows = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (arrows[k]) {
      e.preventDefault();
      moveActive(arrows[k][0], arrows[k][1], shift);
    } else if (k === 'Tab') {
      e.preventDefault();
      moveActive(0, shift ? -1 : 1, false);
    } else if (k === 'Enter') {
      e.preventDefault();
      if (editable) startEdit(sel.ar, sel.ac);
      else moveActive(shift ? -1 : 1, 0, false);
    } else if (k === 'F2') {
      e.preventDefault();
      startEdit(sel.ar, sel.ac);
    } else if (k === 'PageDown' || k === 'PageUp') {
      e.preventDefault();
      const rowsPerPage = Math.max(1, visibleRows.length - freezeR - 1);
      moveActive(k === 'PageDown' ? rowsPerPage : -rowsPerPage, 0, shift);
    } else if (k === 'Home') {
      e.preventDefault();
      const r = mod ? 0 : sel.ar;
      setSel({ kind: 'cell', ar: r, ac: 0, fr: r, fc: 0 });
      ensureVisible(r, 0);
    } else if ((k === 'Delete' || k === 'Backspace') && editable) {
      e.preventDefault();
      commit(M.clearRange(dataRef.current, selOps()));
    } else if (k === 'Escape') {
      setMenu(null);
    } else if (editable && k.length === 1 && !e.altKey) {
      e.preventDefault();
      startEdit(sel.ar, sel.ac, k);
    }
  };

  const selectionRows = () => M.readRange(dataRef.current, selOps());

  const onCopy = (e) => {
    if (editing) return;
    const rowsOut = selectionRows();
    const text = M.toTSV(rowsOut);
    clip.current = { text, r: range.kind === 'row' || range.kind === 'all' ? 0 : range.r1, c: range.kind === 'col' || range.kind === 'all' ? 0 : range.c1 };
    e.clipboardData.setData('text/plain', text);
    e.preventDefault();
  };
  const onCut = (e) => {
    if (editing) return;
    onCopy(e);
    if (editable) commit(M.clearRange(dataRef.current, selOps()));
  };
  const onPaste = (e) => {
    if (editing || !editable) return;
    const pasted = e.clipboardData.getData('text/plain');
    if (!pasted) return;
    e.preventDefault();
    let rowsIn = M.parseTSV(pasted);
    if (!rowsIn.length) return;
    // Pasting what was copied from this sheet moves formulas along with it.
    if (clip.current && clip.current.text === pasted) {
      const dr = range.r1 - clip.current.r;
      const dc = range.c1 - clip.current.c;
      rowsIn = rowsIn.map((row) => row.map((v) => (F.isFormula(v) ? F.shiftFormula(v, dr, dc) : v)));
    }
    const single = rowsIn.length === 1 && rowsIn[0].length === 1;
    let base = dataRef.current;
    const needR = range.r1 + rowsIn.length - base.nr;
    const needC = range.c1 + Math.max(...rowsIn.map((row) => row.length)) - base.nc;
    if (needR > 0) base = M.addLines(base, 'row', needR);
    if (needC > 0) base = M.addLines(base, 'col', needC);
    let next;
    if (single && sel.kind === 'cell' && (range.r2 > range.r1 || range.c2 > range.c1)) {
      const filled = [];
      for (let r = range.r1; r <= range.r2; r += 1) {
        filled.push(new Array(range.c2 - range.c1 + 1).fill(rowsIn[0][0]));
      }
      next = M.pasteRows(base, range.r1, range.c1, filled);
    } else {
      next = M.pasteRows(base, range.r1, range.c1, rowsIn);
    }
    commit(next);
    const endR = range.r1 + rowsIn.length - 1;
    const endC = range.c1 + Math.max(...rowsIn.map((row) => row.length)) - 1;
    if (!single) setSel({ kind: 'cell', ar: range.r1, ac: range.c1, fr: endR, fc: endC });
  };

  // --------------------------------------------------------------- drawing --
  const cellBox = (r, c) => ({
    left: dispX(c),
    top: dispY(r),
    width: colAxis.sizeAt(c),
    height: rowAxis.sizeAt(r),
  });

  const renderCell = (r, c) => {
    const st = M.resolveStyle(data, r, c, used);
    const raw = data.cells[M.key(r, c)];
    const value = evaluator.display(r, c);
    const ddList = raw && raw.dd && data.lists ? data.lists[raw.dd] : null;
    const isNum = evaluator.isNumber(r, c);
    const isErr = F.isError(evaluator.value(r, c));
    const box = cellBox(r, c);
    const frozen = r < freezeR || c < freezeC;
    const both = r < freezeR && c < freezeC;
    const above = r > 0 ? data.cells[M.key(r - 1, c)] : null;
    const left = c > 0 ? data.cells[M.key(r, c - 1)] : null;
    const draw = (side, neighbour, neighbourSide) =>
      M.sideOn(raw, side) && !(neighbour && M.sideOn(neighbour, neighbourSide));
    const gridLine = opts.grid ? `1px solid ${theme.grid}` : '1px solid transparent';
    const heavy = `2px solid ${theme.border}`;
    const rightHeavy = M.sideOn(raw, 'r');
    const bottomHeavy = M.sideOn(raw, 'b');
    const side = st.a || (isNum ? 'r' : 'l');
    const align = side === 'c' ? 'center' : side === 'r' ? 'flex-end' : 'flex-start';
    const decoration = [st.u ? 'underline' : '', st.s ? 'line-through' : ''].filter(Boolean).join(' ') || 'none';
    return (
      <div
        key={`${r},${c}`}
        style={{
          position: 'absolute',
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          boxSizing: 'border-box',
          background: st.bg || theme.bg,
          color: isErr ? '#C53030' : st.c || theme.fg,
          fontFamily: theme.font,
          fontSize: st.fs || 13,
          fontWeight: st.b ? 700 : 400,
          fontStyle: st.i ? 'italic' : 'normal',
          textDecoration: decoration,
          display: 'flex',
          alignItems: st.w ? 'flex-start' : 'center',
          justifyContent: align,
          padding: st.w ? '3px 6px' : '0 6px',
          overflow: 'hidden',
          borderRight: rightHeavy ? heavy : gridLine,
          borderBottom: bottomHeavy ? heavy : gridLine,
          borderTop: draw('t', above, 'b') ? heavy : undefined,
          borderLeft: draw('l', left, 'r') ? heavy : undefined,
          zIndex: both ? 3 : frozen ? 2 : 1,
          userSelect: 'none',
          textAlign: side === 'c' ? 'center' : side === 'r' ? 'right' : 'left',
        }}>
        {ddList && (
          <DropdownPill
            text={value}
            option={ddList.find((o) => o.t === value)}
            caret={editable || value !== ''}
            height={Math.min(box.height - 6, 24)}
            size={st.fs || 13}
            bold={Boolean(st.b)}
          />
        )}
        {!ddList && value !== '' && (
          <span
            style={{
              overflow: 'hidden',
              textOverflow: st.w ? 'clip' : 'ellipsis',
              whiteSpace: st.w ? 'pre-wrap' : 'pre',
              wordBreak: st.w ? 'break-word' : 'normal',
              maxWidth: '100%',
              lineHeight: st.w ? 1.25 : 1.15,
            }}>
            {value}
          </span>
        )}
      </div>
    );
  };

  const selectedCol = (c) => sel.kind === 'all' || ((sel.kind === 'col' || sel.kind === 'cell') && c >= range.c1 && c <= range.c2);
  const selectedRow = (r) => sel.kind === 'all' || ((sel.kind === 'row' || sel.kind === 'cell') && r >= range.r1 && r <= range.r2);

  const selectionRect = () => {
    let x1;
    let x2;
    let y1;
    let y2;
    if (sel.kind === 'col' || sel.kind === 'all') {
      y1 = 0;
      y2 = contentH;
    } else {
      y1 = dispY(range.r1);
      y2 = dispY(range.r2) + rowAxis.sizeAt(range.r2);
    }
    if (sel.kind === 'row' || sel.kind === 'all') {
      x1 = 0;
      x2 = contentW;
    } else {
      x1 = dispX(range.c1);
      x2 = dispX(range.c2) + colAxis.sizeAt(range.c2);
    }
    return { left: x1, top: y1, width: x2 - x1, height: y2 - y1 };
  };

  const activeBox = cellBox(sel.ar, sel.ac);
  const multi = range.r2 > range.r1 || range.c2 > range.c1 || sel.kind !== 'cell';

  const onGridHeight = opts.h || 420;
  const spacerW = totalW + hw;
  const spacerH = totalH + hh;

  const hdrFont = theme.axisFont;
  const colHeaders = visibleCols.map((c) => {
    const on = selectedCol(c);
    return (
      <div
        key={`ch${c}`}
        style={{
          position: 'absolute',
          left: dispX(c),
          top: 0,
          width: colAxis.sizeAt(c),
          height: hh,
          boxSizing: 'border-box',
          background: on ? BLUE : theme.axisBg,
          color: on ? '#FFFFFF' : theme.axisFg,
          fontFamily: hdrFont,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: `1px solid ${theme.grid}`,
          zIndex: c < freezeC ? 2 : 1,
          userSelect: 'none',
        }}>
        {M.colName(c)}
      </div>
    );
  });
  const rowHeaders = visibleRows.map((r) => {
    const on = selectedRow(r);
    return (
      <div
        key={`rh${r}`}
        style={{
          position: 'absolute',
          top: dispY(r),
          left: 0,
          height: rowAxis.sizeAt(r),
          width: hw,
          boxSizing: 'border-box',
          background: on ? BLUE : theme.axisBg,
          color: on ? '#FFFFFF' : theme.axisFg,
          fontFamily: hdrFont,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${theme.grid}`,
          zIndex: r < freezeR ? 2 : 1,
          userSelect: 'none',
        }}>
        {r + 1}
      </div>
    );
  });

  const cells = [];
  visibleRows.forEach((r) => visibleCols.forEach((c) => cells.push(renderCell(r, c))));

  // Where the in-cell editor sits, in root coordinates.
  const editBox = editing && editing.from === 'cell' ? cellBox(editing.r, editing.c) : null;
  const editStyle = editing ? M.resolveStyle(data, editing.r, editing.c, used) : null;

  const sizeValue = (axis) => {
    const draft = sizeDraft[axis === 'col' ? 'w' : 'h'];
    if (draft !== null) return draft;
    if (sel.kind === 'all') return axis === 'col' ? opts.dw : opts.dh;
    return axis === 'col' ? colAxis.sizeAt(sel.ac) : rowAxis.sizeAt(sel.ar);
  };

  const barValue = editing ? editing.value : activeValue;

  const toolbar = editable && (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '8px 8px 6px', position: 'relative' }}>
      <button type="button" style={btn(false)} title="Undo (Ctrl+Z)" onClick={undo} disabled={!history.current.past.length}>↶</button>
      <button type="button" style={btn(false)} title="Redo (Ctrl+Y)" onClick={redo} disabled={!history.current.future.length}>↷</button>
      <Sep />
      <select
        value={activeStyle.fs || 13}
        onChange={(e) => apply({ fs: Number(e.target.value) })}
        title="Font size"
        style={{ ...field, width: 58 }}>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <button type="button" style={btn(activeStyle.b, { fontWeight: 900 })} title="Bold (Ctrl+B)" onClick={() => toggle('b')}>B</button>
      <button type="button" style={btn(activeStyle.i, { fontStyle: 'italic' })} title="Italic (Ctrl+I)" onClick={() => toggle('i')}>I</button>
      <button type="button" style={btn(activeStyle.u, { textDecoration: 'underline' })} title="Underline (Ctrl+U)" onClick={() => toggle('u')}>U</button>
      <button type="button" style={btn(activeStyle.s, { textDecoration: 'line-through' })} title="Strikethrough" onClick={() => toggle('s')}>S</button>
      <Sep />
      <span style={{ position: 'relative' }}>
        <button
          type="button"
          style={btn(false)}
          title="Text color"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setMenu(menu === 'color' ? null : 'color')}>
          <span style={{ borderBottom: `4px solid ${activeStyle.c || theme.fg}`, lineHeight: 1 }}>A</span> ▾
        </button>
        {menu === 'color' && (
          <ColorMenu autoLabel="Automatic" onPick={(color) => { apply({ c: color }); setMenu(null); }} />
        )}
      </span>
      <span style={{ position: 'relative' }}>
        <button
          type="button"
          style={btn(false)}
          title="Fill color"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setMenu(menu === 'fill' ? null : 'fill')}>
          <span style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${INK}`, background: activeStyle.bg || theme.bg, boxSizing: 'border-box' }} /> Fill ▾
        </button>
        {menu === 'fill' && (
          <ColorMenu autoLabel="No fill" onPick={(color) => { apply({ bg: color }); setMenu(null); }} />
        )}
      </span>
      <Sep />
      <button type="button" style={btn(activeStyle.a === 'l')} title="Align left" onClick={() => apply({ a: activeStyle.a === 'l' ? null : 'l' })}><AlignIcon kind="l" /></button>
      <button type="button" style={btn(activeStyle.a === 'c')} title="Align center" onClick={() => apply({ a: activeStyle.a === 'c' ? null : 'c' })}><AlignIcon kind="c" /></button>
      <button type="button" style={btn(activeStyle.a === 'r')} title="Align right" onClick={() => apply({ a: activeStyle.a === 'r' ? null : 'r' })}><AlignIcon kind="r" /></button>
      <button type="button" style={btn(activeStyle.w)} title="Wrap long text" onClick={() => toggle('w')}>Wrap</button>
      <span style={{ position: 'relative' }}>
        <button
          type="button"
          style={btn(false)}
          title="Borders"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setMenu(menu === 'borders' ? null : 'borders')}>
          <BorderIcon /> ▾
        </button>
        {menu === 'borders' && (
          <Menu>
            {[
              ['all', 'All borders'],
              ['outer', 'Outside borders'],
              ['top', 'Top border'],
              ['bottom', 'Bottom border'],
              ['left', 'Left border'],
              ['right', 'Right border'],
              ['none', 'No borders'],
            ].map(([mode, label]) => (
              <MenuItem key={mode} onClick={() => { commit(M.applyBorders(dataRef.current, selOps(), mode)); setMenu(null); }}>
                {label}
              </MenuItem>
            ))}
          </Menu>
        )}
      </span>
      <Sep />
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'Chewy, Arial', fontSize: 13, color: INK }} title="Width of the selected column(s)">
        W
        <input
          type="number"
          min={M.MIN_SIZE}
          max={M.MAX_SIZE}
          value={sizeValue('col')}
          onChange={(e) => setSizeDraft((d) => ({ ...d, w: e.target.value }))}
          onBlur={() => { if (sizeDraft.w !== null) applySize('col', sizeDraft.w); setSizeDraft((d) => ({ ...d, w: null })); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{ ...field, width: 56 }}
        />
      </label>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'Chewy, Arial', fontSize: 13, color: INK }} title="Height of the selected row(s)">
        H
        <input
          type="number"
          min={M.MIN_SIZE}
          max={M.MAX_SIZE}
          value={sizeValue('row')}
          onChange={(e) => setSizeDraft((d) => ({ ...d, h: e.target.value }))}
          onBlur={() => { if (sizeDraft.h !== null) applySize('row', sizeDraft.h); setSizeDraft((d) => ({ ...d, h: null })); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          style={{ ...field, width: 56 }}
        />
      </label>
      <span style={{ position: 'relative' }}>
        <button
          type="button"
          style={btn(opts.freezeR > 0 || opts.freezeC > 0)}
          title="Freeze rows or columns so they stay in view"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setMenu(menu === 'freeze' ? null : 'freeze')}>
          Freeze ▾
        </button>
        {menu === 'freeze' && (
          <Menu>
            <MenuItem onClick={() => freezeAction('none')}>No frozen rows or columns</MenuItem>
            <MenuItem onClick={() => freezeAction('row')}>Freeze top row</MenuItem>
            <MenuItem onClick={() => freezeAction('col')}>Freeze first column</MenuItem>
            <MenuItem onClick={() => freezeAction('sel')}>Freeze up to selection</MenuItem>
          </Menu>
        )}
      </span>
      <Sep />
      <button type="button" style={btn(opts.headerRow)} title="Style the first row as a header" onClick={() => setOpt({ headerRow: !opts.headerRow })}>Header row</button>
      <button type="button" style={btn(opts.banded)} title="Shade every other row" onClick={() => setOpt({ banded: !opts.banded })}>Banded</button>
      <button type="button" style={btn(opts.grid)} title="Show grid lines" onClick={() => setOpt({ grid: !opts.grid })}>Grid</button>
      <button type="button" style={btn(opts.headers)} title="Show A, B, C and 1, 2, 3 labels" onClick={() => setOpt({ headers: !opts.headers })}>A B C</button>
      <Sep />
      <select
        value={data.theme}
        onChange={(e) => commit({ ...dataRef.current, theme: e.target.value })}
        title="Sheet style"
        style={{ ...field, width: 130 }}>
        {M.THEME_ORDER.map((id) => (
          <option key={id} value={id}>{M.THEMES[id].label}</option>
        ))}
      </select>
      <select
        value={onGridHeight}
        onChange={(e) => setOpt({ h: Number(e.target.value) })}
        title="Sheet height"
        style={{ ...field, width: 82 }}>
        {HEIGHTS.map((n) => (
          <option key={n} value={n}>{n}px</option>
        ))}
      </select>
      <span style={{ position: 'relative' }}>
        <button
          type="button"
          style={btn(false)}
          title="Add or remove rows and columns"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setMenu(menu === 'lines' ? null : 'lines')}>
          Rows &amp; columns ▾
        </button>
        {menu === 'lines' && (
          <Menu>
            <MenuItem onClick={() => lineEdit('insBeforerow')}>Insert {noun(true)} above</MenuItem>
            <MenuItem onClick={() => lineEdit('insAfterrow')}>Insert {noun(true)} below</MenuItem>
            <MenuItem onClick={() => lineEdit('insBeforecol')}>Insert {noun(false)} left</MenuItem>
            <MenuItem onClick={() => lineEdit('insAftercol')}>Insert {noun(false)} right</MenuItem>
            <MenuItem onClick={() => lineEdit('delrow')}>Delete {noun(true)}</MenuItem>
            <MenuItem onClick={() => lineEdit('delcol')}>Delete {noun(false)}</MenuItem>
            <MenuItem onClick={() => addMore('row', 10)}>Add 10 rows at the bottom</MenuItem>
            <MenuItem onClick={() => addMore('col', 10)}>Add 10 columns at the right</MenuItem>
          </Menu>
        )}
      </span>
      <select
        value={activeStyle.nf || 'auto'}
        onChange={(e) => apply({ nf: e.target.value === 'auto' ? null : e.target.value })}
        title="How numbers and dates look"
        style={{ ...field, width: 150 }}>
        {F.NUMBER_FORMATS.map(([id, label]) => (
          <option key={id} value={id}>{label}</option>
        ))}
      </select>
      <span style={{ position: 'relative' }}>
        <button
          type="button"
          style={btn(false)}
          title="Fill and sort"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setMenu(menu === 'data' ? null : 'data')}>
          Data ▾
        </button>
        {menu === 'data' && (
          <Menu>
            <MenuItem onClick={() => fill('down')}>Fill down  (Ctrl+D)</MenuItem>
            <MenuItem onClick={() => fill('right')}>Fill right  (Ctrl+R)</MenuItem>
            <MenuItem onClick={() => sortSheet(true)}>Sort sheet by this column  A → Z</MenuItem>
            <MenuItem onClick={() => sortSheet(false)}>Sort sheet by this column  Z → A</MenuItem>
            <MenuItem onClick={() => sortSelection(true)}>Sort selection  A → Z</MenuItem>
            <MenuItem onClick={() => sortSelection(false)}>Sort selection  Z → A</MenuItem>
          </Menu>
        )}
      </span>
      <span style={{ position: 'relative' }}>
        <button
          type="button"
          style={btn(false)}
          title="Turn cells into dropdown pills"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => setMenu(menu === 'dd' ? null : 'dd')}>
          Dropdown ▾
        </button>
        {menu === 'dd' && (
          <Menu style={{ minWidth: 300 }}>
            {Object.keys(M.DD_PRESETS).map((id) => (
              <MenuItem key={id} onClick={() => applyDropdown(M.DD_PRESETS[id].list)}>
                {M.DD_PRESETS[id].list.slice(0, 4).map((o) => (
                  <span key={o.t} style={{ display: 'inline-block', padding: '2px 8px', marginRight: 4, borderRadius: 999, background: M.DD_COLORS[o.k].bg, color: M.DD_COLORS[o.k].fg, fontSize: 12 }}>{o.t}</span>
                ))}
              </MenuItem>
            ))}
            <MenuItem onClick={() => openDdEditor(false)}>Custom list…</MenuItem>
            {activeDdList && <MenuItem onClick={() => openDdEditor(true)}>Edit this dropdown…</MenuItem>}
            {activeDdList && <MenuItem onClick={removeDd}>Remove dropdown from selection</MenuItem>}
          </Menu>
        )}
      </span>
      <button type="button" style={btn(Boolean(find))} title="Find and replace (Ctrl+F)" onClick={() => setFind(find ? null : { text: '', repl: '', matchCase: false, index: 0 })}>Find</button>
      <button type="button" style={btn(false)} title="Remove formatting from the selection" onClick={() => commit(M.clearFormatting(dataRef.current, selOps()))}>Clear format</button>
    </div>
  );

  const formulaBar = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: editable ? '0 8px 8px' : '8px 8px 8px' }}>
      <div style={{ ...field, width: 78, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Chewy, Arial', background: '#F7FAFC' }}>
        {selName}
      </div>
      <input
        type="text"
        value={barValue}
        readOnly={!editable}
        placeholder={editable ? 'Type a value or a formula, like =SUM(A1:A3)' : ''}
        onFocus={() => { if (editable && !editing) startEdit(sel.ar, sel.ac, undefined, 'bar'); }}
        onChange={(e) => { if (editing) setEditing({ ...editing, value: e.target.value }); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); finishEdit([1, 0]); }
          else if (e.key === 'Escape') { e.preventDefault(); abortEdit(); }
        }}
        onBlur={() => { if (editing && editing.from === 'bar') finishEdit(null); }}
        style={{ ...field, flex: 1, minWidth: 0 }}
      />
    </div>
  );

  const findBar = find && (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', padding: '0 8px 8px' }}>
      <input
        autoFocus
        type="text"
        value={find.text}
        placeholder="Find"
        onChange={(e) => setFind({ ...find, text: e.target.value, index: 0 })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); goToMatch((find.index || 0) + (e.shiftKey ? -1 : 1)); }
          else if (e.key === 'Escape') { setFind(null); }
        }}
        style={{ ...field, width: 150 }}
      />
      {editable && (
        <input
          type="text"
          value={find.repl}
          placeholder="Replace with"
          onChange={(e) => setFind({ ...find, repl: e.target.value })}
          style={{ ...field, width: 150 }}
        />
      )}
      <span style={{ fontFamily: 'Chewy, Arial', fontSize: 13, color: INK, minWidth: 70 }}>
        {find.text ? (matches.length ? `${Math.min((find.index || 0) + 1, matches.length)} of ${matches.length}` : 'No matches') : ''}
      </span>
      <button type="button" style={btn(false)} onClick={() => goToMatch((find.index || 0) - 1)} title="Previous match">↑</button>
      <button type="button" style={btn(false)} onClick={() => goToMatch((find.index || 0) + 1)} title="Next match">↓</button>
      <button type="button" style={btn(find.matchCase)} onClick={() => setFind({ ...find, matchCase: !find.matchCase, index: 0 })} title="Match case">Aa</button>
      {editable && <button type="button" style={btn(false)} onClick={replaceOne}>Replace</button>}
      {editable && <button type="button" style={btn(false)} onClick={replaceAll}>Replace all</button>}
      <button type="button" style={btn(false)} onClick={() => setFind(null)} title="Close">✕</button>
    </div>
  );

  const ddEditorBar = ddEditor && (
    <div style={{ margin: '0 8px 8px', padding: 10, border: `2px solid ${INK}`, borderRadius: 10, background: '#F7FAFC' }}>
      <div style={{ fontFamily: 'Chewy, Arial', fontSize: 14, color: INK, marginBottom: 8 }}>
        {ddEditor.id ? 'Edit dropdown options' : 'New dropdown for the selected cells'}
      </div>
      {ddEditor.list.map((o, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ width: 18, height: 18, borderRadius: 999, background: (M.DD_COLORS[o.k] || M.DD_COLORS.gray).bg, border: `1px solid ${(M.DD_COLORS[o.k] || M.DD_COLORS.gray).fg}`, flexShrink: 0 }} />
          <input
            type="text"
            value={o.t}
            placeholder={`Option ${i + 1}`}
            onChange={(e) => setDdEditor({ ...ddEditor, list: ddEditor.list.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)) })}
            style={{ ...field, flex: 1, minWidth: 0 }}
          />
          <select
            value={o.k}
            onChange={(e) => setDdEditor({ ...ddEditor, list: ddEditor.list.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)) })}
            style={{ ...field, width: 100 }}>
            {M.DD_COLOR_ORDER.map((k) => (
              <option key={k} value={k}>{M.DD_COLORS[k].label}</option>
            ))}
          </select>
          <button type="button" style={btn(false)} title="Remove option" onClick={() => setDdEditor({ ...ddEditor, list: ddEditor.list.filter((x, j) => j !== i) })}>✕</button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" style={btn(false)} onClick={() => setDdEditor({ ...ddEditor, list: [...ddEditor.list, { t: '', k: M.DD_COLOR_ORDER[ddEditor.list.length % M.DD_COLOR_ORDER.length] }] })}>+ Add option</button>
        <button type="button" style={btn(true)} onClick={saveDdEditor}>{ddEditor.id ? 'Save' : 'Apply'}</button>
        <button type="button" style={btn(false)} onClick={() => setDdEditor(null)}>Cancel</button>
      </div>
    </div>
  );

  const ddPopup = menu === 'ddcell' && ddCell && M.dropdownList(data, ddCell.r, ddCell.c) && (() => {
    const list = M.dropdownList(data, ddCell.r, ddCell.c);
    const box = cellBox(ddCell.r, ddCell.c);
    const current = evaluator.display(ddCell.r, ddCell.c);
    return (
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: Math.min(hw + box.left, Math.max(0, view.w - 190)),
          top: Math.min(hh + box.top + box.height + 2, Math.max(0, view.h - 40 - list.length * 30)),
          zIndex: 40,
          minWidth: Math.max(150, box.width),
          background: '#FFFFFF',
          border: `2px solid ${INK}`,
          borderBottomWidth: 4,
          borderRadius: 10,
          padding: 6,
          boxShadow: '0 6px 18px rgba(0,0,0,0.22)',
        }}>
        {list.map((o) => (
          <div
            key={o.t}
            role="option"
            aria-selected={o.t === current}
            onClick={() => pickOption(o.t)}
            style={{ padding: '3px 4px', cursor: 'pointer', borderRadius: 6, background: o.t === current ? '#EDF2F7' : 'transparent' }}>
            <span style={{ display: 'inline-block', padding: '3px 12px', borderRadius: 999, background: M.DD_COLORS[o.k].bg, color: M.DD_COLORS[o.k].fg, fontSize: 13, fontFamily: 'Arial, sans-serif' }}>{o.t}</span>
          </div>
        ))}
        {current !== '' && (
          <div role="option" onClick={() => pickOption('')} style={{ padding: '5px 8px', cursor: 'pointer', fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#4A5568' }}>Clear</div>
        )}
      </div>
    );
  })();

  const footer = editable && (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', paddingTop: 8 }}>
      <button type="button" style={btn(false)} onClick={() => addMore('row', 1)} title="Add a row at the bottom">+ Row</button>
      <button type="button" style={btn(false)} onClick={() => addMore('row', 10)} title="Add 10 rows at the bottom">+ 10 rows</button>
      <button type="button" style={btn(false)} onClick={() => addMore('col', 1)} title="Add a column at the right">+ Column</button>
      <button type="button" style={btn(false)} onClick={() => addMore('col', 10)} title="Add 10 columns at the right">+ 10 columns</button>
      <span style={{ fontFamily: 'Chewy, Arial', fontSize: 13, color: '#4A5568', marginLeft: 4 }}>
        {nr} rows × {nc} columns
      </span>
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {toolbar}
      {formulaBar}
      {findBar}
      {ddEditorBar}
      <div
        ref={rootRef}
        style={{
          position: 'relative',
          width: '100%',
          height: onGridHeight,
          overflow: 'hidden',
          border: `2px solid ${INK}`,
          borderRadius: 8,
          boxSizing: 'border-box',
          background: theme.bg,
        }}>
        {/* Cells, drawn only for the part that is on screen. */}
        <div style={{ position: 'absolute', left: hw, top: hh, right: 0, bottom: 0, overflow: 'hidden' }}>
          {cells}
          {freezeC > 0 && (
            <div style={{ position: 'absolute', left: frozenW - 1, top: 0, bottom: 0, width: 2, background: theme.border, opacity: 0.55, zIndex: 4, pointerEvents: 'none' }} />
          )}
          {freezeR > 0 && (
            <div style={{ position: 'absolute', top: frozenH - 1, left: 0, right: 0, height: 2, background: theme.border, opacity: 0.55, zIndex: 4, pointerEvents: 'none' }} />
          )}
          {multi || sel.kind !== 'cell' ? (
            <div
              style={{
                position: 'absolute',
                ...selectionRect(),
                background: 'rgba(32,122,219,0.14)',
                border: `1px solid ${BLUE}`,
                boxSizing: 'border-box',
                pointerEvents: 'none',
                zIndex: 4,
              }}
            />
          ) : null}
          <div
            style={{
              position: 'absolute',
              ...activeBox,
              border: `2px solid ${BLUE}`,
              boxSizing: 'border-box',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        </div>
        {opts.headers && (
          <>
            <div style={{ position: 'absolute', left: hw, top: 0, right: 0, height: hh, overflow: 'hidden', zIndex: 6, borderBottom: `1px solid ${theme.grid}` }}>
              {colHeaders}
            </div>
            <div style={{ position: 'absolute', left: 0, top: hh, bottom: 0, width: hw, overflow: 'hidden', zIndex: 6, borderRight: `1px solid ${theme.grid}` }}>
              {rowHeaders}
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: hw,
                height: hh,
                zIndex: 7,
                background: sel.kind === 'all' ? BLUE : theme.axisBg,
                borderRight: `1px solid ${theme.grid}`,
                borderBottom: `1px solid ${theme.grid}`,
                boxSizing: 'border-box',
              }}
            />
          </>
        )}

        {/* Invisible scroll layer on top: it owns scrolling, clicks and keys. */}
        <div
          ref={scrollerRef}
          tabIndex={0}
          role="grid"
          aria-label="Spreadsheet"
          onScroll={onScroll}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMoveHover}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'auto',
            zIndex: 10,
            outline: 'none',
            cursor,
            overscrollBehavior: 'contain',
          }}>
          <div style={{ width: spacerW, height: spacerH, pointerEvents: 'none' }} />
        </div>

        {ddPopup}
        {editBox && editStyle && (
          <input
            ref={editRef}
            type="text"
            value={editing.value}
            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); finishEdit([e.shiftKey ? -1 : 1, 0]); }
              else if (e.key === 'Tab') { e.preventDefault(); finishEdit([0, e.shiftKey ? -1 : 1]); }
              else if (e.key === 'Escape') { e.preventDefault(); abortEdit(); }
              e.stopPropagation();
            }}
            onBlur={() => { if (!cancelEdit.current) finishEdit(null); cancelEdit.current = false; }}
            style={{
              position: 'absolute',
              left: hw + editBox.left,
              top: hh + editBox.top,
              width: Math.max(editBox.width, 90),
              height: editBox.height,
              zIndex: 12,
              boxSizing: 'border-box',
              border: `2px solid ${BLUE}`,
              outline: 'none',
              padding: '0 6px',
              margin: 0,
              background: editStyle.bg || theme.bg,
              color: editStyle.c || theme.fg,
              fontFamily: theme.font,
              fontSize: editStyle.fs || 13,
              fontWeight: editStyle.b ? 700 : 400,
              fontStyle: editStyle.i ? 'italic' : 'normal',
              textAlign: editStyle.a === 'c' ? 'center' : editStyle.a === 'r' ? 'right' : 'left',
              boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
            }}
          />
        )}
      </div>
      {footer}
    </div>
  );
}
