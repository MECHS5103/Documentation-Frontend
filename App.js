import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Text,
  useWindowDimensions,
} from 'react-native';
import { useFonts, Chewy_400Regular } from '@expo-google-fonts/chewy';

import useFetchData from './hooks/useFetchData';
import dataCache from './services/cache';
import { postApi } from './services/api';
import {
  getEditorIdToken,
  observeEditorAuthState,
  signInEditor,
  signOutEditor,
} from './services/auth';
import styles from './styles';
import VideoPill from './components/pills/VideoPill';
import ContributorsPill from './components/pills/ContributorsPill';

import HeaderNav from './components/navigation/HeaderNav';
import TableOfContents from './components/navigation/TableOfContents';
import LandingPage from './components/landing/LandingPage';
import SavePill from './components/common/SavePill';

import Title from './components/content/Title';
import HeaderText from './components/content/HeaderText';
import Paragraph from './components/content/Paragraph';
import AddElementContainer from './components/content/AddElement';

import {
  TipPill,
  WarningPill,
  CodePill,
  ImportantPill,
  SuccessPill,
  VocabularyPill,
} from './components/pills/PillVariants';

const safeDecodeURIComponent = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export default function App() {
  let [fontsLoaded] = useFonts({
    Chewy: Chewy_400Regular,
  });

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [tocData, setTocData] = useState([]);
  const [tocVersion, setTocVersion] = useState(0);
  const [tocLoadState, setTocLoadState] = useState({
    category: null,
    status: 'idle',
  });
  const [pageElements, setPageElements] = useState([]);
  const [pageVersion, setPageVersion] = useState(0);
  const [documentLoadState, setDocumentLoadState] = useState({
    key: null,
    status: 'idle',
  });
  const [loading, setLoading] = useState(true);
  const [hasSaved, setHasSaved] = useState(true);
  const [requestPageChange, setRequestPageChange] = useState(null);

  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [loginVisible, setLoginVisible] = useState(false);
  const [lastName, setLastName] = useState('');

  const [pageCredits, setPageCredits] = useState([]);

  useEffect(() => {
    return observeEditorAuthState((user) => {
      if (!user) {
        setLoggedIn(false);
        setUsername('');
        setLastName('');
        return;
      }

      const displayName = (user.displayName || user.email || '').trim();
      const nameParts = displayName.split(/\s+/).filter(Boolean);

      setLoggedIn(true);
      setUsername(nameParts[0] || displayName);
      setLastName(nameParts.slice(1).join(' '));
    });
  }, []);

  const parseCurrentUrl = () => {
    if (typeof window === 'undefined')
      return { panel: 'Landing Page', section: '', lesson: '', isExplicit: false };

    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    if (p) {
      const segments = p.split('/').filter(Boolean);
      return {
        panel: segments[0] ? safeDecodeURIComponent(segments[0]) : 'Landing Page',
        section: segments[1] ? safeDecodeURIComponent(segments[1]) : '',
        lesson: segments[2] ? safeDecodeURIComponent(segments[2]) : '',
        isExplicit: true,
      };
    }

    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);

    // REMOVED the check that shifted/skipped 'documentation'

    if (segments.length === 0) {
      return { panel: 'Landing Page', section: '', lesson: '', isExplicit: true };
    }

    return {
      panel: segments[0] ? safeDecodeURIComponent(segments[0]) : 'Landing Page',
      section: segments[1] ? safeDecodeURIComponent(segments[1]) : '',
      lesson: segments[2] ? safeDecodeURIComponent(segments[2]) : '',
      isExplicit: true,
    };
  };

  const initialRoute = parseCurrentUrl();

  const [navPanel, setNavPanel] = useState(() => {
    if (initialRoute.isExplicit) {
      return initialRoute.panel;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('last_navPanel') || 'Landing Page';
    }
    return 'Landing Page';
  });

  const [activeSection, setActiveSection] = useState(() => {
    if (initialRoute.isExplicit) {
      return initialRoute.section;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('last_activeSection') || '';
    }
    return '';
  });

  const [activeLesson, setActiveLesson] = useState(() => {
    if (initialRoute.isExplicit) {
      return initialRoute.lesson;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('last_activeLesson') || '';
    }
    return '';
  });

  const currentDocumentKey =
    navPanel && activeSection && activeLesson
      ? JSON.stringify([navPanel, activeSection, activeLesson])
      : null;
  const currentDocumentReady =
    currentDocumentKey !== null &&
    documentLoadState.key === currentDocumentKey &&
    documentLoadState.status === 'ready' &&
    tocLoadState.category === navPanel &&
    tocLoadState.status === 'ready';
  const currentDocumentFailed =
    currentDocumentKey !== null &&
    documentLoadState.key === currentDocumentKey &&
    documentLoadState.status === 'error';
  // Without these, a failed or empty table of contents left the page on an
  // endless loading spinner with no explanation.
  const tocFailed =
    tocLoadState.category === navPanel && tocLoadState.status === 'error';
  const tocEmpty =
    tocLoadState.category === navPanel &&
    tocLoadState.status === 'ready' &&
    !tocData.some(
      (item) => item.type && item.type.toLowerCase() === 'lessontext'
    );

  useFetchData({
    navPanel,
    setTocData,
    setTocVersion,
    setTocLoadState,
    setPageElements,
    setPageVersion,
    documentKey: currentDocumentKey,
    setDocumentLoadState,
    activeSection,
    setActiveSection,
    activeLesson,
    setActiveLesson,
    setLoading,
  });

  useEffect(() => {
    const handlePopState = () => {
      const route = parseCurrentUrl();
      setNavPanel(route.panel);
      setActiveSection(route.section);
      setActiveLesson(route.lesson);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const hasSyncedUrl = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let newPath = '/';
      if (navPanel && navPanel !== 'Landing Page') {
        newPath += `${encodeURIComponent(navPanel)}`;
        if (activeSection) {
          newPath += `/${encodeURIComponent(activeSection)}`;
          if (activeLesson) {
            newPath += `/${encodeURIComponent(activeLesson)}`;
          }
        }
      }

      // Only add a history entry when the address actually changes. Without
      // this, page load and every Back/Forward press (which updates state from
      // the URL) pushed a duplicate entry, so Back needed several presses and
      // could never reach the landing page.
      const alreadyThere =
        !window.location.search &&
        safeDecodeURIComponent(window.location.pathname) ===
          safeDecodeURIComponent(newPath);

      if (!alreadyThere) {
        const currentPath = safeDecodeURIComponent(window.location.pathname);
        // Picking a category lands on "/Category" and then the first lesson is
        // selected automatically. Replace that bare entry instead of stacking
        // a second one, so Back from the first lesson leaves the category.
        const isAutoSelect =
          currentPath !== '/' &&
          currentPath.split('/').filter(Boolean).length === 1 &&
          safeDecodeURIComponent(newPath).startsWith(`${currentPath}/`);

        if (!hasSyncedUrl.current || isAutoSelect) {
          // First sync on load / auto-selected lesson: no new history entry.
          window.history.replaceState({ path: newPath }, '', newPath);
        } else {
          window.history.pushState({ path: newPath }, '', newPath);
        }
      }
      hasSyncedUrl.current = true;
    }
  }, [navPanel, activeSection, activeLesson]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('last_navPanel', navPanel);
      localStorage.setItem('last_activeSection', activeSection);
      localStorage.setItem('last_activeLesson', activeLesson);

    }
  }, [navPanel, activeSection, activeLesson]);

  useEffect(() => {
    const creditsElement = pageElements.find((item) => item.type === 'Credits');
    if (creditsElement) {
      const contributors = (creditsElement.text || '').split(', ');
      setPageCredits(contributors);
    } else {
      setPageCredits([]);
    }
  }, [pageElements]);

  const handleLogin = async () => {
    try {
      await signInEditor();
      setLoginVisible(false);
    } catch (error) {
      console.error('Sign-in error:', error);
      alert(error.message || 'Unable to sign in.');
    }
  };

  const handleLogout = async () => {
    await signOutEditor();
    setLoggedIn(false);
    setLoginVisible(false);
    setUsername('');
    setLastName('');
  };

  const handleSave = async (tocOverride = null) => {
    if (!currentDocumentReady) {
      alert('Wait for the current page to finish loading before saving.');
      return;
    }
    setLoading(true);

    const dataToSave =
      tocOverride && Array.isArray(tocOverride) ? tocOverride : tocData;

    const userCut = username.split(' ');

    const userFullName = [userCut[0], lastName].filter(Boolean).join(' ');

    const updatedPageElements = pageElements.map((item) => {
      if (item.type === 'Credits') {
        const existingText = item.text || '';
        const existingNames = existingText
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean);

        const exists = existingNames.some(
          (name) => name.toLowerCase() === userFullName.trim().toLowerCase()
        );

        if (!exists) {
          existingNames.push(userFullName.trim());
        }

        return {
          ...item,
          text: existingNames.join(', '),
        };
      }
      return item;
    });

    try {
      const idToken = await getEditorIdToken();
      const result = await postApi({
        action: 'saveContent',
        idToken,
        category: navPanel,
        section: activeSection,
        lesson: activeLesson,
        expectedPageVersion: pageVersion,
        expectedTocVersion: tocVersion,
        tocData: dataToSave,
        pageElements: updatedPageElements,
      });
      if (result.status === 'success') {
        alert('Data saved successfully!');
        setHasSaved(true);
        setPageVersion(result.pageVersion);
        setTocVersion(result.tocVersion);

        const cacheKey = `${navPanel}-${activeSection}-${activeLesson}`;
        dataCache.pages[cacheKey] = {
          pageElements: updatedPageElements,
          version: result.pageVersion,
          timestamp: Date.now(),
        };
        if (dataCache.toc[navPanel]) {
          dataCache.toc[navPanel].tocData = dataToSave;
          dataCache.toc[navPanel].version = result.tocVersion;
          dataCache.toc[navPanel].timestamp = Date.now();
        }
      } else if (result.code === 'VERSION_CONFLICT') {
        delete dataCache.pages[`${navPanel}-${activeSection}-${activeLesson}`];
        delete dataCache.toc[navPanel];
        setHasSaved(false);
        alert(
          'Another editor saved changes first. Reload this page before trying again; your unsaved edits were not written.'
        );
      } else {
        alert('Failed to save: ' + result.message);
      }
    } catch (error) {
      console.error('Error saving data:', error);
      alert('An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectLesson = (section, lesson) => {
    if (hasSaved) {
      setActiveSection(section);
      setActiveLesson(lesson);
      setRequestPageChange(null);
    } else {
      setRequestPageChange({ section, lesson });
    }
  };

  const handleNavPanelChange = (nextPanel) => {
    if (nextPanel !== navPanel) {
      setActiveSection('');
      setActiveLesson('');
      setTocData([]);
      setTocVersion(0);
      setTocLoadState({ category: nextPanel, status: 'loading' });
      setPageElements([]);
      setPageVersion(0);
      setDocumentLoadState({ key: null, status: 'idle' });
    }
    setNavPanel(nextPanel);
  };

  const handleAddElement = (index, type) => {
    let newElement = { type: type };

    if (type === 'Paragraph') {
      newElement.text = 'New paragraph text...';
    } else if (type === 'HeaderText') {
      newElement.text = 'New Header';
    } else if (type === 'VideoPill' || type === 'Video') {
      newElement.title = 'New Video Title';
      newElement.caption = 'New video caption...';
      newElement.videoUrl = null;
    } else if (type.endsWith('Pill')) {
      newElement.text = 'New description text...';
      if (type === 'CodePill') {
        newElement.language = 'Java';
      }
    } else if (type === 'Title') {
      newElement.section = 'New Section';
      newElement.lesson = 'New Lesson';
    }

    setPageElements((prevElements) => {
      const updated = [...prevElements];
      updated.splice(index + 1, 0, newElement);
      return updated;
    });
    setHasSaved(false);
  };

  const handleUpdateElementField = (index, field, value) => {
    setPageElements((prevElements) => {
      const updated = [...prevElements];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
    setHasSaved(false);
  };

  const handleDeleteElement = (indexToDelete) => {
    setPageElements((prevElements) =>
      prevElements.filter((_, index) => index !== indexToDelete)
    );
    setHasSaved(false);
  };

  const handleMoveElementUp = (index) => {
    if (index === 0) return;
    setPageElements((prevElements) => {
      const updated = [...prevElements];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
    setHasSaved(false);
  };

  const handleMoveElementDown = (index) => {
    setPageElements((prevElements) => {
      if (index === prevElements.length - 1) return prevElements;
      const updated = [...prevElements];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
    setHasSaved(false);
  };

  if (!fontsLoaded) return null;

  return (
    <View style={styles.LandingPage}>
      <StatusBar hidden={true} />

      {/* HEADER SECTION */}
      <HeaderNav
        navPanel={navPanel}
        setNavPanel={handleNavPanelChange}
        onSave={() => handleSave()}
        saveDisabled={!currentDocumentReady}
        loggedIn={loggedIn}
        setLoggedIn={(val) => {
          if (!val) {
            handleLogout();
          }
        }}
        onLogin={handleLogin}
        username={username}
        loginVisible={loginVisible}
        setLoginVisible={setLoginVisible}
        lastName={lastName}
      />

      {/* MAIN BODY LAYOUT */}
      <View
        style={{
          flex: 1,
          flexDirection: isMobile ? 'column' : 'row',
          marginTop: 0,
          paddingTop: 0,
          overflow: 'hidden',
          position: 'relative',
        }}>

        {/* 1. TABLE OF CONTENTS (DESKTOP ONLY LOCATION) */}
        {!isMobile && navPanel !== 'Landing Page' && navPanel !== 'Test' && (
          <View style={styles.TocWrapperDesktop}>
            <TableOfContents
              data={tocData}
              currentCategory={navPanel}
              activeLesson={activeLesson}
              onSelectLesson={handleSelectLesson}
              loggedIn={loggedIn}
              onSave={(flattenedToc) => handleSave(flattenedToc)}
              onUpdateTocData={(newTocData) => {
                setTocData(newTocData);
                setHasSaved(false);
              }}
            />
          </View>
        )}

        {/* 2. DOCUMENTATION CONTENT CONTAINER */}
        {navPanel === 'Landing Page' ? (
          <LandingPage setNavPanel={handleNavPanelChange} />
        ) : loading || !currentDocumentReady ? (
          currentDocumentFailed || tocFailed || (tocEmpty && !loading) ? (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                padding: 24,
              }}>
              <Text
                style={{
                  fontFamily: 'Chewy',
                  fontSize: 22,
                  color: '#1A202C',
                  textAlign: 'center',
                  maxWidth: 420,
                }}>
                {currentDocumentFailed
                  ? 'Unable to load this page. Reload and try again.'
                  : tocFailed
                    ? 'Unable to load this section. Check your connection and reload to try again.'
                    : loggedIn
                      ? 'This section is empty. Use Edit TOC to add a first section and lesson.'
                      : 'Nothing has been written for this section yet.'}
              </Text>
            </View>
          ) : (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0)',
            }}>
            <ActivityIndicator size="large" color="#207ADB" />
          </View>
          )
        ) : (
          <ScrollView
            style={[
              styles.Page,
              isMobile && styles.PageMobile,
              { flex: 1, height: '100%' },
            ]}
            contentContainerStyle={{ paddingTop: 0, paddingBottom: isMobile ? 120 : 80 }}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}>
            {pageElements.length === 0
              ? loggedIn && (
                <View
                  style={{
                    width: '100%',
                    maxWidth: 650,
                    alignSelf: isMobile ? 'center' : 'flex-start',
                    marginBottom: 20,
                  }}>
                  <AddElementContainer index={-1} onAdd={handleAddElement} />
                </View>
              )
              : pageElements.map((item, index) => {
                let elementComponent = null;

                switch (item.type) {
                  case 'Title':
                    elementComponent = (
                      <Title
                        key={`el-${index}`}
                        section={activeSection}
                        lesson={activeLesson}
                      />
                    );
                    break;
                  case 'HeaderText':
                    elementComponent = (
                      <HeaderText
                        key={`el-${index}`}
                        title={item.text}
                        onUpdate={(newText) =>
                          handleUpdateElementField(index, 'text', newText)
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  case 'Paragraph':
                    elementComponent = (
                      <Paragraph
                        key={`el-${index}`}
                        text={item.text}
                        onUpdate={(newText) =>
                          handleUpdateElementField(index, 'text', newText)
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  case 'CodePill':
                    elementComponent = (
                      <CodePill
                        key={`el-${index}`}
                        description={item.text || item.description}
                        language={item.language}
                        onUpdate={(newText) =>
                          handleUpdateElementField(
                            index,
                            item.description !== undefined
                              ? 'description'
                              : 'text',
                            newText
                          )
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  case 'TipPill':
                    elementComponent = (
                      <TipPill
                        key={`el-${index}`}
                        description={item.text || item.description}
                        onUpdate={(newText) =>
                          handleUpdateElementField(
                            index,
                            item.description !== undefined
                              ? 'description'
                              : 'text',
                            newText
                          )
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  case 'WarningPill':
                    elementComponent = (
                      <WarningPill
                        key={`el-${index}`}
                        description={item.text || item.description}
                        onUpdate={(newText) =>
                          handleUpdateElementField(
                            index,
                            item.description !== undefined
                              ? 'description'
                              : 'text',
                            newText
                          )
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  case 'ImportantPill':
                    elementComponent = (
                      <ImportantPill
                        key={`el-${index}`}
                        description={item.text || item.description}
                        onUpdate={(newText) =>
                          handleUpdateElementField(
                            index,
                            item.description !== undefined
                              ? 'description'
                              : 'text',
                            newText
                          )
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  case 'SuccessPill':
                    elementComponent = (
                      <SuccessPill
                        key={`el-${index}`}
                        description={item.text || item.description}
                        onUpdate={(newText) =>
                          handleUpdateElementField(
                            index,
                            item.description !== undefined
                              ? 'description'
                              : 'text',
                            newText
                          )
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  case 'VocabularyPill':
                    elementComponent = (
                      <VocabularyPill
                        key={`el-${index}`}
                        description={item.text || item.description}
                        onUpdate={(newText) =>
                          handleUpdateElementField(
                            index,
                            item.description !== undefined
                              ? 'description'
                              : 'text',
                            newText
                          )
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  case 'VideoPill':
                  case 'Video':
                    elementComponent = (
                      <VideoPill
                        key={`el-${index}`}
                        title={item.title || ''}
                        videoUrl={item.videoUrl || item.url || null}
                        caption={item.caption || ''}
                        onUpdateTitle={(newTitle) =>
                          handleUpdateElementField(index, 'title', newTitle)
                        }
                        onUpdateVideoUrl={(newUrl) =>
                          handleUpdateElementField(index, 'videoUrl', newUrl)
                        }
                        onUpdateCaption={(newCaption) =>
                          handleUpdateElementField(
                            index,
                            'caption',
                            newCaption
                          )
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  case 'Credits': {
                    elementComponent = (
                      <ContributorsPill
                        key={`el-${index}`}
                        text={item.text || ''}
                        onUpdateText={(newText) =>
                          handleUpdateElementField(index, 'text', newText)
                        }
                        setHasSaved={setHasSaved}
                        loggedIn={loggedIn}
                      />
                    );
                    break;
                  }
                  default:
                    elementComponent = null;
                }

                return (
                  <View
                    key={`group-${index}`}
                    style={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: 650,
                      paddingHorizontal: 0,
                      alignSelf: isMobile ? 'center' : 'flex-start',
                      paddingTop: loggedIn ? 8 : 0,
                    }}>
                    {loggedIn && item.type !== 'Credits' && (
                      <View
                        style={{
                          // In the normal flow (not absolutely positioned) so
                          // the controls never cover the element's own text.
                          alignSelf: 'flex-end',
                          marginRight: 8,
                          marginTop: 4,
                          flexDirection: 'row',
                          gap: 4,
                          alignItems: 'center',
                        }}>
                        <TouchableOpacity
                          style={{
                            backgroundColor:
                              index === 0 ? '#E2E8F0' : '#EDF2F7',
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            justifyContent: 'center',
                            alignItems: 'center',
                            elevation: 3,
                            opacity: index === 0 ? 0.5 : 1,
                          }}
                          disabled={index === 0}
                          onPress={() => handleMoveElementUp(index)}>
                          <Text
                            style={{
                              color: '#4A5568',
                              fontWeight: 'bold',
                              fontSize: 12,
                            }}>
                            ▲
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            backgroundColor:
                              index === pageElements.length - 1
                                ? '#E2E8F0'
                                : '#EDF2F7',
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            justifyContent: 'center',
                            alignItems: 'center',
                            elevation: 3,
                            opacity:
                              index === pageElements.length - 1 ? 0.5 : 1,
                          }}
                          disabled={index === pageElements.length - 1}
                          onPress={() => handleMoveElementDown(index)}>
                          <Text
                            style={{
                              color: '#4A5568',
                              fontWeight: 'bold',
                              fontSize: 12,
                            }}>
                            ▼
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            backgroundColor: '#FED7D7',
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            justifyContent: 'center',
                            alignItems: 'center',
                            elevation: 3,
                          }}
                          onPress={() => handleDeleteElement(index)}
                          hitSlop={{
                            top: 10,
                            bottom: 10,
                            left: 10,
                            right: 10,
                          }}>
                          <Text
                            style={{
                              color: '#E53E3E',
                              fontWeight: 'bold',
                              fontSize: 13,
                              lineHeight: 15,
                            }}>
                            ✕
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View
                      style={{ marginTop: loggedIn ? 6 : 0, width: '100%' }}>
                      {elementComponent}
                    </View>

                    {loggedIn && item.type !== 'Credits' && (
                      <AddElementContainer
                        index={index}
                        onAdd={handleAddElement}
                      />
                    )}
                  </View>
                );
              })}
          </ScrollView>
        )}

        {/* 3. TABLE OF CONTENTS (MOBILE BOTTOM FIXED LOCATION) */}
        {isMobile && navPanel !== 'Landing Page' && navPanel !== 'Test' && (
          <View style={styles.MobileTocWrapper}>
            <TableOfContents
              data={tocData}
              currentCategory={navPanel}
              activeLesson={activeLesson}
              onSelectLesson={handleSelectLesson}
              loggedIn={loggedIn}
              onSave={(flattenedToc) => handleSave(flattenedToc)}
              onUpdateTocData={(newTocData) => {
                setTocData(newTocData);
                setHasSaved(false);
              }}
            />
          </View>
        )}

        {navPanel === 'Test' && <View />}
      </View>

      {/* MODAL SAVE OVERLAY */}
      {requestPageChange && !hasSaved && (
        <SavePill
          style={{
            position: 'absolute',
            top: '40%',
            alignSelf: 'center',
            zIndex: 9999,
          }}
          onCancel={() => setRequestPageChange(null)}
          onConfirm={() => {
            setHasSaved(true);
            setActiveSection(requestPageChange.section);
            setActiveLesson(requestPageChange.lesson);
            setRequestPageChange(null);
          }}
        />
      )}
    </View>
  );
}
