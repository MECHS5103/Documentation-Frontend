import React from 'react';
import { View } from 'react-native';
import styles from '../../styles';
import GetStarted from './GetStarted';
import MainNav from './MainNav';

export const LandingPage = ({ setNavPanel }) => (
  <View style={styles.LandingPage}>
    <GetStarted />
    <MainNav setNavPanel={setNavPanel} />
  </View>
);

export default LandingPage;