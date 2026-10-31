import React, { useState, useEffect } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import RichText from '../common/RichText';
import styles from '../../styles';
import AutoGrowTextInput from '../common/AutoGrowTextInput';
import useDoubleClick from '../../hooks/useDoubleClick';

export const Paragraph = ({ text, onUpdate, setHasSaved, loggedIn }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
      <AutoGrowTextInput
        style={[
          styles.ParagraphText,
          isMobile && styles.ParagraphTextMobile,
          styles.ActiveInput,
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
      <RichText
        text={localText}
        selectable={!loggedIn}
        style={[
          styles.ParagraphText,
          isMobile && styles.ParagraphTextMobile,
          { userSelect: loggedIn ? 'none' : 'text' },
        ]}
      />
    </Pressable>
  );
};

export default Paragraph;