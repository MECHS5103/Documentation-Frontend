import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import styles from '../../styles';
import AutoGrowTextInput from '../common/AutoGrowTextInput';
import CopyButton from '../common/CopyButton';
import RichText from '../common/RichText';
import useDoubleClick from '../../hooks/useDoubleClick';

// The shared pill frame: coloured tab with a title, a Copy button at the top
// right, and a body that is either the editable text or whatever `renderBody`
// returns (checklists, steps, links … build their own body but keep the frame).
export const Pill = ({
  header,
  description,
  headerColor,
  headerTextColor = '#FFFFFF',
  fontFamily,
  backgroundColor,
  onUpdate,
  style,
  setHasSaved,
  loggedIn,
  placeholder,
  hint,
  showCopy = true,
  copyText,
  headerRight,
  renderBody,
  plain = false,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [hovered, setHovered] = useState(false);
  const frame = useRef(null);
  const leaveTimer = useRef(null);

  // Hover is tracked on the pill's own DOM node. mouseenter / mouseleave fire once
  // for the whole pill (not for every child), and a short delay before hiding keeps
  // the button from flickering when the pointer crosses a border or gap.
  useEffect(() => {
    const node = frame.current;
    if (!node || !node.addEventListener) return undefined;
    const enter = () => {
      clearTimeout(leaveTimer.current);
      setHovered(true);
    };
    const leave = () => {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = setTimeout(() => setHovered(false), 250);
    };
    node.addEventListener('mouseenter', enter);
    node.addEventListener('mouseleave', leave);
    return () => {
      clearTimeout(leaveTimer.current);
      node.removeEventListener('mouseenter', enter);
      node.removeEventListener('mouseleave', leave);
    };
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(description);

  useEffect(() => {
    setLocalText(description);
  }, [description]);

  const handleDoubleClick = useDoubleClick(() => {
    if (loggedIn) {
      setIsEditing(true);
    }
  });

  const handleChange = (newValue) => {
    setLocalText(newValue);
    if (setHasSaved) setHasSaved(false);
    if (onUpdate) onUpdate(newValue);
  };

  const text = localText === undefined || localText === null ? '' : String(localText);
  const copyable = copyText !== undefined ? copyText : text;

  const textBody = isEditing ? (
    <View style={{ width: '100%' }}>
      <AutoGrowTextInput
        style={[
          styles.PillDescriptionText,
          styles.ActiveInput,
          { fontFamily: fontFamily, width: '100%' },
        ]}
        placeholder={placeholder}
        value={text}
        onChangeText={handleChange}
        onBlur={() => setIsEditing(false)}
        onSubmitEditing={() => setIsEditing(false)}
        autoFocus
      />
      {hint ? (
        <Text selectable={false} style={{ fontFamily: 'Arial', fontSize: 12, color: '#718096', marginTop: 4 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  ) : (
    <Pressable onPress={handleDoubleClick} style={{ width: '100%' }}>
      {plain ? (
        <Text
          selectable={!loggedIn}
          style={[styles.PillDescriptionText, { fontFamily: fontFamily, userSelect: loggedIn ? 'none' : 'text' }]}>
          {text}
        </Text>
      ) : (
        <RichText
          text={text}
          selectable={!loggedIn}
          style={[styles.PillDescriptionText, { fontFamily: fontFamily, userSelect: loggedIn ? 'none' : 'text' }]}
        />
      )}
    </Pressable>
  );

  const body = renderBody
    ? renderBody({ text, isEditing, setIsEditing, textBody, handleChange, loggedIn })
    : textBody;

  return (
    <Pressable
      ref={frame}
      accessible={false}
      focusable={false}
      style={[
        styles.Pill,
        { backgroundColor: backgroundColor },
        isMobile && { width: '100%', maxWidth: '100%' },
        { cursor: 'auto' },
        style,
      ]}>
      <View style={[styles.PillHeader, { backgroundColor: headerColor }]}>
        <View style={styles.PillHeaderTextArea}>
          <Text style={[styles.PillHeaderText, { color: headerTextColor }]}>{header}</Text>
          <View
            style={[
              styles.PillInvertedCorner,
              { backgroundColor: headerColor, borderColor: backgroundColor },
            ]}
          />
        </View>
        <View
          style={[styles.PillWhiteSpace, { backgroundColor: backgroundColor }]}
        />
        {(showCopy || headerRight) && (
          <View
            style={{
              position: 'absolute',
              right: 26,
              top: 5,
              flexDirection: 'row',
              alignItems: 'center',
              zIndex: 30,
            }}>
            {headerRight}
            {showCopy && <CopyButton getText={() => copyable} visible={hovered || isMobile} style={headerRight ? { marginLeft: 6 } : null} />}
          </View>
        )}
      </View>
      <View style={styles.PillDescription}>{body}</View>
    </Pressable>
  );
};

export default Pill;
