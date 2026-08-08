import { useEffect, useRef, useState } from 'react';

export const useGameSounds = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('gameVolume');
    return saved ? parseFloat(saved) : 0.5;
  });

  useEffect(() => {
    // Browsers refuse to start an AudioContext outside a user gesture and
    // log "The AudioContext was not allowed to start..." if we try anyway.
    // Every play* function below already no-ops when audioContextRef.current
    // is null, so instead of creating the context eagerly on mount, create
    // it lazily on the page's first real interaction.
    const ensureAudioContext = () => {
      if (!audioContextRef.current) {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextCtor();
      } else if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    };

    window.addEventListener('pointerdown', ensureAudioContext);
    window.addEventListener('keydown', ensureAudioContext);

    return () => {
      window.removeEventListener('pointerdown', ensureAudioContext);
      window.removeEventListener('keydown', ensureAudioContext);
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('gameVolume', volume.toString());
  }, [volume]);

  // Listen for storage changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gameVolume' && e.newValue !== null) {
        setVolume(parseFloat(e.newValue));
      }
    };

    // Also listen for custom events within the same tab
    const handleVolumeChange = (e: CustomEvent) => {
      const newVolume = parseFloat(localStorage.getItem('gameVolume') || '0.5');
      setVolume(newVolume);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('volumeChanged' as any, handleVolumeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('volumeChanged' as any, handleVolumeChange);
    };
  }, []);

  const playSound = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!audioContextRef.current || volume === 0) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(volume * 0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  };

  const playBetPlaced = () => {
    playSound(800, 0.1, 'sine');
    setTimeout(() => playSound(1000, 0.1, 'sine'), 50);
  };

  const playCashout = () => {
    playSound(600, 0.15, 'sine');
    setTimeout(() => playSound(800, 0.15, 'sine'), 80);
    setTimeout(() => playSound(1200, 0.2, 'sine'), 160);
  };

  const playCrash = () => {
    if (!audioContextRef.current || volume === 0) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContextRef.current.currentTime + 0.5);
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(volume * 0.4, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.5);
  };

  const playPlinkoPegHit = () => {
    playSound(600 + Math.random() * 200, 0.05, 'sine');
  };

  const playPlinkoSlotLand = (multiplier: number) => {
    if (multiplier >= 10) {
      // High multiplier - exciting sound
      playSound(1200, 0.2, 'sine');
      setTimeout(() => playSound(1400, 0.2, 'sine'), 100);
      setTimeout(() => playSound(1600, 0.3, 'sine'), 200);
    } else if (multiplier >= 2) {
      // Medium multiplier
      playSound(800, 0.2, 'sine');
      setTimeout(() => playSound(1000, 0.2, 'sine'), 100);
    } else {
      // Low multiplier
      playSound(400, 0.15, 'sine');
    }
  };

  const playPlinkoDrop = () => {
    playSound(500, 0.1, 'sine');
  };

  const playCycleRaceStart = () => {
    // Starting horn/whistle sound
    playSound(800, 0.3, 'square');
    setTimeout(() => playSound(1000, 0.2, 'square'), 150);
    setTimeout(() => playSound(1200, 0.4, 'square'), 300);
  };

  const playCycleRaceWhistle = () => {
    if (!audioContextRef.current || volume === 0) return;

    // Sharp referee whistle - high frequency two-tone
    const oscillator1 = audioContextRef.current.createOscillator();
    const oscillator2 = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    // Whistle frequencies (high-pitched)
    oscillator1.frequency.setValueAtTime(2800, audioContextRef.current.currentTime);
    oscillator1.frequency.setValueAtTime(3200, audioContextRef.current.currentTime + 0.15);
    oscillator1.frequency.setValueAtTime(2800, audioContextRef.current.currentTime + 0.3);
    
    oscillator2.frequency.setValueAtTime(3500, audioContextRef.current.currentTime);
    oscillator2.frequency.setValueAtTime(3800, audioContextRef.current.currentTime + 0.15);
    oscillator2.frequency.setValueAtTime(3500, audioContextRef.current.currentTime + 0.3);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';

    // Sharp attack, hold, decay
    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * 0.5, audioContextRef.current.currentTime + 0.02);
    gainNode.gain.setValueAtTime(volume * 0.5, audioContextRef.current.currentTime + 0.4);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.6);

    oscillator1.start(audioContextRef.current.currentTime);
    oscillator2.start(audioContextRef.current.currentTime);
    oscillator1.stop(audioContextRef.current.currentTime + 0.6);
    oscillator2.stop(audioContextRef.current.currentTime + 0.6);
  };

  const playCycleRacing = () => {
    if (!audioContextRef.current || volume === 0) return;

    // Cycling pedaling rhythm sound
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.setValueAtTime(150, audioContextRef.current.currentTime);
    oscillator.frequency.linearRampToValueAtTime(200, audioContextRef.current.currentTime + 0.1);
    oscillator.type = 'triangle';

    gainNode.gain.setValueAtTime(volume * 0.15, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.15);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.15);
  };

  const playCycleWinnerCelebration = () => {
    // Triumphant fanfare
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => playSound(freq, 0.3, 'sine'), i * 100);
    });
    // Victory chime
    setTimeout(() => {
      playSound(1318, 0.5, 'sine');
      setTimeout(() => playSound(1568, 0.6, 'sine'), 150);
    }, 500);
  };

  // Coin Flip sounds
  const playCoinFlipSpin = () => {
    if (!audioContextRef.current || volume === 0) return;

    // Whooshing spinning sound
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.setValueAtTime(300, audioContextRef.current.currentTime);
    oscillator.frequency.linearRampToValueAtTime(600, audioContextRef.current.currentTime + 0.1);
    oscillator.frequency.linearRampToValueAtTime(300, audioContextRef.current.currentTime + 0.2);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(volume * 0.2, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.2);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.2);
  };

  const playCoinFlipResult = (isWinner: boolean) => {
    if (isWinner) {
      // Winner celebration - ascending triumphant notes
      const notes = [523, 659, 784, 1047, 1318]; // C5, E5, G5, C6, E6
      notes.forEach((freq, i) => {
        setTimeout(() => playSound(freq, 0.25, 'sine'), i * 80);
      });
      // Final chord
      setTimeout(() => {
        playSound(1047, 0.4, 'sine');
        playSound(1318, 0.4, 'sine');
        playSound(1568, 0.5, 'sine');
      }, 450);
    } else {
      // Loss sound - descending notes
      playSound(400, 0.2, 'sine');
      setTimeout(() => playSound(300, 0.3, 'sine'), 100);
    }
  };

  const playCoinFlipBet = () => {
    // Coin drop/bet placed sound
    playSound(600, 0.08, 'sine');
    setTimeout(() => playSound(800, 0.08, 'sine'), 40);
    setTimeout(() => playSound(1000, 0.1, 'sine'), 80);
  };

  // Coin Train sounds
  const playTrainBell = () => {
    if (!audioContextRef.current || volume === 0) return;

    // Classic train bell - metallic ring
    const oscillator1 = audioContextRef.current.createOscillator();
    const oscillator2 = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    // Bell frequencies (metallic overtones)
    oscillator1.frequency.value = 880; // A5
    oscillator2.frequency.value = 1760; // A6 overtone
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';

    // Bell envelope - sharp attack, slow decay
    gainNode.gain.setValueAtTime(volume * 0.35, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.4);

    oscillator1.start(audioContextRef.current.currentTime);
    oscillator2.start(audioContextRef.current.currentTime);
    oscillator1.stop(audioContextRef.current.currentTime + 0.4);
    oscillator2.stop(audioContextRef.current.currentTime + 0.4);
  };

  const playTrainWhistle = () => {
    if (!audioContextRef.current || volume === 0) return;

    // Classic train whistle - two-tone chord
    const oscillator1 = audioContextRef.current.createOscillator();
    const oscillator2 = audioContextRef.current.createOscillator();
    const gainNode1 = audioContextRef.current.createGain();
    const gainNode2 = audioContextRef.current.createGain();

    oscillator1.connect(gainNode1);
    oscillator2.connect(gainNode2);
    gainNode1.connect(audioContextRef.current.destination);
    gainNode2.connect(audioContextRef.current.destination);

    // Train whistle frequencies (F# and A# chord - classic steam whistle)
    oscillator1.frequency.setValueAtTime(370, audioContextRef.current.currentTime);
    oscillator1.frequency.setValueAtTime(392, audioContextRef.current.currentTime + 0.1);
    oscillator2.frequency.setValueAtTime(466, audioContextRef.current.currentTime);
    oscillator2.frequency.setValueAtTime(494, audioContextRef.current.currentTime + 0.1);
    
    oscillator1.type = 'sine';
    oscillator2.type = 'sine';

    // Long whistle with swell
    gainNode1.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    gainNode1.gain.linearRampToValueAtTime(volume * 0.4, audioContextRef.current.currentTime + 0.1);
    gainNode1.gain.setValueAtTime(volume * 0.4, audioContextRef.current.currentTime + 0.6);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.9);

    gainNode2.gain.setValueAtTime(0, audioContextRef.current.currentTime);
    gainNode2.gain.linearRampToValueAtTime(volume * 0.3, audioContextRef.current.currentTime + 0.1);
    gainNode2.gain.setValueAtTime(volume * 0.3, audioContextRef.current.currentTime + 0.6);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.9);

    oscillator1.start(audioContextRef.current.currentTime);
    oscillator2.start(audioContextRef.current.currentTime);
    oscillator1.stop(audioContextRef.current.currentTime + 0.9);
    oscillator2.stop(audioContextRef.current.currentTime + 0.9);
  };

  const playTrainSteam = () => {
    if (!audioContextRef.current || volume === 0) return;

    // Steam chug sound using noise
    const bufferSize = audioContextRef.current.sampleRate * 0.15;
    const noiseBuffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioContextRef.current.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Bandpass filter to shape the steam sound
    const bandpass = audioContextRef.current.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 800 + Math.random() * 400;
    bandpass.Q.value = 1;

    const gainNode = audioContextRef.current.createGain();

    whiteNoise.connect(bandpass);
    bandpass.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    gainNode.gain.setValueAtTime(volume * 0.15, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.15);

    whiteNoise.start(audioContextRef.current.currentTime);
    whiteNoise.stop(audioContextRef.current.currentTime + 0.15);
  };

  const playTrainHighSpeed = () => {
    if (!audioContextRef.current || volume === 0) return;

    // Intense steam release for high multipliers
    const bufferSize = audioContextRef.current.sampleRate * 0.25;
    const noiseBuffer = audioContextRef.current.createBuffer(1, bufferSize, audioContextRef.current.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = audioContextRef.current.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const highpass = audioContextRef.current.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 2000;

    const gainNode = audioContextRef.current.createGain();

    whiteNoise.connect(highpass);
    highpass.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    gainNode.gain.setValueAtTime(volume * 0.2, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.25);

    whiteNoise.start(audioContextRef.current.currentTime);
    whiteNoise.stop(audioContextRef.current.currentTime + 0.25);

    // Add whistle undertone
    const oscillator = audioContextRef.current.createOscillator();
    const oscGain = audioContextRef.current.createGain();
    oscillator.connect(oscGain);
    oscGain.connect(audioContextRef.current.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
    oscillator.frequency.linearRampToValueAtTime(1200, audioContextRef.current.currentTime + 0.15);
    oscillator.type = 'sine';
    
    oscGain.gain.setValueAtTime(volume * 0.1, audioContextRef.current.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.2);
    
    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.2);
  };

  // Mines game sounds
  const playGemReveal = () => {
    // Crystal-like sparkle sound
    const frequencies = [1000, 1200, 1400, 1600, 1800];
    frequencies.forEach((freq, i) => {
      setTimeout(() => {
        playSound(freq, 0.08, 'sine');
      }, i * 20);
    });
  };

  const playMineExplosion = () => {
    if (!audioContextRef.current || volume === 0) return;

    // Deep explosive boom with rumble
    const oscillator1 = audioContextRef.current.createOscillator();
    const oscillator2 = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    // Deep bass frequencies
    oscillator1.frequency.setValueAtTime(150, audioContextRef.current.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(30, audioContextRef.current.currentTime + 0.4);
    oscillator2.frequency.setValueAtTime(80, audioContextRef.current.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(20, audioContextRef.current.currentTime + 0.4);
    
    oscillator1.type = 'sawtooth';
    oscillator2.type = 'square';

    gainNode.gain.setValueAtTime(volume * 0.5, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.4);

    oscillator1.start(audioContextRef.current.currentTime);
    oscillator2.start(audioContextRef.current.currentTime);
    oscillator1.stop(audioContextRef.current.currentTime + 0.4);
    oscillator2.stop(audioContextRef.current.currentTime + 0.4);

    // Add noise for explosion texture
    setTimeout(() => {
      const bufferSize = audioContextRef.current!.sampleRate * 0.3;
      const noiseBuffer = audioContextRef.current!.createBuffer(1, bufferSize, audioContextRef.current!.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = audioContextRef.current!.createBufferSource();
      whiteNoise.buffer = noiseBuffer;

      const filter = audioContextRef.current!.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 500;

      const noiseGain = audioContextRef.current!.createGain();
      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(audioContextRef.current!.destination);

      noiseGain.gain.setValueAtTime(volume * 0.3, audioContextRef.current!.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current!.currentTime + 0.3);

      whiteNoise.start(audioContextRef.current!.currentTime);
      whiteNoise.stop(audioContextRef.current!.currentTime + 0.3);
    }, 50);
  };

  const playMinesCashout = () => {
    // Triumphant gem collection sound
    const notes = [659, 784, 988, 1318]; // E5, G5, B5, E6 - major chord
    notes.forEach((freq, i) => {
      setTimeout(() => playSound(freq, 0.25, 'sine'), i * 70);
    });
    
    // Sparkle overlay
    setTimeout(() => {
      [1400, 1600, 1800, 2000, 2200].forEach((freq, i) => {
        setTimeout(() => playSound(freq, 0.12, 'sine'), i * 30);
      });
    }, 200);
  };

  const playTileHover = () => {
    // Subtle hover feedback
    playSound(600 + Math.random() * 100, 0.03, 'sine');
  };

  return {
    volume,
    setVolume,
    playBetPlaced,
    playCashout,
    playCrash,
    playPlinkoPegHit,
    playPlinkoSlotLand,
    playPlinkoDrop,
    playCycleRaceStart,
    playCycleRaceWhistle,
    playCycleRacing,
    playCycleWinnerCelebration,
    playCoinFlipSpin,
    playCoinFlipResult,
    playCoinFlipBet,
    playTrainBell,
    playTrainWhistle,
    playTrainSteam,
    playTrainHighSpeed,
    playGemReveal,
    playMineExplosion,
    playMinesCashout,
    playTileHover,
  };
};
