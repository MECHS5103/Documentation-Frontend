import React from 'react';
import { Text, View } from 'react-native';
import { parseSheet, usedExtent } from './sheetModel';

// Phones and tablets running the native app get a simple summary. The full
// spreadsheet lives in SheetGrid.web.js, which the website uses.
export default function SheetGrid({ text }) {
  const used = usedExtent(parseSheet(text));
  return (
    <View style={{ padding: 12 }}>
      <Text style={{ fontFamily: 'Arial', fontSize: 14 }}>
        This sheet ({used.row + 1} rows by {used.col + 1} columns) can be viewed and edited on the website.
      </Text>
    </View>
  );
}
