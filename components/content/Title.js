import React from 'react';
import { Text } from 'react-native';
import styles from '../../styles';

export const Title = ({ section, lesson }) => (
  <Text style={styles.TitleText}>{section + ' - ' + lesson}</Text>
);

export default Title;