// Header.js
import React from 'react';
import { View, Text, Image, Pressable, useWindowDimensions } from 'react-native';
import styles from '../../styles';

export const Logo = ({ navPanel, setNavPanel }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <Pressable
      style={[
        styles.Logo,
        isMobile && styles.LogoMobile,
        navPanel !== 'Landing Page' ? { borderBottomRightRadius: 0 } : null,
      ]}
      onPress={() => setNavPanel("Landing Page")}>
      <Image
        source={require('../../assets/logo.png')}
        style={[styles.LogoImage, isMobile && styles.LogoImageMobile]}
        resizeMode="contain"
      />
      <View
        style={{
          position: 'absolute',
          right: 0,
          bottom: -4,
          height: 50,
          width: 100,
          backgroundColor: '207ADB',
          borderRightWidth: 4,
          borderBottomWidth: 4,
          borderBottomRightRadius: 35,
          borderColor: '#1A202C',
        }}
      />
    </Pressable>
  );
};

export const Header = ({
  navPanel,
  setNavPanel,
  loggedIn,
  setLoggedIn,
  onLogin,
  username,
  loginVisible,
  setLoginVisible,
  lastName
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Format full name for the badge
  const userCut = username ? username.split(' ') : ['User'];
  const fullName = lastName ? `${userCut[0]} ${lastName}` : username;

  return (
    <View style={[styles.Header, isMobile && styles.HeaderMobile]}>
      <Logo navPanel={navPanel} setNavPanel={setNavPanel} />
      <Text style={[styles.HeaderText, isMobile && styles.HeaderTextMobile]}>
        Documentation
      </Text>

      {/* Right side container holding user badge and Sign Out / Login button */}
      <View
        style={{
          position: 'absolute',
          right: 20,
          top: isMobile ? 8 : 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          zIndex: 30,
        }}>
        {/* User Badge (Only renders when logged in) */}
        {loggedIn && (
          <View
            style={{
              backgroundColor: '#F7FAFC',
              borderWidth: 2,
              borderColor: '#1A202C',
              borderRadius: 10,
              paddingVertical: 5,
              paddingHorizontal: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}>
            <Text style={{ fontSize: 14 }}>👤</Text>
            <Text
              style={{
                fontFamily: 'Chewy',
                fontSize: 16,
                color: '#1A202C',
              }}>
              {fullName}
            </Text>
          </View>
        )}

        {/* Sign Out / Login Button */}
        <Pressable
          onPress={() => {
            if (loggedIn) {
              setLoggedIn(false);
              return;
            }

            if (loginVisible) {
              setLoginVisible(false);
            } else {
              setLoginVisible(true);
            }
          }}>
          <Text
            style={{
              color: '#FFFFFF',
              fontFamily: 'Chewy',
              fontSize: isMobile ? 16 : 20,
            }}>
            {loggedIn ? 'Sign Out' : 'Login'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default Header;
