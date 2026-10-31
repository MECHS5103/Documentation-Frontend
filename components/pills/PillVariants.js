import React from 'react';
import { View, Text } from 'react-native';
import Pill from './Pill';
import RichText from '../common/RichText';
import CodePill from './CodePill';

export { CodePill };

export const TipPill = ({ description, onUpdate, setHasSaved, loggedIn }) => (
  <Pill
    header="Tip"
    description={description}
    headerColor="#207ADB"
    fontFamily="Arial"
    backgroundColor="#FFFFFF"
    onUpdate={onUpdate}
    setHasSaved={setHasSaved}
    loggedIn={loggedIn}
  />
);

export const WarningPill = ({
  description,
  style,
  onUpdate,
  setHasSaved,
  loggedIn,
}) => (
  <Pill
    header="Warning"
    description={description}
    headerColor="#F6A053"
    fontFamily="Arial"
    backgroundColor="#FFFFFF"
    style={style}
    onUpdate={onUpdate}
    setHasSaved={setHasSaved}
    loggedIn={loggedIn}
  />
);

export const ImportantPill = ({ description, onUpdate, setHasSaved, loggedIn }) => (
  <Pill
    header="Important"
    description={description}
    headerColor="#1A202C"
    fontFamily="Arial"
    backgroundColor="#FFFFFF"
    onUpdate={onUpdate}
    setHasSaved={setHasSaved}
    loggedIn={loggedIn}
  />
);

export const SuccessPill = ({ description, onUpdate, setHasSaved, loggedIn }) => (
  <Pill
    header="Success"
    description={description}
    headerColor="#2F855A"
    fontFamily="Arial"
    backgroundColor="#FFFFFF"
    onUpdate={onUpdate}
    setHasSaved={setHasSaved}
    loggedIn={loggedIn}
  />
);

// One entry per line, written "Term: meaning" or "Term - meaning". The term is
// shown in bold; lines without a term are shown as they are.
const TERM_LINE = /^\s*([^:\n—–]{1,60}?)\s*(?::|—|–|\s-\s)\s*(\S[\s\S]*)$/;

export const parseVocabulary = (text) =>
  String(text || '')
    .split('\n')
    .map((line) => {
      const m = TERM_LINE.exec(line);
      return m ? { term: m[1], meaning: m[2] } : { term: null, meaning: line };
    });

export const VocabularyPill = ({ description, onUpdate, setHasSaved, loggedIn }) => (
  <Pill
    header="Vocabulary"
    description={description}
    headerColor="#805AD5"
    fontFamily="Arial"
    backgroundColor="#FFFFFF"
    onUpdate={onUpdate}
    setHasSaved={setHasSaved}
    loggedIn={loggedIn}
    hint='One word per line, like "Odometry: tracking where the robot is".'
    renderBody={({ textBody, isEditing, text }) =>
      isEditing ? (
        textBody
      ) : (
        <View style={{ width: '100%' }}>
          {parseVocabulary(text).map((entry, i) => (
            <View key={i} style={{ marginTop: i ? 8 : 0 }}>
              {entry.term ? (
                <Text selectable={!loggedIn} style={{ fontFamily: 'Arial', userSelect: loggedIn ? 'none' : 'text' }}>
                  <Text style={{ fontWeight: 'bold', color: '#553C9A', fontSize: 16 }}>{entry.term}</Text>
                  <Text style={{ color: '#718096' }}>{'  —  '}</Text>
                  <RichText text={entry.meaning} selectable={!loggedIn} />
                </Text>
              ) : (
                <RichText text={entry.meaning} selectable={!loggedIn} style={{ fontFamily: 'Arial', userSelect: loggedIn ? 'none' : 'text' }} />
              )}
            </View>
          ))}
        </View>
      )
    }
  />
);

export const NotePill = ({ description, onUpdate, setHasSaved, loggedIn }) => (
  <Pill
    header="Note"
    description={description}
    headerColor="#0987A0"
    fontFamily="Arial"
    backgroundColor="#FFFFFF"
    onUpdate={onUpdate}
    setHasSaved={setHasSaved}
    loggedIn={loggedIn}
  />
);
