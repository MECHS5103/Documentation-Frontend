import React, { useState, useEffect } from 'react';
import { Text, Pressable, TextInput, useWindowDimensions } from 'react-native';
import styles from '../../styles';
import useDoubleClick from '../../hooks/useDoubleClick';

export const HeaderText = ({ title, onUpdate, setHasSaved, loggedIn }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [isEditing, setIsEditing] = useState(false);
  const [localText, setLocalText] = useState(title);

  useEffect(() => {
    setLocalText(title);
  }, [title]);

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
        style={[
          styles.HeaderPageText,
          styles.ActiveInput,
          isMobile && styles.TitleTextMobile,
          { width: '100%' },
        ]}
        value={localText}
        onChangeText={handleChange}
        onBlur={() => setIsEditing(false)}
        onSubmitEditing={() => setIsEditing(false)}
        autoFocus
      />
    );
  }

  return (
    <Pressable
      onPress={handleDoubleClick}
      style={{ width: '100%', alignSelf: 'stretch' }}>
      <Text
        selectable={false}
        style={[
          styles.HeaderPageText,
          isMobile && styles.TitleTextMobile,
          { userSelect: 'none' },
        ]}>
        {localText}
      </Text>
    </Pressable>
  );
};

export default HeaderText;