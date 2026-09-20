import React from 'react';
import Pill from './Pill';

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

export const CodePill = ({
  description,
  language,
  onUpdate,
  setHasSaved,
  loggedIn,
}) => (
  <Pill
    header={'Code - ' + language}
    description={description}
    headerColor="#4A5568"
    fontFamily="Cascadia Code"
    backgroundColor="#FFFFFF"
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
  />
);