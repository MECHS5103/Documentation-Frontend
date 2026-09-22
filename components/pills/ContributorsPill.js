import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';

export const ContributorsPill = ({ text = '' }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const contributors = text ? text.split(', ').filter(Boolean) : [];

  return (
    <View style={[pillStyles.wrapper, isMobile && { maxWidth: '100%' }]}>
      {/* Header Tab - Flush to the left */}
      <View style={pillStyles.headerTab}>
        <Text style={pillStyles.headerText}>Contributors</Text>
      </View>

      {/* Main Card Container */}
      <View style={pillStyles.container}>
        {contributors.length > 0 ? (
          <View style={pillStyles.badgeContainer}>
            {contributors.map((name, index) => (
              <View key={index} style={pillStyles.nameBadge}>
                <Text style={pillStyles.nameText}>👤 {name}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={pillStyles.emptyText}>No contributors recorded yet.</Text>
        )}
      </View>
    </View>
  );
};

const pillStyles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 350,
    alignSelf: 'flex-start',
    marginVertical: 10,
  },
  headerTab: {
    backgroundColor: '#319795',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#1A202C',
    marginLeft: 0,
    zIndex: 1,
  },
  headerText: {
    fontFamily: 'Chewy',
    color: '#FFFFFF',
    fontSize: 15,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderTopLeftRadius: 0,
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#1A202C',
    padding: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  nameBadge: {
    backgroundColor: '#EDF2F7',
    borderWidth: 2,
    borderColor: '#2D3748',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  nameText: {
    fontFamily: 'Chewy',
    fontSize: 15,
    color: '#1A202C',
  },
  emptyText: {
    fontFamily: 'Chewy',
    fontSize: 14,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
});

export default ContributorsPill;