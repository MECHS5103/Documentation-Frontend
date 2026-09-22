import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, useWindowDimensions } from 'react-native';
import styles from '../../styles';
import useDoubleClick from '../../hooks/useDoubleClick';

export const Pill = ({
  header,
  description,
  headerColor,
  fontFamily,
  backgroundColor,
  onUpdate,
  style,
  setHasSaved,
  loggedIn,
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
          <Text style={styles.PillHeaderText}>{header}</Text>
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
      </View>
      <View style={styles.PillDescription}>
        {isEditing ? (
          <TextInput
            style={[
              styles.PillDescriptionText,
              styles.ActiveInput,
              { fontFamily: fontFamily, width: '100%' },
            ]}
            value={localText}
            onChangeText={handleChange}
            onBlur={() => setIsEditing(false)}
            onSubmitEditing={() => setIsEditing(false)}
            autoFocus
            multiline
          />
        ) : (
          <Pressable onPress={handleDoubleClick} style={{ width: '100%' }}>
            <Text
              selectable={false}
              style={[
                styles.PillDescriptionText,
                { fontFamily: fontFamily, userSelect: 'none' },
              ]}>
              {localText}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default Pill;