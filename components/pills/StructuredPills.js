import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import styles from '../../styles';
import AutoGrowTextInput from '../common/AutoGrowTextInput';
import RichText from '../common/RichText';
import Pill from './Pill';

// --- Shared bits ------------------------------------------------------------

const EditButton = ({ editing, onPress }) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    style={({ hovered }) => ({
      borderWidth: 2,
      borderColor: '#1A202C',
      borderRadius: 999,
      paddingHorizontal: 10,
      height: 22,
      justifyContent: 'center',
      backgroundColor: editing ? '#207ADB' : hovered ? '#EDF2F7' : '#FFFFFF',
      marginRight: 6,
      cursor: 'pointer',
    })}>
    <Text selectable={false} style={{ fontFamily: 'Chewy', fontSize: 13, color: editing ? '#FFFFFF' : '#1A202C', userSelect: 'none' }}>
      {editing ? 'Done' : 'Edit'}
    </Text>
  </Pressable>
);

const Hint = ({ children }) => (
  <Text selectable={false} style={{ fontFamily: 'Arial', fontSize: 12, color: '#718096', marginTop: 4 }}>
    {children}
  </Text>
);

// Keeps the text for one structured pill and a simple Edit / Done switch.
const useStructured = (description, onUpdate, setHasSaved, loggedIn) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(description || '');
  useEffect(() => {
    setText(description || '');
  }, [description]);
  useEffect(() => {
    if (!loggedIn) setEditing(false);
  }, [loggedIn]);
  const change = (value) => {
    setText(value);
    if (setHasSaved) setHasSaved(false);
    if (onUpdate) onUpdate(value);
  };
  return { editing, setEditing, text, change };
};

const Editor = ({ value, onChange, placeholder, hint, onDone }) => (
  <View style={{ width: '100%' }}>
    <AutoGrowTextInput
      style={[styles.PillDescriptionText, styles.ActiveInput, { fontFamily: 'Arial', width: '100%' }]}
      value={value}
      placeholder={placeholder}
      onChangeText={onChange}
      onBlur={onDone}
      autoFocus
    />
    {hint ? <Hint>{hint}</Hint> : null}
  </View>
);

const bodyText = (extra) => [styles.PillDescriptionText, { fontFamily: 'Arial' }, extra];

// --- Checklist ---------------------------------------------------------------

const ITEM = /^\s*(?:[-*]\s*)?\[( |x|X)\]\s?(.*)$/;

export const parseChecklist = (text) =>
  String(text || '')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const m = ITEM.exec(line);
      if (m) return { done: m[1] !== ' ', label: m[2] };
      return { done: false, label: line.replace(/^\s*[-*]\s+/, '').trim() };
    });

export const writeChecklist = (items) => items.map((i) => `[${i.done ? 'x' : ' '}] ${i.label}`).join('\n');

export const ChecklistPill = ({ description, onUpdate, setHasSaved, loggedIn }) => {
  const { editing, setEditing, text, change } = useStructured(description, onUpdate, setHasSaved, loggedIn);
  const items = parseChecklist(text);
  // Visitors can tick items for themselves; only editors change what is saved.
  const [mine, setMine] = useState({});
  useEffect(() => setMine({}), [text]);

  const isDone = (item, i) => (loggedIn ? item.done : mine[i] !== undefined ? mine[i] : item.done);
  const toggle = (i) => {
    if (loggedIn) change(writeChecklist(items.map((it, j) => (j === i ? { ...it, done: !it.done } : it))));
    else setMine({ ...mine, [i]: !isDone(items[i], i) });
  };
  const doneCount = items.filter((it, i) => isDone(it, i)).length;

  return (
    <Pill
      header="Checklist"
      headerColor="#D53F8C"
      backgroundColor="#FFFFFF"
      fontFamily="Arial"
      description={text}
      copyText={items.map((it, i) => `- [${isDone(it, i) ? 'x' : ' '}] ${it.label}`).join('\n')}
      loggedIn={loggedIn}
      headerRight={
        <>
          {items.length > 0 && !editing && (
            <Text selectable={false} style={{ fontFamily: 'Chewy', fontSize: 13, color: '#4A5568', marginRight: 8 }}>
              {doneCount} / {items.length}
            </Text>
          )}
          {loggedIn && <EditButton editing={editing} onPress={() => setEditing(!editing)} />}
        </>
      }
      renderBody={() =>
        editing ? (
          <Editor
            value={text}
            onChange={change}
            onDone={() => {}}
            placeholder="One item per line"
            hint="One item per line. Start a line with [x] to mark it done."
          />
        ) : (
          <View style={{ width: '100%' }}>
            {items.length === 0 && (
              <Text selectable={false} style={bodyText({ color: '#718096' })}>
                {loggedIn ? 'Press Edit to add items.' : 'Nothing here yet.'}
              </Text>
            )}
            {items.map((item, i) => {
              const done = isDone(item, i);
              return (
                <Pressable
                  key={i}
                  onPress={() => toggle(i)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4, cursor: 'pointer' }}>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: '#1A202C',
                      backgroundColor: done ? '#D53F8C' : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 10,
                      marginTop: 1,
                    }}>
                    {done ? <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: 'bold', lineHeight: 15 }}>✓</Text> : null}
                  </View>
                  <RichText
                    text={item.label}
                    selectable={false}
                    style={bodyText({ flex: 1, textDecorationLine: done ? 'line-through' : 'none', color: done ? '#718096' : '#1A202C' })}
                  />
                </Pressable>
              );
            })}
          </View>
        )
      }
    />
  );
};

// --- Steps ---------------------------------------------------------------------

export const parseSteps = (text) =>
  String(text || '')
    .split('\n')
    .map((line) => line.replace(/^\s*(?:\d+[.)]|[-*])\s+/, '').trim())
    .filter(Boolean);

export const StepsPill = ({ description, onUpdate, setHasSaved, loggedIn }) => {
  const { editing, setEditing, text, change } = useStructured(description, onUpdate, setHasSaved, loggedIn);
  const steps = parseSteps(text);
  return (
    <Pill
      header="Steps"
      headerColor="#B7791F"
      backgroundColor="#FFFFFF"
      fontFamily="Arial"
      description={text}
      copyText={steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}
      loggedIn={loggedIn}
      headerRight={loggedIn ? <EditButton editing={editing} onPress={() => setEditing(!editing)} /> : null}
      renderBody={() =>
        editing ? (
          <Editor value={text} onChange={change} onDone={() => {}} placeholder="One step per line" hint="One step per line. The numbers are added for you." />
        ) : (
          <View style={{ width: '100%' }}>
            {steps.length === 0 && (
              <Text selectable={false} style={bodyText({ color: '#718096' })}>
                {loggedIn ? 'Press Edit to add steps.' : 'Nothing here yet.'}
              </Text>
            )}
            {steps.map((step, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 }}>
                <View style={{ alignItems: 'center', marginRight: 12 }}>
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 13,
                      backgroundColor: '#B7791F',
                      borderWidth: 2,
                      borderColor: '#1A202C',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Text selectable={false} style={{ fontFamily: 'Chewy', fontSize: 14, color: '#FFFFFF' }}>{i + 1}</Text>
                  </View>
                  {i < steps.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 8, backgroundColor: '#D69E2E', marginTop: 2 }} />}
                </View>
                <RichText text={step} selectable={!loggedIn} style={bodyText({ flex: 1, paddingTop: 3 })} />
              </View>
            ))}
          </View>
        )
      }
    />
  );
};

// --- Resource link -----------------------------------------------------------------

const isWebUrl = (value) => /^https?:\/\/\S+$/i.test(String(value || '').trim());

export const parseLink = (text) => {
  const lines = String(text || '').split('\n');
  return {
    title: (lines[0] || '').trim(),
    url: (lines[1] || '').trim(),
    note: lines.slice(2).join('\n').trim(),
  };
};

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    return '';
  }
};

export const LinkPill = ({ description, onUpdate, setHasSaved, loggedIn }) => {
  const { editing, setEditing, text, change } = useStructured(description, onUpdate, setHasSaved, loggedIn);
  const link = parseLink(text);
  const ok = isWebUrl(link.url);
  return (
    <Pill
      header="Resource"
      headerColor="#4C51BF"
      backgroundColor="#FFFFFF"
      fontFamily="Arial"
      description={text}
      copyText={ok ? link.url : text}
      loggedIn={loggedIn}
      headerRight={loggedIn ? <EditButton editing={editing} onPress={() => setEditing(!editing)} /> : null}
      renderBody={() =>
        editing ? (
          <Editor
            value={text}
            onChange={change}
            onDone={() => {}}
            placeholder={'Title\nhttps://link\nShort description'}
            hint="Line 1: the title. Line 2: the link (https://…). After that: a short description."
          />
        ) : (
          <View style={{ width: '100%' }}>
            <Text selectable={!loggedIn} style={bodyText({ fontWeight: 'bold', fontSize: 17, color: '#2D3748' })}>
              {link.title || 'Untitled resource'}
            </Text>
            {ok && (
              <Text selectable={false} style={bodyText({ fontSize: 12, color: '#718096', marginTop: 2 })}>
                {hostOf(link.url)}
              </Text>
            )}
            {link.note ? <RichText text={link.note} selectable={!loggedIn} style={bodyText({ marginTop: 8 })} /> : null}
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              {ok ? (
                <Text
                  accessibilityRole="link"
                  href={link.url}
                  hrefAttrs={{ target: '_blank', rel: 'noopener noreferrer' }}
                  style={{
                    fontFamily: 'Chewy',
                    fontSize: 15,
                    color: '#FFFFFF',
                    backgroundColor: '#4C51BF',
                    borderWidth: 2,
                    borderColor: '#1A202C',
                    borderBottomWidth: 4,
                    borderRadius: 999,
                    paddingHorizontal: 16,
                    paddingVertical: 4,
                    overflow: 'hidden',
                  }}>
                  Open link ↗
                </Text>
              ) : (
                <Text selectable={false} style={bodyText({ color: '#C53030', fontSize: 13 })}>
                  {loggedIn ? 'Press Edit and put a link starting with https:// on line 2.' : 'No link has been added yet.'}
                </Text>
              )}
            </View>
          </View>
        )
      }
    />
  );
};

// --- Image ---------------------------------------------------------------------------

export const parseImage = (text) => {
  const lines = String(text || '').split('\n');
  return { url: (lines[0] || '').trim(), caption: lines.slice(1).join('\n').trim() };
};

export const ImagePill = ({ description, onUpdate, setHasSaved, loggedIn }) => {
  const { editing, setEditing, text, change } = useStructured(description, onUpdate, setHasSaved, loggedIn);
  const { url, caption } = parseImage(text);
  const ok = /^https:\/\/\S+$/i.test(url);
  const [ratio, setRatio] = useState(16 / 9);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    if (!ok) return;
    Image.getSize(
      url,
      (w, h) => {
        if (w > 0 && h > 0) setRatio(w / h);
      },
      () => {}
    );
  }, [url, ok]);

  return (
    <Pill
      header="Image"
      headerColor="#2C7A7B"
      backgroundColor="#FFFFFF"
      fontFamily="Arial"
      description={text}
      copyText={ok ? url : text}
      loggedIn={loggedIn}
      headerRight={loggedIn ? <EditButton editing={editing} onPress={() => setEditing(!editing)} /> : null}
      renderBody={() =>
        editing ? (
          <Editor
            value={text}
            onChange={change}
            onDone={() => {}}
            placeholder={'https://example.com/photo.jpg\nCaption'}
            hint="Line 1: the picture's link (https://…). After that: a caption."
          />
        ) : (
          <View style={{ width: '100%', alignItems: 'center' }}>
            {ok && !failed ? (
              <Image
                source={{ uri: url }}
                accessibilityLabel={caption || 'Image'}
                resizeMode="contain"
                onError={() => setFailed(true)}
                style={{ width: '100%', aspectRatio: ratio, maxHeight: 460, borderRadius: 10, backgroundColor: '#EDF2F7' }}
              />
            ) : (
              <View style={{ width: '100%', minHeight: 90, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: '#A0AEC0', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
                <Text selectable={false} style={bodyText({ color: '#718096', textAlign: 'center' })}>
                  {failed
                    ? 'This picture could not be loaded. Check the link.'
                    : loggedIn
                      ? 'Press Edit and paste a picture link starting with https://'
                      : 'No picture has been added yet.'}
                </Text>
              </View>
            )}
            {caption ? <RichText text={caption} selectable={!loggedIn} style={bodyText({ marginTop: 8, fontStyle: 'italic', color: '#4A5568', textAlign: 'center' })} /> : null}
          </View>
        )
      }
    />
  );
};
