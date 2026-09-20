import React from 'react';
import { FlatList, Pressable, Text, useWindowDimensions } from 'react-native';
import styles from '../../styles';
import { categories, descriptions } from '../../constants/categories';

export const NavigationPill = ({ text, index, setNavPanel }) => {
  console.log("NavigationPill setNavPanel type:", typeof setNavPanel); // 👈 Add this line

  return (
    <Pressable
      style={styles.NavPill}
      onPress={() => {
        if (typeof setNavPanel === 'function') {
          setNavPanel(text);
        } else {
          console.error("CRITICAL: setNavPanel is NOT a function!", setNavPanel);
        }
      }}
    >
      <Text style={styles.NavPillText} numberOfLines={1} adjustsFontSizeToFit>
        {text}
      </Text>
      <Text
        style={styles.NavPillDescription}
        numberOfLines={2}
        adjustsFontSizeToFit>
        {descriptions[index]}
      </Text>
    </Pressable>
  );
};

export const MainNav = ({ setNavPanel }) => {
  const { width } = useWindowDimensions();
  const columns = width < 600 ? 2 : 3;

  return (
    <FlatList
      key={columns}
      data={categories}
      numColumns={columns}
      keyExtractor={(item, index) => index.toString()}
      contentContainerStyle={styles.MainNav}
      renderItem={({ item, index }) => (
        <NavigationPill text={item} index={index} setNavPanel={setNavPanel} />
      )}
    />
  );
};

export default MainNav;