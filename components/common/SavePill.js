import React from 'react';
import { View, Text, Pressable } from 'react-native';
import styles from '../../styles';

export const SavePill = ({ style, onCancel, onConfirm }) => {
  return (
    <View style={[styles.Pill, { backgroundColor: '#FFFFFF' }, style]}>
      <View style={[styles.PillHeader, { backgroundColor: '#F6A053' }]}>
        <View style={styles.PillHeaderTextArea}>
          <Text style={styles.PillHeaderText}>Warning</Text>
          <View
            style={[
              styles.PillInvertedCorner,
              { backgroundColor: '#F6A053', borderColor: '#FFFFFF' },
            ]}
          />
        </View>
        <View style={[styles.PillWhiteSpace, { backgroundColor: '#FFFFFF' }]} />
      </View>
      <View style={styles.PillDescription}>
        <Text
          selectable={false}
          style={[
            styles.PillDescriptionText,
            { fontFamily: 'Arial', userSelect: 'none', textAlign: 'center' },
          ]}>
          There are unsaved changes. Are you sure you want to continue?
        </Text>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 10,
          }}>
          <View style={{ width: '25%', marginRight: '2.5%' }}>
            <Pressable
              style={{
                backgroundColor: '#FFFFFF',
                flex: 1,
                borderRadius: 10,
                borderWidth: 3,
                borderBottomWidth: 5,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: '#1A202C',
              }}
              onPress={onConfirm}>
              <Text style={{ fontFamily: 'Chewy' }}>Yes</Text>
            </Pressable>
          </View>
          <View style={{ width: '25%', marginLeft: '2.5%' }}>
            <Pressable
              style={{
                backgroundColor: '#FFFFFF',
                flex: 1,
                borderRadius: 10,
                borderWidth: 3,
                borderBottomWidth: 5,
                alignItems: 'center',
                justifyContent: 'center',
                borderColor: '#1A202C',
              }}
              onPress={onCancel}>
              <Text style={{ fontFamily: 'Chewy' }}>No</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SavePill;