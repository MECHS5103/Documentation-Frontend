import React from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import styles from '../../styles';
import TextButton from '../common/TextButton';
import { categories } from '../../constants/categories';

export const NavBar = ({ navPanel, setNavPanel }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={[styles.NavBar, isMobile && styles.NavBarMobile]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.NavBarScrollContainer}>
        {categories.map((item, index) => (
          <TextButton
            key={index}
            text={item}
            textStyle={[styles.NavBarText, isMobile && styles.NavBarTextMobile]}
            containerStyle={styles.NavBarButton}
            setNavPanel={setNavPanel}
          />
        ))}
        <TextButton
          text={'Other'}
          textStyle={[styles.NavBarText, isMobile && styles.NavBarTextMobile]}
          containerStyle={styles.NavBarButton}
          setNavPanel={setNavPanel}
        />
      </ScrollView>
    </View>
  );
};

export default NavBar;