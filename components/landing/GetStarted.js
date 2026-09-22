import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import styles from '../../styles';
import TextButton from '../common/TextButton';

export const GetStarted = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={{ marginTop: 85 }}>
      <Text style={[styles.WelcomeText, isMobile && styles.WelcomeTextMobile]}>
        Welcome to MECH & Cheese Documentation
      </Text>
      <TextButton
        text={'Get Started'}
        textStyle={styles.GetStartedText}
        containerStyle={styles.GetStartedButton}
      />
    </View>
  );
};

export default GetStarted;