import { StyleSheet, Platform } from 'react-native';

const styles = StyleSheet.create({
  /* --- Global Containers & Layout --- */
  LandingPage: {
    backgroundColor: '#CBD5E1',
    height: '100%',
    width: '100%',
    position: Platform.OS === 'web' ? 'fixed' : 'relative',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  HeaderPage: {
    width: '100%',
    backgroundColor: '#207ADB',
    zIndex: 200,
    position: 'relative',
  },
  Page: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
    paddingTop: 0,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  PageMobile: {
    flex: 1,
    flexDirection: 'column',
    paddingHorizontal: 12,
    paddingBottom: 0,
    overflow: 'hidden',
    position: 'relative',
  },

  /* --- Scrollable Content Containers --- */
  TocWrapperDesktop: {
    // Stretch to the full height of the body row. (A '100%' height does not
    // resolve inside this flex row, which is why the list never scrolled.)
    alignSelf: 'stretch',
    width: 180,
    marginRight: 16,
    flexShrink: 0,
  },
  MobileTocWrapper: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    zIndex: 999,
    flexDirection: 'column-reverse',
  },
  DocContentScrollView: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  DocContentContainer: {
    paddingBottom: 100,
  },

  /* --- Top Header & Logo --- */
  Header: {
    width: '100%',
    height: 75,
    borderColor: '#1A202C',
    backgroundColor: '#207ADB',
    justifyContent: 'center',
    zIndex: 15,
  },
  HeaderMobile: {
    height: 45,
  },
  HeaderText: {
    fontFamily: 'Chewy',
    fontSize: 50,
    alignSelf: 'center',
    color: '#FFFFFF',
  },
  HeaderTextMobile: {
    fontSize: 22,
    alignSelf: 'flex-start',
    paddingLeft: 110,
  },
  Logo: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 162,
    height: 162,
    backgroundColor: '#207ADB',
    borderBottomRightRadius: 35,
    borderBottomWidth: 4,
    borderColor: '#1A202C',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  LogoMobile: {
    width: 95,
    height: 83,
    borderBottomRightRadius: 0,
    borderBottomWidth: 4,
    borderRightWidth: 0,
    borderColor: '#1A202C',
  },
  LogoImage: {
    width: '75%',
    height: '75%',
  },
  LogoImageMobile: {
    width: '75%',
    height: '75%',
  },

  /* --- Navigation Bar --- */
  NavBar: {
    backgroundColor: '#2D3748',
    marginLeft: 0,
    marginTop: -4,
    height: 50,
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomRightRadius: 25,
    borderTopLeftRadius: 30,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#1A202C',
    overflow: 'hidden',
    zIndex: 6,
  },
  NavBarMobile: {
    marginLeft: 95, // Matches mobile logo width exactly
    height: 38,
    borderTopLeftRadius: 15,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#1A202C',
    flex: 1,
    borderBottomRightRadius: 0,
  },
  NavBarScrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
    flexDirection: 'row',
  },
  NavBarText: {
    color: '#ffffff',
    fontFamily: 'Chewy',
    fontSize: 30,
    zIndex: 1,
  },
  NavBarTextMobile: {
    fontSize: 16,
  },
  NavBarButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexShrink: 0,
    zIndex: 1,
  },

  /* --- Header Shape Accents --- */
  HeaderBorder: {
    position: 'absolute',
    top: 75,
    left: 162,
    right: 0,
    height: 3,
    backgroundColor: '#1A202C',
    zIndex: 1,
  },
  HeaderBorderMobile: {
    left: 100,
    top: 45,
    display: 'none', // Hide mobile accent line collision
  },

  /* --- Table of Contents --- */
  TableOfContents: {
    height: '100%',
    width: 165,
    marginTop: 10,
    paddingRight: 10,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 3,
    borderColor: '#1A202C',
  },
  // Desktop sidebar: fills the height of the page so its list can scroll, sits
  // flush under the nav bar, and its right border lines up with the nav bar's
  // left border (x = 158-162).
  TableOfContentsDesktop: {
    flex: 1,
    minHeight: 0,
    height: 'auto',
    width: 162,
    marginTop: 0,
    // The logo is 162px tall but the header + nav row end near 121px, so the
    // logo hangs ~40px into the page. Start the content below it.
    paddingTop: 50,
    borderRightWidth: 4,
  },
  TableOfContentsMobile: {
    width: '100%',
    maxHeight: 350,
    marginTop: 6,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: '#1A202C',
    borderRadius: 20,
    overflow: 'hidden',
  },
  TocToggleBtn: {
    backgroundColor: '#207ADB',
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: '#1A202C',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  TocToggleText: {
    fontFamily: 'Chewy',
    fontSize: 20,
    color: '#FFFFFF',
  },
  TableOfContentsHeader: {
    fontFamily: 'Chewy',
    marginTop: 10,
    marginLeft: 10,
    fontSize: 13,
  },
  SubjectContainer: {
    marginTop: 10,
    marginLeft: 10,
    paddingLeft: 10,
    paddingBottom: 10,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderBottomLeftRadius: 5,
    borderColor: '#1A202C',
  },
  SubjectContainerMobile: {
    marginLeft: 0,
    paddingLeft: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  SubjectText: {
    textTransform: 'uppercase',
    fontFamily: 'Arial',
    color: '#000000',
    fontWeight: 'bold',
  },
  SubjectTextMobile: {
    fontFamily: 'Chewy',
    fontSize: 20,
    color: '#2D3748',
    marginTop: 6,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  LessonContainer: {
    marginTop: 5,
    marginBottom: 15,
    marginLeft: 10,
    paddingLeft: 10,
    paddingBottom: 5,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderBottomLeftRadius: 5,
    borderColor: '#1A202C',
  },
  LessonContainerMobile: {
    marginLeft: 0,
    paddingLeft: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 6,
  },
  LessonItemPillMobile: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 3,
    width: '100%',
  },
  LessonItemPillActiveMobile: {
    backgroundColor: '#207ADB',
    borderColor: '#1A202C',
    borderWidth: 2,
    borderBottomWidth: 4,
  },
  LessonText: {
    fontFamily: 'Arial',
    color: '#000000',
    marginBottom: 5,
  },
  LessonTextMobile: {
    fontFamily: 'Chewy',
    fontSize: 16,
    color: '#207ADB',
  },
  LessonTextActiveMobile: {
    color: '#FFFFFF',
  },

  /* --- Content Pills & Dynamic Elements --- */
  WelcomeText: {
    marginTop: '2%',
    color: '#1A202C',
    fontFamily: 'Chewy',
    fontSize: 42,
    alignSelf: 'center',
    textAlign: 'center',
  },
  WelcomeTextMobile: {
    fontSize: 26,
    paddingHorizontal: 15,
  },
  GetStartedText: {
    color: '#ffffff',
    fontFamily: 'Chewy',
    fontSize: 26,
    textAlign: 'center',
  },
  GetStartedButton: {
    marginTop: 15,
    alignSelf: 'center',
    backgroundColor: '#F6A053',
    paddingHorizontal: 35,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 3,
    borderBottomWidth: 7,
    borderColor: '#1A202C',
  },
  NavPill: {
    flex: 1,
    height: 110,
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    borderWidth: 3,
    borderBottomWidth: 7,
    borderColor: '#1A202C',
    backgroundColor: '#FFFFFF',
  },
  NavPillText: {
    fontFamily: 'Chewy',
    fontSize: 26,
    color: '#1A202C',
    textAlign: 'center',
  },
  NavPillDescription: {
    fontFamily: 'Chewy',
    fontSize: 12,
    color: '#4A5568',
    textAlign: 'center',
    marginTop: 4,
  },
  Pill: {
    width: '100%',
    maxWidth: 650,
    minHeight: 76,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderColor: '#1A202C',
    borderWidth: 3,
    borderBottomWidth: 7,
    alignItems: 'center',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  PillMobile: {
    alignSelf: 'center',
  },
  PillHeader: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#207ADB',
    borderTopLeftRadius: 17,
    borderTopRightRadius: 17,
    justifyContent: 'center',
  },
  PillHeaderTextArea: {
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 5,
    paddingBottom: 5,
    height: '100%',
    textAlign: 'center',
    zIndex: 20,
  },
  PillWhiteSpace: {
    flex: 1,
    height: 25,
    width: 20,
    backgroundColor: '#FFFFFF',
    marginTop: 'auto',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  PillHeaderText: {
    fontFamily: 'Chewy',
    fontSize: 15,
    color: '#FFFFFF',
  },
  PillInvertedCorner: {
    position: 'absolute',
    width: 15,
    height: 15,
    backgroundColor: '#207ADB',
    bottom: -5,
    right: -4.5,
    borderBottomRightRadius: 20,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: '#FFFFFF',
  },
  PillDescription: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 15,
    paddingRight: 15,
    width: '100%',
    flex: 1,
    textAlign: 'left',
  },
  PillDescriptionText: {
    fontFamily: 'Arial',
  },

  /* --- Text Elements --- */
  TitleText: {
    fontFamily: 'Chewy',
    fontSize: 30,
    marginBottom: 30,
  },
  TitleTextMobile: {
    fontFamily: 'Chewy',
    fontSize: 28,
    marginBottom: 16,
    color: '#1A202C',
  },
  ParagraphText: {
    fontFamily: 'Arial',
    fontSize: 15,
    marginBottom: 30,
    flex: 1,
  },
  ParagraphTextMobile: {
    marginLeft: 0,
    marginBottom: 20,
  },
  HeaderPageText: {
    fontFamily: 'Arial',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    flex: 1,
  },

  /* --- Admin Controls & Add Element Bar --- */
  AddElementContainerStyle: {
    width: '100%',
    height: 36,
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginVertical: 4,
  },
  AddElementContainer: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  HoverLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#1A202C',
    opacity: 0.4,
    borderRadius: 1,
  },
  PlusButtonCircle: {
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 100,
    borderWidth: 3,
    borderBottomWidth: 5,
    borderColor: '#1A202C',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  PlusHorizontal: {
    position: 'absolute',
    width: '60%',
    height: '12%',
    backgroundColor: '#1A202C',
    borderRadius: 30,
  },
  PlusVertical: {
    position: 'absolute',
    width: '12%',
    height: '60%',
    backgroundColor: '#1A202C',
    borderRadius: 30,
  },
  MenuContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  PillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  PillButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 3,
    borderBottomWidth: 6,
    borderColor: '#1A202C',
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  PillText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ActiveInput: {
    borderWidth: 1,
    borderColor: '#207ADB',
    borderRadius: 4,
    paddingHorizontal: 4,
    backgroundColor: '#F8FAFC',
  },
});

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    html, body, #root {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden !important;
      position: fixed;
      touch-action: none;
      overscroll-behavior: none;
    }
  `;
  document.head.appendChild(styleEl);
}

export default styles;