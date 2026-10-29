import React from 'react';
import { View, Text, Pressable, useWindowDimensions, StyleSheet } from 'react-native';
import styles from '../../styles';
import Header from './Header';
import NavBar from './NavBar';
import LoginPanel from './LoginPanel';

export const HeaderNav = ({
  navPanel,
  setNavPanel,
  onSave,
  saveDisabled = false,
  loggedIn,
  setLoggedIn,
  onLogin,
  username,
  loginVisible,
  setLoginVisible,
  lastName,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <View style={styles.HeaderPage}>
      {/* Header Container */}
      <Header
        navPanel={navPanel}
        setNavPanel={setNavPanel}
        loggedIn={loggedIn}
        setLoggedIn={setLoggedIn}
        onLogin={onLogin}
        username={username}
        loginVisible={loginVisible}
        setLoginVisible={setLoginVisible}
        lastName={lastName}
      />

      {/* Navigation Bar Row + Action Buttons */}
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#CBD5E1', zIndex: 30, marginLeft: 158 }}>
        <NavBar navPanel={navPanel} setNavPanel={setNavPanel} style={{ borderTopLeftRadius: 100, borderTopWidth: 4, borderColor: '#1A202C' }} />

        {navPanel !== 'Landing Page' && loggedIn && (
          <View style={localStyles.actionButtonsContainer}>
            <View style={localStyles.buttonWrapper}>
              <Pressable
                disabled={saveDisabled}
                onPress={onSave}
                style={[
                  localStyles.actionButton,
                  saveDisabled && localStyles.actionButtonDisabled,
                ]}>
                <Text style={localStyles.buttonText}>Save</Text>
              </Pressable>
            </View>

            <View style={localStyles.buttonWrapper}>
              <Pressable
                style={localStyles.actionButton}
                onPress={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}>
                <Text style={localStyles.buttonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Login popup: rendered here (not inside Header) so it stacks above the
          nav bar row (zIndex 30) instead of being covered by it. */}
      {loginVisible && !loggedIn && (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: isMobile ? 45 : 75,
            right: 0,
            zIndex: 100,
          }}>
          <LoginPanel onLogin={onLogin} />
        </View>
      )}

      {/* Desktop Decorative Accent Layer (Hidden on Mobile to eliminate gray bar glitches) */}
      {!isMobile && (
        <>
          <View style={styles.HeaderBorder} />
        </>
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    flexShrink: 1,
  },
  buttonWrapper: {
    paddingTop: 4,
    marginRight: 8,
    minWidth: 70,
    height: 38,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#1A202C',
    paddingHorizontal: 8,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontFamily: 'Chewy',
    fontSize: 14,
    color: '#1A202C',
  },
});

export default HeaderNav;
