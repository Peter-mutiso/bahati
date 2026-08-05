import { useState, useEffect } from 'react';

const SOUND_KEY = 'cycle-race-sound-enabled';

export const useCycleRaceSound = () => {
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem(SOUND_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem(SOUND_KEY, String(isSoundEnabled));
  }, [isSoundEnabled]);

  const toggleSound = () => {
    setIsSoundEnabled(prev => !prev);
  };

  return { isSoundEnabled, setIsSoundEnabled, toggleSound };
};
