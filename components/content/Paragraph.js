import React, { useState, useEffect } from 'react';
import { Text, Pressable, TextInput } from 'react-native';
import styles from '../../styles';
import useDoubleClick from '../../hooks/useDoubleClick';

export const Paragraph = ({ text, onUpdate, setHasSaved, loggedIn }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(text);

  useEffect(() => {
    setLocalText(text);
  }, [text]);

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

  if (isEditing) {
    return (
      <TextInput
        style={[styles.ParagraphText, styles.ActiveInput, { width: '100%' }]}
        value={localText}
        onChangeText={handleChange}
        onBlur={() => setIsEditing(false)}
        onSubmitEditing={() => setIsEditing(false)}
        autoFocus
        multiline
      />
    );
  }

  return (
    <Pressable
      onPress={handleDoubleClick}
      style={{ width: '100%', alignSelf: 'stretch' }}>
      <Text
        selectable={false}
        style={[styles.ParagraphText, { userSelect: 'none' }]}>
        {localText}
      </Text>
    </Pressable>
  );
};

export default Paragraph;