import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as M from './sheetModel';

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
  const [extent, setExtent] = useState({ w: 0, h: 0 });
  const [menu, setMenu] = useState(null);
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
  const hw = opts.headers ? HEADER_W : 0;
  const hh = opts.headers ? HEADER_H : 0;
  const colAxis = useMemo(() => M.makeAxis(opts.dw || M.DEFAULT_COL_W, data.colW), [opts.dw, data.colW]);
  const rowAxis = useMemo(() => M.makeAxis(opts.dh || M.DEFAULT_ROW_H, data.rowH), [opts.dh, data.rowH]);
  const contentW = Math.max(60, view.w - hw);
  const contentH = Math.max(40, view.h - hh);

  // Frozen panes can take at most most of the view, or nothing would scroll.
  const freezeC = useMemo(() => {
    let n = clamp(opts.freezeC || 0, 0, 30);
    while (n > 0 && colAxis.offset(n) > contentW * 0.6) n -= 1;
    return n;
  }, [opts.freezeC, colAxis, contentW]);
  const freezeR = useMemo(() => {
    let n = clamp(opts.freezeR || 0, 0, 50);
    while (n > 0 && rowAxis.offset(n) > contentH * 0.6) n -= 1;
    return n;
  }, [opts.freezeR, rowAxis, contentH]);
  const frozenW = colAxis.offset(freezeC);
  const frozenH = rowAxis.offset(freezeR);

  // The scrollable area always reaches well past what has been seen, and keeps
  // growing as you scroll toward its edge, so there is no last row or column.
  useLayoutEffect(() => {
    const filled = M.usedExtent(data);
    const needW = colAxis.offset(Math.max(filled.col + 1, 0) + 3) + contentW;
    const needH = rowAxis.offset(Math.max(filled.row + 1, 0) + 5) + contentH;
    setExtent((e) => ({
      w: Math.max(e.w, needW, contentW * 3),
      h: Math.max(e.h, needH, contentH * 3),
    }));
  }, [data.cells, colAxis, rowAxis, contentW, contentH]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setExtent((cur) => {
      let { w, h } = cur;
      if (x + contentW > w - contentW) w += contentW * 2;
      if (y + contentH > h - contentH) h += contentH * 2;
      return w === cur.w && h === cur.h ? cur : { w, h };
    });
  };

  const dispX = (c) => (c < freezeC ? colAxis.offset(c) : colAxis.offset(c) - scroll.x);
  const dispY = (r) => (r < freezeR ? rowAxis.offset(r) : rowAxis.offset(r) - scroll.y);

  const visibleCols = useMemo(() => {
    const list = [];
    for (let c = 0; c < freezeC; c += 1) list.push(c);
    const first = Math.max(freezeC, colAxis.indexAt(scroll.x + frozenW));
    const last = colAxis.indexAt(scroll.x + contentW);
    for (let c = first; c <= last; c += 1) list.push(c);
    return list;
  }, [freezeC, colAxis, scroll.x, frozenW, contentW]);
  const visibleRows = useMemo(() => {
    const list = [];
    for (let r = 0; r < freezeR; r += 1) list.push(r);
    const first = Math.max(freezeR, rowAxis.indexAt(scroll.y + frozenH));
    const last = rowAxis.indexAt(scroll.y + contentH);
    for (let r = first; r <= last; r += 1) list.push(r);
    return list;
  }, [freezeR, rowAxis, scroll.y, frozenH, contentH]);

  // ------------------------------------------------------------ selection --
  const range = useMemo(() => {
    const n = M.normalizeRange({ r: sel.ar, c: sel.ac }, { r: sel.fr, c: sel.fc });
    return { kind: sel.kind, ...n };
  }, [sel]);
  const used = useMemo(() => M.usedExtent(data), [data.cells]); // eslint-disable-line react-hooks/exhaustive-deps
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
      setExtent((e) => ({
        w: Math.max(e.w, (target.x || 0) + contentW * 3),
        h: Math.max(e.h, (target.y || 0) + contentH * 3),
      }));
      pendingScroll.current = target;
      // Applying right away covers moves that stay inside the current extent.
      if (target.x !== undefined) el.scrollLeft = target.x;
      if (target.y !== undefined) el.scrollTop = target.y;
    }
  };

  const moveActive = (dr, dc, extend) => {
    const r = Math.max(0, (extend ? sel.fr : sel.ar) + dr);
    const c = Math.max(0, (extend ? sel.fc : sel.ac) + dc);
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
      const r = Math.max(0, e.r + move[0]);
      const c = Math.max(0, e.c + move[1]);
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
    return colAxis.indexAt(cx < frozenW ? Math.max(0, cx) : cx + scroll.x);
  };
  const rowAtY = (y) => {
    const cy = y - hh;
    return rowAxis.indexAt(cy < frozenH ? Math.max(0, cy) : cy + scroll.y);
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
    e.clipboardData.setData('text/plain', M.toTSV(selectionRows()));
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
    const rowsIn = M.parseTSV(pasted);
    if (!rowsIn.length) return;
    const single = rowsIn.length === 1 && rowsIn[0].length === 1;
    let next;
    if (single && sel.kind === 'cell' && (range.r2 > range.r1 || range.c2 > range.c1)) {
      const filled = [];
      for (let r = range.r1; r <= range.r2; r += 1) {
        filled.push(new Array(range.c2 - range.c1 + 1).fill(rowsIn[0][0]));
      }
      next = M.pasteRows(dataRef.current, range.r1, range.c1, filled);
    } else {
      next = M.pasteRows(dataRef.current, range.r1, range.c1, rowsIn);
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
    const value = raw && raw.v ? raw.v : '';
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
    const align = st.a === 'c' ? 'center' : st.a === 'r' ? 'flex-end' : 'flex-start';
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
          color: st.c || theme.fg,
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
          textAlign: st.a === 'c' ? 'center' : st.a === 'r' ? 'right' : 'left',
        }}>
        {value !== '' && (
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
  const spacerW = extent.w + hw;
  const spacerH = extent.h + hh;

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
        placeholder={editable ? 'Type a value, then press Enter' : ''}
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

  return (
    <div style={{ width: '100%' }}>
      {toolbar}
      {formulaBar}
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
    </div>
  );
}
