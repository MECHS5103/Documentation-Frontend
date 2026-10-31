import React, { useState, useEffect } from 'react';
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
    <View
      style={[
        styles.Pill,
        { backgroundColor: backgroundColor },
        isMobile && { width: '100%', maxWidth: '100%' },
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
              right: 10,
              top: 2,
              flexDirection: 'row',
              alignItems: 'center',
              zIndex: 30,
            }}>
            {headerRight}
            {showCopy && <CopyButton getText={() => copyable} style={headerRight ? { marginLeft: 6 } : null} />}
          </View>
        )}
      </View>
      <View style={styles.PillDescription}>{body}</View>
    </View>
  );
};

export default Pill;
