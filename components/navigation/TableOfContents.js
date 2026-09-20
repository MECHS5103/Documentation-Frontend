import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import styles from '../../styles';

export const SubjectText = ({ text }) => (
  <Text style={styles.SubjectText}>{text}</Text>
);

export const LessonText = ({ text, style }) => (
  <Text style={[styles.LessonText, style]}>{text}</Text>
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
  onSave, // Optional: pass handleSave from App.js if you want it to trigger an immediate network save
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftSubjects, setDraftSubjects] = useState([]);
  const [newSubjectText, setNewSubjectText] = useState('');
  const [addingLessonForSubject, setAddingLessonForSubject] = useState(null);
  const [newLessonText, setNewLessonText] = useState('');

  const displaySubjects = isEditing
    ? draftSubjects
    : parseFlatDataToNested(data);

  const handleStartEdit = () => {
    setDraftSubjects(parseFlatDataToNested(data));
    setIsEditing(true);
  };

  // TableOfContents.js

  const handleSaveEdit = () => {
    const flattened = flattenNestedToFlat(draftSubjects);

    // 1. Update React state
    if (onUpdateTocData) {
      onUpdateTocData(flattened);
    }

    // 2. Immediately send the FRESH flattened array to Google Sheets
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
    <View style={styles.TableOfContents}>
      {/* Header Container */}
      <View style={tocStyles.headerContainer}>
        <Text style={tocStyles.headerTitle}>{currentCategory} - Contents</Text>

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

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}>
        {displaySubjects.map((subject, sIndex) => {
          return (
            <View key={sIndex} style={tocStyles.subjectWrapper}>
              {/* Subject Title & Actions */}
              <View style={tocStyles.itemRow}>
                <View style={{ flex: 1, paddingRight: 4 }}>
                  <SubjectText text={subject.text} />
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

              {/* Add Lesson Input */}
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

              {/* Lessons List */}
              <View style={styles.LessonContainer}>
                {subject.lessons.map((lesson, lIndex) => {
                  const isActive = lesson.text === activeLesson;
                  return (
                    <View key={lIndex} style={tocStyles.itemRow}>
                      <Pressable
                        style={{ flex: 1, paddingRight: 4 }}
                        onPress={() => {
                          if (!isEditing) {
                            onSelectLesson(subject.text, lesson.text);
                          }
                        }}>
                        <LessonText
                          text={lesson.text}
                          style={isActive ? { color: '#207ADB' } : null}
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
                            disabled={lIndex === subject.lessons.length - 1}
                            style={[
                              tocStyles.arrowBtn,
                              lIndex === subject.lessons.length - 1 && {
                                opacity: 0.2,
                              },
                            ]}
                            onPress={() => handleMoveLesson(sIndex, lIndex, 1)}>
                            <Text style={tocStyles.arrowText}>▼</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={tocStyles.deleteBtn}
                            onPress={() => handleDeleteLesson(sIndex, lIndex)}>
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

        {/* Add Section Box */}
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
  );
};

const tocStyles = StyleSheet.create({
  headerContainer: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1E293B',
    marginBottom: 6,
  },
  headerBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  editToggleBtn: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#FED7D7',
    flex: 1,
  },
  doneBtn: {
    backgroundColor: '#207ADB',
    flex: 1,
  },
  editToggleText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#334155',
  },
  subjectWrapper: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 24,
    marginVertical: 2,
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
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
    marginTop: 16,
    paddingTop: 12,
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
