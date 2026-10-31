import React from 'react';
import { Text } from 'react-native';

// Small inline formatting for pill and paragraph text:
//   **bold**   `code`   and web links (https://…).
// Everything else is shown exactly as typed.
const PATTERN = /(\*\*[^*\n]+\*\*|`[^`\n]+`|https?:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?])/g;

export const splitRich = (text) => {
  const source = String(text === undefined || text === null ? '' : text);
  const parts = [];
  let last = 0;
  let m = PATTERN.exec(source);
  while (m) {
    if (m.index > last) parts.push({ kind: 'text', text: source.slice(last, m.index) });
    const token = m[0];
    if (token.startsWith('**')) parts.push({ kind: 'bold', text: token.slice(2, -2) });
    else if (token.startsWith('`')) parts.push({ kind: 'code', text: token.slice(1, -1) });
    else parts.push({ kind: 'link', text: token, href: token });
    last = m.index + token.length;
    m = PATTERN.exec(source);
  }
  PATTERN.lastIndex = 0;
  if (last < source.length) parts.push({ kind: 'text', text: source.slice(last) });
  return parts;
};

export const RichText = ({ text, style, linkColor = '#207ADB', selectable = false }) => (
  <Text selectable={selectable} style={style}>
    {splitRich(text).map((part, i) => {
      if (part.kind === 'bold') return <Text key={i} style={{ fontWeight: 'bold' }}>{part.text}</Text>;
      if (part.kind === 'code') {
        return (
          <Text
            key={i}
            style={{
              fontFamily: 'Consolas, "Cascadia Code", Menlo, "Courier New", monospace',
              backgroundColor: '#EDF2F7',
              borderRadius: 4,
              fontSize: '0.92em',
            }}>
            {` ${part.text} `}
          </Text>
        );
      }
      if (part.kind === 'link') {
        return (
          <Text
            key={i}
            accessibilityRole="link"
            href={part.href}
            hrefAttrs={{ target: '_blank', rel: 'noopener noreferrer' }}
            style={{ color: linkColor, textDecorationLine: 'underline' }}>
            {part.text}
          </Text>
        );
      }
      return part.text;
    })}
  </Text>
);

export default RichText;
