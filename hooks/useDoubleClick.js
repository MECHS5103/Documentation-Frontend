import { useState } from 'react';

export const useDoubleClick = (onDoubleClick, delay = 300) => {
  const [lastPress, setLastPress] = useState(0);

  const handlePress = () => {
    const now = Date.now();
    if (now - lastPress < delay) {
      onDoubleClick();
    }
    setLastPress(now);
  };

  return handlePress;
};

export default useDoubleClick;