import React from 'react';
import { Pressable, Text } from 'react-native';
import styles from '../../styles';

export const TextButton = ({ text, textStyle, containerStyle, setNavPanel }) => (
  <Pressable
    style={[styles.TextButton, containerStyle]}
    onPress={() => {
      if (setNavPanel) setNavPanel(text);
    }}>
    <Text style={[styles.TextButtonText, textStyle]}>{text}</Text>
  </Pressable>
);

export default TextButton;