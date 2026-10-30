import React, { useLayoutEffect, useRef } from 'react';
import { Platform, TextInput } from 'react-native';

// A multiline TextInput that grows and shrinks with its content instead of
// staying at the browser's default two-row height, so editing a paragraph or
// pill keeps about the same size it has when it is just displayed.
export const AutoGrowTextInput = ({ style, value, ...props }) => {
  const ref = useRef(null);

  const resize = () => {
    const node = ref.current;
    if (Platform.OS !== 'web' || !node || !node.style) return;
    node.style.height = 'auto';
    const border = node.offsetHeight - node.clientHeight;
    node.style.height = node.scrollHeight + border + 'px';
  };

  useLayoutEffect(resize, [value]);

  return (
    <TextInput
      {...props}
      ref={ref}
      value={value}
      multiline
      scrollEnabled={false}
      rows={1}
      onLayout={resize}
      style={[style, { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', overflow: 'hidden', resize: 'none' }]}
    />
  );
};

export default AutoGrowTextInput;
