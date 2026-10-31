import React, { useEffect, useMemo, useRef, useState } from 'react';
import Pill from './Pill';
import {
  CODE_LANGUAGES,
  TOKEN_COLORS_DARK,
  TOKEN_COLORS_LIGHT,
  findLanguage,
  highlight,
  languageFor,
} from '../code/languages';

const MONO = 'Consolas, "Cascadia Code", "SF Mono", Menlo, "Roboto Mono", "Courier New", monospace';
const FONT_SIZE = 13;
const LINE_HEIGHT = 20;

const codeBoxStyle = (lang) => ({
  display: 'flex',
  width: '100%',
  boxSizing: 'border-box',
  borderRadius: 10,
  overflow: 'hidden',
  background: lang.tint,
  border: `1px solid ${lang.dark ? 'rgba(255,255,255,0.12)' : 'rgba(26,32,44,0.14)'}`,
  borderLeftWidth: 6,
  borderLeftColor: lang.header,
  borderLeftStyle: 'solid',
});

// Shows the code with colours for the chosen language and line numbers.
const CodeView = ({ code, lang, editable, onEdit }) => {
  const lines = useMemo(() => highlight(code, lang), [code, lang]);
  const colors = lang.dark ? TOKEN_COLORS_DARK : TOKEN_COLORS_LIGHT;
  const base = lang.dark ? '#E2E8F0' : '#1A202C';
  const gutter = lang.dark ? '#718096' : '#A0AEC0';
  const empty = code.trim() === '';
  return (
    <div
      onDoubleClick={editable ? onEdit : undefined}
      title={editable ? 'Double-click to edit' : undefined}
      style={{ ...codeBoxStyle(lang), cursor: editable ? 'text' : 'auto' }}>
      <div
        aria-hidden="true"
        style={{
          padding: '10px 8px 10px 10px',
          textAlign: 'right',
          color: gutter,
          fontFamily: MONO,
          fontSize: FONT_SIZE,
          lineHeight: `${LINE_HEIGHT}px`,
          userSelect: 'none',
          borderRight: `1px solid ${lang.dark ? 'rgba(255,255,255,0.12)' : 'rgba(26,32,44,0.10)'}`,
          flexShrink: 0,
        }}>
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <pre
        style={{
          margin: 0,
          padding: '10px 14px',
          flex: 1,
          minWidth: 0,
          overflowX: 'auto',
          color: empty ? gutter : base,
          fontFamily: MONO,
          fontSize: FONT_SIZE,
          lineHeight: `${LINE_HEIGHT}px`,
          tabSize: lang.indent,
          userSelect: 'text',
        }}>
        {empty && editable
          ? 'Double-click to add code'
          : lines.map((line, i) => (
              <div key={i} style={{ minHeight: LINE_HEIGHT }}>
                {line.map((piece, j) => (
                  <span
                    key={j}
                    style={{
                      color: piece.kind ? colors[piece.kind] : undefined,
                      fontStyle: piece.kind === 'comment' ? 'italic' : 'normal',
                    }}>
                    {piece.text}
                  </span>
                ))}
              </div>
            ))}
      </pre>
    </div>
  );
};

// A plain textarea that grows with its content, keeps indentation on Enter
// and turns Tab into spaces instead of leaving the box.
const CodeEditor = ({ value, lang, onChange, onDone }) => {
  const ref = useRef(null);

  const fit = () => {
    const node = ref.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight + 2}px`;
  };

  useEffect(() => {
    fit();
  }, [value]);

  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      const end = ref.current.value.length;
      ref.current.setSelectionRange(end, end);
    }
  }, []);

  const edit = (node, start, end, text, caret) => {
    const next = node.value.slice(0, start) + text + node.value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      if (ref.current) ref.current.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (e) => {
    const node = e.currentTarget;
    const { selectionStart: s, selectionEnd: en, value: v } = node;
    const unit = ' '.repeat(lang.indent);
    if (e.key === 'Escape') {
      e.preventDefault();
      onDone();
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      edit(node, s, en, unit, s + unit.length);
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const lead = /^ {1,8}/.exec(v.slice(lineStart));
      const remove = lead ? Math.min(lead[0].length, lang.indent) : 0;
      if (remove) edit(node, lineStart, lineStart + remove, '', Math.max(lineStart, s - remove));
    } else if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      const lineStart = v.lastIndexOf('\n', s - 1) + 1;
      const indent = /^[ \t]*/.exec(v.slice(lineStart, s))[0];
      const opens = /[{([:]\s*$/.test(v.slice(lineStart, s));
      e.preventDefault();
      const add = `\n${indent}${opens ? unit : ''}`;
      edit(node, s, en, add, s + add.length);
    }
  };

  return (
    <div style={{ ...codeBoxStyle(lang), alignItems: 'stretch' }}>
      <textarea
        ref={ref}
        value={value}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        placeholder="Paste or type code. Tab indents; Esc finishes."
        onChange={(e) => onChange(e.target.value)}
        onBlur={onDone}
        onKeyDown={onKeyDown}
        wrap="off"
        style={{
          width: '100%',
          boxSizing: 'border-box',
          margin: 0,
          padding: '10px 14px',
          border: 'none',
          outline: `2px solid ${lang.header}`,
          outlineOffset: -2,
          resize: 'none',
          overflow: 'auto',
          minHeight: LINE_HEIGHT * 3,
          background: 'transparent',
          color: lang.dark ? '#E2E8F0' : '#1A202C',
          fontFamily: MONO,
          fontSize: FONT_SIZE,
          lineHeight: `${LINE_HEIGHT}px`,
          tabSize: lang.indent,
          whiteSpace: 'pre',
        }}
      />
    </div>
  );
};

const LanguagePicker = ({ value, onChange }) => {
  const known = findLanguage(value);
  return (
    <select
      value={known ? known.label : value}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      title="Language"
      style={{
        height: 24,
        borderRadius: 999,
        border: '2px solid #1A202C',
        background: '#FFFFFF',
        color: '#1A202C',
        fontFamily: 'Chewy, Arial, sans-serif',
        fontSize: 13,
        padding: '0 6px',
        cursor: 'pointer',
        maxWidth: 150,
      }}>
      {!known && <option value={value}>{value}</option>}
      {CODE_LANGUAGES.map((lang) => (
        <option key={lang.id} value={lang.label}>
          {lang.label}
        </option>
      ))}
    </select>
  );
};

// The Code pill: pick a language (editors) and the pill takes on that language's
// colours, with matching syntax colouring. Viewers can copy it with one button.
export const CodePill = ({ description, language, onUpdate, onUpdateLanguage, setHasSaved, loggedIn }) => {
  const lang = languageFor(language);
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(description || '');

  useEffect(() => {
    setLocal(description || '');
  }, [description]);

  const change = (value) => {
    setLocal(value);
    if (setHasSaved) setHasSaved(false);
    if (onUpdate) onUpdate(value);
  };

  const pickLanguage = (label) => {
    if (setHasSaved) setHasSaved(false);
    if (onUpdateLanguage) onUpdateLanguage(label);
  };

  return (
    <Pill
      header={lang.label}
      headerColor={lang.header}
      headerTextColor={lang.headerText}
      backgroundColor="#FFFFFF"
      fontFamily={MONO}
      description={local}
      copyText={local}
      loggedIn={loggedIn}
      setHasSaved={setHasSaved}
      headerRight={
        loggedIn ? <LanguagePicker value={language || lang.label} onChange={pickLanguage} /> : null
      }
      renderBody={() =>
        loggedIn && editing ? (
          <CodeEditor value={local} lang={lang} onChange={change} onDone={() => setEditing(false)} />
        ) : (
          <CodeView code={local} lang={lang} editable={loggedIn} onEdit={() => setEditing(true)} />
        )
      }
    />
  );
};

export default CodePill;
