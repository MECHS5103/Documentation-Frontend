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
        // Next to the nav bar, the logo's right edge lines up with the nav
        // bar's left border, so draw it with the same 4px dark border.
        !isMobile ? { borderRightWidth: 4 } : null,
      ]}
      onPress={() => setNavPanel("Landing Page")}>
      <Image
        source={require('../../assets/logo.png')}
        style={[styles.LogoImage, isMobile && styles.LogoImageMobile]}
        resizeMode="contain"
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
      {/* The logo's right border should only show from the nav bar down, where
          it joins the nav bar's left border. Hide it beside the plain header. */}
      {!isMobile && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 158,
            width: 4,
            height: 75,
            backgroundColor: '#207ADB',
            zIndex: 26,
          }}
        />
      )}
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
