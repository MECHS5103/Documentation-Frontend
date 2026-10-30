import React from 'react';
import { View, Text, TextInput } from 'react-native';
import styles from '../../styles';
import SheetGrid from '../sheets/SheetGrid';
import { parseSheet, serializeSheet } from '../sheets/sheetModel';

const HEADER_COLOR = '#319795';

// A pill that holds an endless, formattable spreadsheet. The whole sheet is
// stored as JSON text in the element's `text`, like the other pills.
export const SheetsPill = ({
  text,
  title,
  onUpdateText,
  onUpdateTitle,
  setHasSaved,
  loggedIn,
}) => {
  const handleChange = (next) => {
    if (setHasSaved) setHasSaved(false);
    if (onUpdateText) onUpdateText(next);
  };

  // Show something sensible if a sheet was saved without data.
  const safeText = text && text.trim().startsWith('{') ? text : serializeSheet(parseSheet(text));

  return (
    <View style={[styles.Pill, { maxWidth: '100%', backgroundColor: '#FFFFFF', alignItems: 'stretch' }]}>
      <View style={[styles.PillHeader, { backgroundColor: HEADER_COLOR, justifyContent: 'flex-start' }]}>
        <View style={styles.PillHeaderTextArea}>
          {loggedIn ? (
            <TextInput
              value={title || ''}
              placeholder="Sheet"
              placeholderTextColor="rgba(255,255,255,0.7)"
              onChangeText={(value) => {
                if (setHasSaved) setHasSaved(false);
                if (onUpdateTitle) onUpdateTitle(value);
              }}
              maxLength={80}
              style={[styles.PillHeaderText, { minWidth: 90, padding: 0, outlineStyle: 'none' }]}
            />
          ) : (
            <Text style={styles.PillHeaderText}>{title || 'Sheet'}</Text>
          )}
          <View
            style={[
              styles.PillInvertedCorner,
              { backgroundColor: HEADER_COLOR, borderColor: '#FFFFFF' },
            ]}
          />
        </View>
        <View style={[styles.PillWhiteSpace, { backgroundColor: '#FFFFFF' }]} />
      </View>
      <View style={{ width: '100%', paddingBottom: 6 }}>
        <SheetGrid text={safeText} onChange={handleChange} editable={loggedIn} />
      </View>
    </View>
  );
};

export default SheetsPill;
