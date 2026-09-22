import React from 'react';
import { View, Text, TextInput, Pressable, useWindowDimensions } from 'react-native';

export const LoginPanel = ({
  onLogin,
  username,
  setUsername,
  password,
  setPassword,
}) => {
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
      <View style={{ padding: 10 }}>
        <Text>User:</Text>
        <TextInput
          value={username}
          onChangeText={(text) => setUsername(text)}
          placeholder=""
          style={{
            width: '100%',
            borderWidth: 2,
            borderRadius: 5,
            fontFamily: 'Arial',
          }}
        />
      </View>
      <View style={{ padding: 10 }}>
        <Text>Password:</Text>
        <TextInput
          secureTextEntry
          value={password}
          onChangeText={(text) => setPassword(text)}
          placeholder=""
          style={{
            width: '100%',
            borderWidth: 2,
            borderRadius: 5,
            fontFamily: 'Arial',
          }}
        />
      </View>
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
          Login
        </Text>
      </Pressable>
    </View>
  );
};

export default LoginPanel;