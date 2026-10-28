import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';

export const LoginPanel = ({ onLogin }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View
      style={{
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        width: isMobile ? 180 : 150,
        top: '100%',
        right: 10,
        marginTop: 10,
        borderRadius: 10,
        borderWidth: 3,
        borderBottomWidth: 5,
        zIndex: 1000,
      }}>
      <Text style={{ padding: 10, fontFamily: 'Arial', fontSize: 12 }}>
        Use an approved Team 5103 Google account.
      </Text>
      <Pressable
        style={{
          alignSelf: 'center',
          padding: 5,
          width: '75%',
          borderWidth: 3,
          borderBottomWidth: 5,
          borderRadius: 10,
          marginBottom: 5,
        }}
        onPress={() => {
          onLogin();
        }}>
        <Text
          style={{ textAlign: 'center', fontFamily: 'Arial', fontSize: 12 }}>
          Continue with Google
        </Text>
      </Pressable>
    </View>
  );
};

export default LoginPanel;
