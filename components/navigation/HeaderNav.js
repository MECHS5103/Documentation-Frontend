import React from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import styles from '../../styles';
import Header from './Header';
import NavBar from './NavBar';

export const HeaderNav = ({
  navPanel,
  setNavPanel,
  onSave,
  loggedIn,
  setLoggedIn,
  onLogin,
  username,
  setUsername,
  password,
  setPassword,
  loginVisible,
  setLoginVisible,
  lastName,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.HeaderPage}>
      <Header
        navPanel={navPanel}
        setNavPanel={setNavPanel}
        loggedIn={loggedIn}
        setLoggedIn={setLoggedIn}
        onLogin={onLogin}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        loginVisible={loginVisible}
        setLoginVisible={setLoginVisible}
        lastName={lastName}
      />
      <View style={{ flexDirection: 'row' }}>
        <NavBar navPanel={navPanel} setNavPanel={setNavPanel} />
        {navPanel !== 'Landing Page' && loggedIn && (
          <View style={{ marginLeft: -22, flex: 1, flexDirection: 'row' }}>
            <View
              style={{
                flex: 1,
                marginLeft: '15%',
                paddingTop: '4%',
              }}>
              <Pressable
                onPress={onSave}
                style={{
                  backgroundColor: '#FFFFFF',
                  flex: 1,
                  borderRadius: 10,
                  borderWidth: 3,
                  borderBottomWidth: 5,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderColor: '#1A202C',
                }}>
                <Text style={{ fontFamily: 'Chewy' }}>Save</Text>
              </Pressable>
            </View>
            <View
              style={{
                flex: 1,
                marginLeft: '10%',
                marginRight: '5%',
                paddingTop: '4%',
              }}>
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
                onPress={() => {
                  window.location.reload();
                }}>
                <Text style={{ fontFamily: 'Chewy' }}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View
        style={[styles.HeaderBorder, isMobile && styles.HeaderBorderMobile]}
      />
      <View style={[styles.Square, isMobile && styles.Square1Mobile]} />
      <View style={[styles.Square, isMobile && styles.Square2Mobile]} />
      <View
        style={[styles.InvertedCorner, isMobile && styles.InvertedCornerMobile]}
      />
      <View style={[styles.Square, isMobile && styles.Square3Mobile]} />
      <View
        style={[
          styles.LogoBorder,
          isMobile && styles.LogoBorderMobile,
          navPanel !== 'Landing Page' &&
            !isMobile && { width: 165, height: 40, top: 125 },
          navPanel !== 'Landing Page' &&
            isMobile && { width: 103, height: 25, top: 78 },
        ]}
      />
      <View
        style={[
          styles.InvertedCorner2,
          isMobile && styles.InvertedCorner2Mobile,
        ]}
      />
      {navPanel === 'Landing Page' && (
        <View
          style={[
            styles.InvertedCorner3,
            isMobile && styles.InvertedCorner3Mobile,
          ]}
        />
      )}
    </View>
  );
};

export default HeaderNav;