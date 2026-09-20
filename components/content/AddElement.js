import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import styles from '../../styles';

export const AddElement = () => (
  <View style={styles.AddElementContainer}>
    <View style={styles.HoverLine} />
    <View style={styles.PlusButtonCircle}>
      <View style={styles.PlusHorizontal} />
      <View style={styles.PlusVertical} />
    </View>
  </View>
);

export const ElementSelectorMenu = ({ onSelect }) => {
  const row1 = [
    { label: 'Header', type: 'HeaderText' },
    { label: 'Paragraph', type: 'Paragraph' },
    { label: 'Tip', type: 'TipPill' },
    { label: 'Warning', type: 'WarningPill' },
    { label: 'Code', type: 'CodePill' },
  ];
  const row2 = [
    { label: 'Important', type: 'ImportantPill' },
    { label: 'Success', type: 'SuccessPill' },
    { label: 'Vocabulary', type: 'VocabularyPill' },
    { label: 'Video', type: 'VideoPill' }
  ];

  return (
    <View style={styles.MenuContainer}>
      <View style={styles.PillRow}>
        {row1.map((item) => (
          <Pressable
            key={item.label}
            style={styles.PillButton}
            onPress={() => onSelect(item.type)}>
            <Text style={styles.PillText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.PillRow}>
        {row2.map((item) => (
          <Pressable
            key={item.label}
            style={styles.PillButton}
            onPress={() => onSelect(item.type)}>
            <Text style={styles.PillText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};

export const AddElementContainer = ({ index, onAdd }) => {
  const [clicked, setClicked] = useState(false);

  const handleSelect = (elementType) => {
    onAdd(index, elementType);
    setClicked(false);
  };

  return (
    <View style={styles.AddElementWrapper}>
      <Pressable
        style={styles.AddElementContainerStyle}
        onPress={() => setClicked(!clicked)}>
        <AddElement />
      </Pressable>
      {clicked && <ElementSelectorMenu onSelect={handleSelect} />}
    </View>
  );
};

export default AddElementContainer;