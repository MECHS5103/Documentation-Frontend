import React from 'react';
import { Text, useWindowDimensions } from 'react-native';
import styles from '../../styles';

export const Title = ({ section, lesson }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <Text style={[styles.TitleText, isMobile && styles.TitleTextMobile]}>
      {section + ' - ' + lesson}
    </Text>
  );
};

export default Title;