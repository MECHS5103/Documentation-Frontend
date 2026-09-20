import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useFonts, Chewy_400Regular } from '@expo-google-fonts/chewy';

import useFetchData from './hooks/useFetchData';
import dataCache from './services/cache';
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

export default function App() {
  let [fontsLoaded] = useFonts({
    Chewy: Chewy_400Regular,
  });

  const [tocData, setTocData] = useState([]);
  const [pageElements, setPageElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasSaved, setHasSaved] = useState(true);
  const [requestPageChange, setRequestPageChange] = useState(null);

  // Persist loggedIn state across page refreshes
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('is_logged_in') === 'true';
    }
    return false;
  });

  // Initialize username from localStorage
  const [username, setUsername] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('user_username') || '';
    }
    return '';
  });

  const [password, setPassword] = useState('');
  const [loginVisible, setLoginVisible] = useState(false);

  // Initialize lastName from localStorage
  const [lastName, setLastName] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('user_last_name') || '';
    }
    return '';
  });

  const [pageCredits, setPageCredits] = useState([]);

  // Parse clean pathnames or 404 query redirects and check if it's an explicit URL request
  const parseCurrentUrl = () => {
    if (typeof window === 'undefined') return { panel: 'Landing Page', section: '', lesson: '', isExplicit: false };

    // 1. Check if redirected via the 404.html query parameter (?p=...)
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    if (p) {
      const segments = p.split('/').filter(Boolean);
      return {
        panel: segments[0] ? decodeURIComponent(segments[0]) : 'Landing Page',
        section: segments[1] ? decodeURIComponent(segments[1]) : '',
        lesson: segments[2] ? decodeURIComponent(segments[2]) : '',
        isExplicit: true,
      };
    }

    // 2. Check direct clean pathname (e.g., /Documentation/Programming/Swerve/Swerve-Module)
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean); // ['Documentation', 'Programming', ...]

    // Remove the GitHub repository name segment ('Documentation') if present
    if (segments.length > 0 && segments[0].toLowerCase() === 'documentation') {
      segments.shift();
    }

    // If nothing follows the root, explicitly return Landing Page as an explicit request
    if (segments.length === 0) {
      return { panel: 'Landing Page', section: '', lesson: '', isExplicit: true };
    }

    return {
      panel: segments[0] ? decodeURIComponent(segments[0]) : 'Landing Page',
      section: segments[1] ? decodeURIComponent(segments[1]) : '',
      lesson: segments[2] ? decodeURIComponent(segments[2]) : '',
      isExplicit: true,
    };
  };

  const initialRoute = parseCurrentUrl();

  // Strict URL priority: If a URL was explicitly provided, ignore localStorage completely.
  const [navPanel, setNavPanel] = useState(() => {
    if (initialRoute.isExplicit) {
      return initialRoute.panel; // Respect whatever is in the URL (Landing Page or subpage)
    }
    // Only fall back to localStorage if they just opened a blank app tab without a typed URL
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

  useFetchData({
    navPanel,
    setTocData,
    setPageElements,
    activeSection,
    setActiveSection,
    activeLesson,
    setActiveLesson,
    setLoading,
  });

  // Listen to manual URL changes or browser back/forward buttons
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let newPath = '/Documentation/';
      if (navPanel && navPanel !== 'Landing Page') {
        newPath += `${encodeURIComponent(navPanel)}`;
        if (activeSection) {
          newPath += `/${encodeURIComponent(activeSection)}`;
          if (activeLesson) {
            newPath += `/${encodeURIComponent(activeLesson)}`;
          }
        }
      }
      // Update browser URL cleanly
      window.history.pushState({ path: newPath }, '', newPath);
    }
  }, [navPanel, activeSection, activeLesson]);

  // Persist navigation and user states to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('last_navPanel', navPanel);
      localStorage.setItem('last_activeSection', activeSection);
      localStorage.setItem('last_activeLesson', activeLesson);

      if (username) {
        localStorage.setItem('user_username', username);
      } else {
        localStorage.removeItem('user_username');
      }

      if (lastName) {
        localStorage.setItem('user_last_name', lastName);
      } else {
        localStorage.removeItem('user_last_name');
      }
    }
  }, [navPanel, activeSection, activeLesson, username, lastName]);

  // Sync pageCredits state safely whenever pageElements updates
  useEffect(() => {
    const creditsElement = pageElements.find((item) => item.type === 'Credits');
    if (creditsElement) {
      const contributors = (creditsElement.text || '').split(', ');
      setPageCredits(contributors);
    } else {
      setPageCredits([]);
    }
  }, [pageElements]);

  const getUserLastName = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbz3b2ncvEKcdHMvsdwukIR9EATgIPZG0pk4ry-NpyIHFYWxZAPqJY1Va9b6vuVuoSf5jw/exec',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'doGetUserLast',
            user: username,
            pass: password,
          }),
        }
      );

      const result = await response.json();

      if (result.status == 'success') {
        setLastName(result.message);
        if (typeof window !== 'undefined' && window.localStorage) {
          setLastName(result.message);
          localStorage.setItem('user_last_name', result.message);
          alert("Last name updated to: " + result.message);
        }
      } else {
        alert('There was an error fetching the users last name!');
      }
    } catch (error) {
      alert(
        'There was an error fetching the users last name! The error was: ' +
        error
      );
    }
  };

  const handleLogin = async () => {
    try {
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbz3b2ncvEKcdHMvsdwukIR9EATgIPZG0pk4ry-NpyIHFYWxZAPqJY1Va9b6vuVuoSf5jw/exec',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            action: 'doTestCredentials',
            user: username,
            pass: password,
          }),
        }
      );

      const result = await response.json();

      if (result.status === 'success') {
        setLoggedIn(true);
        setLoginVisible(false);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('is_logged_in', 'true');
          localStorage.setItem('user_username', username);
        }

        getUserLastName();
      } else {
        alert('Incorrect username or password');
      }
    } catch (error) {
      console.error('Network communication error:', error);
    }
  };

  const handleSave = async (tocOverride = null) => {
    setLoading(true);

    const dataToSave =
      tocOverride && Array.isArray(tocOverride) ? tocOverride : tocData;

    const userCut = username.split(' ');

    const userFullName = `${userCut[0]} ${lastName}`;

    const updatedPageElements = pageElements.map((item) => {
      if (item.type === 'Credits') {
        const existingText = item.text || '';
        // Convert current text to array of trimmed names
        const existingNames = existingText
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean);

        // Check if the user is already listed
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
      const response = await fetch(
        'https://script.google.com/macros/s/AKfycbz3b2ncvEKcdHMvsdwukIR9EATgIPZG0pk4ry-NpyIHFYWxZAPqJY1Va9b6vuVuoSf5jw/exec',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({
            category: navPanel,
            section: activeSection,
            lesson: activeLesson,
            tocData: dataToSave,
            pageElements: updatedPageElements,
          }),
        }
      );

      const result = await response.json();
      if (result.status === 'success') {
        alert('Data saved successfully!');
        setHasSaved(true);

        const cacheKey = `${navPanel}-${activeSection}-${activeLesson}`;
        dataCache.pages[cacheKey] = updatedPageElements;
        if (dataCache.toc[navPanel]) {
          dataCache.toc[navPanel].tocData = dataToSave;
        }
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
    <View style={{ flex: 1, backgroundColor: '#CBD5E1' }}>
      <StatusBar hidden={true} />
      <HeaderNav
        navPanel={navPanel}
        setNavPanel={setNavPanel}
        onSave={() => handleSave()}
        loggedIn={loggedIn}
        setLoggedIn={(val) => {
          setLoggedIn(val);
          if (typeof window !== 'undefined' && window.localStorage) {
            if (val) {
              localStorage.setItem('is_logged_in', 'true');
            } else {
              localStorage.removeItem('is_logged_in');
              localStorage.removeItem('user_username');
              localStorage.removeItem('user_last_name');
              setUsername('');
              setLastName('');
            }
          }
        }}
        onLogin={handleLogin}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        loginVisible={loginVisible}
        setLoginVisible={setLoginVisible}
        lastName={lastName}
      />
      <View
        style={{ flex: 1, flexDirection: 'row', marginTop: 0, paddingTop: 0 }}>
        {navPanel !== 'Landing Page' && navPanel !== 'Test' && (
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
        )}
        {navPanel === 'Landing Page' ? (
          <LandingPage
            setNavPanel={setNavPanel}
          />
        ) : loading ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0)',
            }}>
            <ActivityIndicator size="large" color="#207ADB" />
          </View>
        ) : (
          <ScrollView
            style={styles.Page}
            contentContainerStyle={{ paddingTop: 0, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}>
            {pageElements.length === 0
              ? loggedIn && (
                <View
                  style={{
                    width: '100%',
                    maxWidth: 650,
                    alignSelf: 'flex-start',
                    marginBottom: 20,
                  }}>
                  <AddElementContainer index={-1} onAdd={handleAddElement} />
                </View>
              )
              : pageElements.map((item, index) => {
                let elementComponent = null;
                const isTextPill =
                  item.type.endsWith('Pill') && item.type !== 'VideoPill';
                const isVideo =
                  item.type === 'VideoPill' || item.type === 'Video';
                const isPill = isTextPill || isVideo;

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
                      width: isTextPill ? 650 : '100%',
                      paddingHorizontal: isTextPill ? 0 : 20,
                      alignSelf: 'flex-start',
                      paddingTop: loggedIn ? 8 : 0,
                    }}>
                    {/* Action buttons */}
                    {loggedIn && item.type !== 'Credits' && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 18,
                          right: isPill ? 18 : 38,
                          zIndex: 999,
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

                    {/* Content Container */}
                    <View
                      style={{ marginTop: loggedIn ? 6 : 0, width: '100%' }}>
                      {elementComponent}
                    </View>

                    {/* Add Control Underneath */}
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
        {navPanel === 'Test' && <View />}
      </View>
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
