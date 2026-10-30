import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import styles from '../../styles';

export const SubjectText = ({ text, isMobile }) => (
  <Text style={isMobile ? styles.SubjectTextMobile : styles.SubjectText}>
    {text}
  </Text>
);

export const LessonText = ({ text, style, isMobile, isActive }) => (
  <Text
    style={[
      styles.LessonText,
      isMobile && styles.LessonTextMobile,
      isMobile && isActive && styles.LessonTextActiveMobile,
      style,
    ]}>
    {text}
  </Text>
);

const parseFlatDataToNested = (flatData = []) => {
  const result = [];
  (flatData || []).forEach((item) => {
    const itemType = item.type ? item.type.toLowerCase() : '';

    if (itemType === 'subjecttext') {
      result.push({
        text: item.text,
        lessons: [],
      });
    } else if (itemType === 'lessontext') {
      if (result.length > 0) {
        result[result.length - 1].lessons.push({
          text: item.text,
        });
      }
    }
  });
  return result;
};

const flattenNestedToFlat = (nestedData = []) => {
  const flat = [];
  nestedData.forEach((subject) => {
    flat.push({ type: 'SubjectText', text: subject.text });
    subject.lessons.forEach((lesson) => {
      flat.push({ type: 'LessonText', text: lesson.text });
    });
  });
  return flat;
};

export const TableOfContents = ({
  data = [],
  currentCategory,
  activeLesson,
  onSelectLesson,
  loggedIn = false,
  onUpdateTocData,
  onSave,
  useBottomToggle = false,
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [isEditing, setIsEditing] = useState(false);
  const [draftSubjects, setDraftSubjects] = useState([]);
  const [newSubjectText, setNewSubjectText] = useState('');
  const [addingLessonForSubject, setAddingLessonForSubject] = useState(null);
  const [newLessonText, setNewLessonText] = useState('');
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const displaySubjects = isEditing
    ? draftSubjects
    : parseFlatDataToNested(data);

  const handleStartEdit = () => {
    setDraftSubjects(parseFlatDataToNested(data));
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const flattened = flattenNestedToFlat(draftSubjects);

    if (onUpdateTocData) {
      onUpdateTocData(flattened);
    }

    if (onSave) {
      onSave(flattened);
    }

    setIsEditing(false);
    setAddingLessonForSubject(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setDraftSubjects([]);
    setAddingLessonForSubject(null);
    setNewSubjectText('');
    setNewLessonText('');
  };

  const handleMoveSubject = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draftSubjects.length) return;

    const updated = [...draftSubjects];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setDraftSubjects(updated);
  };

  const handleMoveLesson = (sIndex, lIndex, direction) => {
    const lessons = draftSubjects[sIndex].lessons;
    const targetIndex = lIndex + direction;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const updatedSubjects = [...draftSubjects];
    const updatedLessons = [...lessons];
    const [moved] = updatedLessons.splice(lIndex, 1);
    updatedLessons.splice(targetIndex, 0, moved);

    updatedSubjects[sIndex] = {
      ...updatedSubjects[sIndex],
      lessons: updatedLessons,
    };
    setDraftSubjects(updatedSubjects);
  };

  const handleAddSubject = () => {
    if (!newSubjectText.trim()) return;
    setDraftSubjects([
      ...draftSubjects,
      { text: newSubjectText.trim(), lessons: [] },
    ]);
    setNewSubjectText('');
  };

  const handleAddLesson = (sIndex) => {
    if (!newLessonText.trim()) return;
    const updatedSubjects = [...draftSubjects];
    updatedSubjects[sIndex] = {
      ...updatedSubjects[sIndex],
      lessons: [
        ...updatedSubjects[sIndex].lessons,
        { text: newLessonText.trim() },
      ],
    };
    setDraftSubjects(updatedSubjects);
    setNewLessonText('');
    setAddingLessonForSubject(null);
  };

  const handleDeleteSubject = (sIndex) => {
    setDraftSubjects(draftSubjects.filter((_, idx) => idx !== sIndex));
  };

  const handleDeleteLesson = (sIndex, lIndex) => {
    const updatedSubjects = [...draftSubjects];
    updatedSubjects[sIndex] = {
      ...updatedSubjects[sIndex],
      lessons: updatedSubjects[sIndex].lessons.filter(
        (_, idx) => idx !== lIndex
      ),
    };
    setDraftSubjects(updatedSubjects);
  };

  return (
    // On desktop the root must fill the sidebar's height; otherwise it grows to
    // fit the whole list and the inner ScrollView never has anything to scroll.
    <View style={[{ width: '100%' }, !isMobile && { flex: 1, minHeight: 0 }]}>
      {/* 1. Mobile Menu Button */}
      {isMobile && !useBottomToggle && (
        <TouchableOpacity
          style={styles.TocToggleBtn}
          activeOpacity={0.8}
          onPress={() => setMobileExpanded(!mobileExpanded)}>
          <Text style={styles.TocToggleText}>≡ Table of Contents</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
            {mobileExpanded ? '▼' : '▲'}
          </Text>
        </TouchableOpacity>
      )}

      {/* 2. TOC Card Container */}
      {(!isMobile || mobileExpanded) && (
        <View
          style={[
            styles.TableOfContents,
            !isMobile && styles.TableOfContentsDesktop,
            isMobile && styles.TableOfContentsMobile,
          ]}>
          {/* Header Row */}
          <View style={tocStyles.headerContainer}>
            {!isMobile && (
              <View style={tocStyles.headerTitleBlock}>
                <Text style={tocStyles.headerEyebrow}>{currentCategory}</Text>
                <Text style={tocStyles.headerTitle}>Contents</Text>
                <View style={tocStyles.headerRule} />
              </View>
            )}

            {loggedIn && (
              <View style={tocStyles.headerBtnRow}>
                {!isEditing ? (
                  <TouchableOpacity
                    style={tocStyles.editToggleBtn}
                    onPress={handleStartEdit}>
                    <Text style={tocStyles.editToggleText}>Edit TOC</Text>
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[tocStyles.editToggleBtn, tocStyles.cancelBtn]}
                      onPress={handleCancelEdit}>
                      <Text
                        style={[tocStyles.editToggleText, { color: '#E53E3E' }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[tocStyles.editToggleBtn, tocStyles.doneBtn]}
                      onPress={handleSaveEdit}>
                      <Text
                        style={[tocStyles.editToggleText, { color: '#FFFFFF' }]}>
                        Done & Save
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>

          {/* 3. Inner List ScrollView */}
          <ScrollView
            nestedScrollEnabled={true}
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, minHeight: 0 }}
            contentContainerStyle={{ paddingBottom: 20 }}>
            {displaySubjects.map((subject, sIndex) => {
              return (
                <View
                  key={sIndex}
                  style={[
                    tocStyles.subjectWrapper,
                    isMobile && styles.SubjectContainerMobile,
                  ]}>
                  <View
                    style={[
                      tocStyles.itemRow,
                      isEditing && tocStyles.itemRowEditing,
                    ]}>
                    <View
                      style={
                        isEditing
                          ? { paddingRight: 4 }
                          : { flex: 1, paddingRight: 4 }
                      }>
                      <SubjectText text={subject.text} isMobile={isMobile} />
                    </View>

                    {isEditing && (
                      <View style={tocStyles.actionGroup}>
                        <TouchableOpacity
                          disabled={sIndex === 0}
                          style={[
                            tocStyles.arrowBtn,
                            sIndex === 0 && { opacity: 0.2 },
                          ]}
                          onPress={() => handleMoveSubject(sIndex, -1)}>
                          <Text style={tocStyles.arrowText}>▲</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={sIndex === displaySubjects.length - 1}
                          style={[
                            tocStyles.arrowBtn,
                            sIndex === displaySubjects.length - 1 && {
                              opacity: 0.2,
                            },
                          ]}
                          onPress={() => handleMoveSubject(sIndex, 1)}>
                          <Text style={tocStyles.arrowText}>▼</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={tocStyles.addLessonSmallBtn}
                          onPress={() => {
                            setAddingLessonForSubject(
                              addingLessonForSubject === sIndex ? null : sIndex
                            );
                            setNewLessonText('');
                          }}>
                          <Text style={tocStyles.addLessonSmallText}>+</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={tocStyles.deleteBtn}
                          onPress={() => handleDeleteSubject(sIndex)}>
                          <Text style={tocStyles.deleteBtnText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {isEditing && addingLessonForSubject === sIndex && (
                    <View style={tocStyles.stackedInputBox}>
                      <TextInput
                        style={tocStyles.textInput}
                        placeholder="Lesson name..."
                        placeholderTextColor="#A0AEC0"
                        value={newLessonText}
                        onChangeText={setNewLessonText}
                      />
                      <TouchableOpacity
                        style={tocStyles.fullWidthAddBtn}
                        onPress={() => handleAddLesson(sIndex)}>
                        <Text style={tocStyles.addBtnText}>+ Add Lesson</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <View
                    style={[
                      styles.LessonContainer,
                      isMobile && styles.LessonContainerMobile,
                    ]}>
                    {subject.lessons.map((lesson, lIndex) => {
                      const isActive = lesson.text === activeLesson;
                      return (
                        <View
                          key={lIndex}
                          style={[
                            tocStyles.itemRow,
                            isEditing && tocStyles.itemRowEditing,
                          ]}>
                          <Pressable
                            style={({ hovered, pressed }) => [
                              isEditing ? null : { flex: 1 },
                              !isMobile && tocStyles.lessonRow,
                              !isMobile &&
                                !isActive &&
                                (hovered || pressed) &&
                                tocStyles.lessonRowHover,
                              !isMobile && isActive && tocStyles.lessonRowActive,
                              isMobile && styles.LessonItemPillMobile,
                              isMobile &&
                                isActive &&
                                styles.LessonItemPillActiveMobile,
                            ]}
                            onPress={() => {
                              if (!isEditing) {
                                onSelectLesson(subject.text, lesson.text);
                                if (isMobile) setMobileExpanded(false);
                              }
                            }}>
                            <LessonText
                              text={lesson.text}
                              isMobile={isMobile}
                              isActive={isActive}
                              style={
                                isMobile
                                  ? null
                                  : isActive
                                    ? tocStyles.lessonTextActive
                                    : tocStyles.lessonText
                              }
                            />
                          </Pressable>

                          {isEditing && (
                            <View style={tocStyles.actionGroup}>
                              <TouchableOpacity
                                disabled={lIndex === 0}
                                style={[
                                  tocStyles.arrowBtn,
                                  lIndex === 0 && { opacity: 0.2 },
                                ]}
                                onPress={() =>
                                  handleMoveLesson(sIndex, lIndex, -1)
                                }>
                                <Text style={tocStyles.arrowText}>▲</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                disabled={
                                  lIndex === subject.lessons.length - 1
                                }
                                style={[
                                  tocStyles.arrowBtn,
                                  lIndex === subject.lessons.length - 1 && {
                                    opacity: 0.2,
                                  },
                                ]}
                                onPress={() =>
                                  handleMoveLesson(sIndex, lIndex, 1)
                                }>
                                <Text style={tocStyles.arrowText}>▼</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={tocStyles.deleteBtn}
                                onPress={() =>
                                  handleDeleteLesson(sIndex, lIndex)
                                }>
                                <Text style={tocStyles.deleteBtnText}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {isEditing && (
              <View style={tocStyles.addSectionBox}>
                <TextInput
                  style={tocStyles.textInput}
                  placeholder="New section name..."
                  placeholderTextColor="#A0AEC0"
                  value={newSubjectText}
                  onChangeText={setNewSubjectText}
                />
                <TouchableOpacity
                  style={tocStyles.fullWidthAddBtn}
                  onPress={handleAddSubject}>
                  <Text style={tocStyles.addBtnText}>+ Add Section</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const tocStyles = StyleSheet.create({
  headerContainer: {
    marginBottom: 8,
    paddingBottom: 4,
  },
  headerTitleBlock: {
    marginBottom: 8,
  },
  headerEyebrow: {
    fontFamily: 'Chewy',
    fontSize: 13,
    color: '#207ADB',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: 'Chewy',
    fontSize: 26,
    lineHeight: 28,
    color: '#1A202C',
  },
  headerRule: {
    marginTop: 4,
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#207ADB',
  },
  lessonRow: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginVertical: 1,
  },
  lessonRowHover: {
    backgroundColor: '#E8F1FC',
  },
  lessonRowActive: {
    backgroundColor: '#207ADB',
    borderColor: '#1A202C',
    borderBottomWidth: 4,
  },
  lessonText: {
    fontSize: 13,
    color: '#2D3748',
    marginBottom: 0,
  },
  lessonTextActive: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 0,
  },
  headerBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  editToggleBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#FED7D7',
    flexGrow: 1,
    minWidth: 100,
  },
  doneBtn: {
    backgroundColor: '#207ADB',
    flexGrow: 1,
    minWidth: 100,
  },
  editToggleText: {
    fontFamily: 'Chewy',
    fontSize: 13,
    color: '#1A202C',
  },
  subjectWrapper: {
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
    marginVertical: 2,
  },
  // While editing, the controls sit under each name instead of beside it, so
  // narrow sidebar text is not squeezed into breaking mid-word.
  itemRowEditing: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 4,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 2,
    marginLeft: 6,
  },
  arrowBtn: {
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  arrowText: {
    fontSize: 9,
    color: '#475569',
    fontWeight: 'bold',
  },
  addLessonSmallBtn: {
    backgroundColor: '#EBF8FF',
    borderColor: '#3182CE',
    borderWidth: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  addLessonSmallText: {
    color: '#3182CE',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  deleteBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  deleteBtnText: {
    color: '#E53E3E',
    fontWeight: 'bold',
    fontSize: 11,
  },
  stackedInputBox: {
    marginTop: 6,
    marginBottom: 8,
    gap: 4,
  },
  addSectionBox: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#CBD5E1',
    gap: 6,
  },
  textInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
  },
  fullWidthAddBtn: {
    width: '100%',
    backgroundColor: '#207ADB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
    borderRadius: 4,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default TableOfContents;