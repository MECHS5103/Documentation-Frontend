import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

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

// The two-squares "copy" icon, drawn with plain views so it needs no icon library.
const CopyIcon = ({ color }) => (
  <View style={{ width: 15, height: 15 }}>
    <View style={{ position: 'absolute', left: 0, top: 0, width: 10, height: 11, borderRadius: 2, borderWidth: 2, borderColor: color }} />
    <View style={{ position: 'absolute', left: 5, top: 4, width: 10, height: 11, borderRadius: 2, borderWidth: 2, borderColor: color, backgroundColor: '#FFFFFF' }} />
  </View>
);

// A small round copy button for the top-right of a pill. `getText` is called when
// it is pressed so it always copies what is on screen right now. It fades in when
// `visible` is true (the pill is hovered), when it has keyboard focus, or while it
// is showing the result of a copy.
export const CopyButton = ({ getText, visible = true, style }) => {
  const [state, setState] = useState('idle'); // idle | done | failed
  const [focused, setFocused] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onPress = async () => {
    const ok = await copyToClipboard(String(getText ? getText() : ''));
    setState(ok ? 'done' : 'failed');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 1600);
  };

  const done = state === 'done';
  const shown = visible || focused || state !== 'idle';
  return (
    <Pressable
      onPress={onPress}
      onFocus={(e) => {
        // Only keyboard focus reveals the button; a mouse click should not pin it open.
        let keyboard = true;
        try {
          keyboard = !e.target || !e.target.matches || e.target.matches(':focus-visible');
        } catch (error) {
          keyboard = true;
        }
        setFocused(keyboard);
      }}
      onBlur={() => setFocused(false)}
      accessibilityRole="button"
      accessibilityLabel="Copy text to the clipboard"
      style={({ hovered, pressed }) => [
        {
          minWidth: 28,
          height: 22,
          borderWidth: 2,
          borderColor: '#1A202C',
          borderRadius: 999,
          paddingHorizontal: state === 'failed' ? 8 : 0,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? '#2F855A' : hovered || pressed ? '#EDF2F7' : '#FFFFFF',
          opacity: shown ? 1 : 0,
          transitionProperty: 'opacity',
          transitionDuration: '120ms',
          cursor: 'pointer',
        },
        style,
      ]}>
      {done ? (
        <Text selectable={false} style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, lineHeight: 16, userSelect: 'none' }}>✓</Text>
      ) : state === 'failed' ? (
        <Text selectable={false} style={{ fontFamily: 'Chewy', fontSize: 12, color: '#1A202C', userSelect: 'none' }}>Ctrl+C</Text>
      ) : (
        <CopyIcon color="#1A202C" />
      )}
    </Pressable>
  );
};

export default CopyButton;
