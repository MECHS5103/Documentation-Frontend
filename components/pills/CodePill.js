import React from 'react';
import Pill from './Pill';

// Native fallback (the site itself is web): plain text with the language in the title.
export const CodePill = ({ description, language, onUpdate, setHasSaved, loggedIn }) => (
  <Pill
    header={'Code - ' + (language || 'Java')}
    description={description}
    headerColor="#4A5568"
    fontFamily="monospace"
    backgroundColor="#FFFFFF"
    plain
    onUpdate={onUpdate}
    setHasSaved={setHasSaved}
    loggedIn={loggedIn}
  />
);

export default CodePill;
