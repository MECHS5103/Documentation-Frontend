import React from 'react';
import { View, ScrollView, useWindowDimensions } from 'react-native';
import styles from '../../styles';
import TextButton from '../common/TextButton';
import { categories } from '../../constants/categories';

export const NavBar = ({ navPanel, setNavPanel }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  // On narrower desktop windows use a smaller tab size so all tabs (and the
  // editor's Save/Cancel buttons) fit; if they still don't, the bar scrolls.
  const isCompact = !isMobile && width < 1180;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: '#207ADB',
        alignSelf: 'flex-start',
        borderBottomRightRadius: 100,
        flexShrink: 1,
        minWidth: 0,
        // On phones the nav bar starts where the logo ends. The offset lives
        // here (not inside the bar) so this blue backing doesn't paint over
        // the logo's bottom border.
        marginLeft: isMobile ? 95 : 0,
      }}>
      <View
        style={[
          styles.NavBar,
          isMobile && styles.NavBarMobile,
          !isMobile && { flexShrink: 1, minWidth: 0 },
        ]}>
        <ScrollView
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.NavBarScrollContainer}>
          {categories.map((item, index) => (
            <TextButton
              key={index}
              text={item}
              textStyle={[
                styles.NavBarText,
                isMobile && styles.NavBarTextMobile,
                isCompact && styles.NavBarTextCompact,
              ]}
              containerStyle={[
                styles.NavBarButton,
                isCompact && styles.NavBarButtonCompact,
              ]}
              setNavPanel={setNavPanel}
            />
          ))}
          <TextButton
            text={'Other'}
            textStyle={[
              styles.NavBarText,
              isMobile && styles.NavBarTextMobile,
              isCompact && styles.NavBarTextCompact,
            ]}
            containerStyle={[
              styles.NavBarButton,
              isCompact && styles.NavBarButtonCompact,
            ]}
            setNavPanel={setNavPanel}
          />
        </ScrollView>
      </View>
    </View>
  );
};

export default NavBar;