import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text } from 'react-native';

// Puts text on the clipboard. Falls back to a hidden textarea where the
// asynchronous clipboard is blocked (older browsers, non-secure pages).
export const copyToClipboard = async (text) => {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // fall through to the old way
  }
  try {
    if (typeof document === 'undefined') return false;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch (error) {
    return false;
  }
};

// A small "Copy" button for the top-right of a pill. `getText` is called when
// it is pressed so it always copies what is on screen right now.
export const CopyButton = ({ getText, label = 'Copy', dark = false, style }) => {
  const [state, setState] = useState('idle'); // idle | done | failed
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onPress = async () => {
    const ok = await copyToClipboard(String(getText ? getText() : ''));
    setState(ok ? 'done' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  };

  const done = state === 'done';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Copy text to the clipboard"
      style={({ hovered, pressed }) => [
        {
          borderWidth: 2,
          borderColor: dark ? 'rgba(255,255,255,0.85)' : '#1A202C',
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 2,
          backgroundColor: done ? '#2F855A' : hovered || pressed ? (dark ? 'rgba(255,255,255,0.18)' : '#EDF2F7') : dark ? 'transparent' : '#FFFFFF',
          cursor: 'pointer',
        },
        style,
      ]}>
      <Text
        selectable={false}
        style={{
          fontFamily: 'Chewy',
          fontSize: 13,
          color: done ? '#FFFFFF' : dark ? '#FFFFFF' : '#1A202C',
          userSelect: 'none',
        }}>
        {state === 'done' ? 'Copied!' : state === 'failed' ? 'Press Ctrl+C' : label}
      </Text>
    </Pressable>
  );
};

export default CopyButton;
