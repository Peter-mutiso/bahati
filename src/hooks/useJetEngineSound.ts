import { useEffect, useRef, useCallback, useState } from 'react';

interface JetEngineSoundOptions {
  isFlying: boolean;
  isPreparing: boolean;
  crashed: boolean;
  intensity?: number; // 0-1
}

export const useJetEngineSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<{
    lowOsc: OscillatorNode | null;
    midOsc: OscillatorNode | null;
    highOsc: OscillatorNode | null;
    noiseSource: AudioBufferSourceNode | null;
    lowGain: GainNode | null;
    midGain: GainNode | null;
    highGain: GainNode | null;
    noiseGain: GainNode | null;
    masterGain: GainNode | null;
    lowFilter: BiquadFilterNode | null;
    highFilter: BiquadFilterNode | null;
  }>({
    lowOsc: null,
    midOsc: null,
    highOsc: null,
    noiseSource: null,
    lowGain: null,
    midGain: null,
    highGain: null,
    noiseGain: null,
    masterGain: null,
    lowFilter: null,
    highFilter: null,
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const intensityRef = useRef(0);

  // Create white noise buffer
  const createNoiseBuffer = useCallback((audioContext: AudioContext) => {
    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    return buffer;
  }, []);

  const startEngine = useCallback(async () => {
    if (isPlaying || isMuted) return;

    try {
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Create master gain
      const masterGain = audioContext.createGain();
      masterGain.gain.value = 0;
      masterGain.connect(audioContext.destination);
      nodesRef.current.masterGain = masterGain;

      // Low frequency rumble (turbine core)
      const lowOsc = audioContext.createOscillator();
      lowOsc.type = 'sawtooth';
      lowOsc.frequency.value = 80;
      const lowGain = audioContext.createGain();
      lowGain.gain.value = 0.3;
      const lowFilter = audioContext.createBiquadFilter();
      lowFilter.type = 'lowpass';
      lowFilter.frequency.value = 200;
      lowOsc.connect(lowFilter);
      lowFilter.connect(lowGain);
      lowGain.connect(masterGain);
      nodesRef.current.lowOsc = lowOsc;
      nodesRef.current.lowGain = lowGain;
      nodesRef.current.lowFilter = lowFilter;

      // Mid frequency whine (compressor)
      const midOsc = audioContext.createOscillator();
      midOsc.type = 'sine';
      midOsc.frequency.value = 400;
      const midGain = audioContext.createGain();
      midGain.gain.value = 0.15;
      midOsc.connect(midGain);
      midGain.connect(masterGain);
      nodesRef.current.midOsc = midOsc;
      nodesRef.current.midGain = midGain;

      // High frequency screech (afterburner)
      const highOsc = audioContext.createOscillator();
      highOsc.type = 'sawtooth';
      highOsc.frequency.value = 2000;
      const highGain = audioContext.createGain();
      highGain.gain.value = 0;
      const highFilter = audioContext.createBiquadFilter();
      highFilter.type = 'highpass';
      highFilter.frequency.value = 1500;
      highOsc.connect(highFilter);
      highFilter.connect(highGain);
      highGain.connect(masterGain);
      nodesRef.current.highOsc = highOsc;
      nodesRef.current.highGain = highGain;
      nodesRef.current.highFilter = highFilter;

      // Noise for jet exhaust
      const noiseBuffer = createNoiseBuffer(audioContext);
      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;
      const noiseGain = audioContext.createGain();
      noiseGain.gain.value = 0.08;
      const noiseFilter = audioContext.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 1000;
      noiseFilter.Q.value = 0.5;
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      nodesRef.current.noiseSource = noiseSource;
      nodesRef.current.noiseGain = noiseGain;

      // Start all oscillators
      lowOsc.start();
      midOsc.start();
      highOsc.start();
      noiseSource.start();

      setIsPlaying(true);
    } catch (error) {
      console.error('Error starting engine sound:', error);
    }
  }, [isPlaying, isMuted, createNoiseBuffer]);

  const stopEngine = useCallback(() => {
    const nodes = nodesRef.current;
    const audioContext = audioContextRef.current;

    if (audioContext && nodes.masterGain) {
      // Fade out
      nodes.masterGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);
      
      setTimeout(() => {
        nodes.lowOsc?.stop();
        nodes.midOsc?.stop();
        nodes.highOsc?.stop();
        nodes.noiseSource?.stop();
        audioContext.close();
        
        nodesRef.current = {
          lowOsc: null,
          midOsc: null,
          highOsc: null,
          noiseSource: null,
          lowGain: null,
          midGain: null,
          highGain: null,
          noiseGain: null,
          masterGain: null,
          lowFilter: null,
          highFilter: null,
        };
        audioContextRef.current = null;
        setIsPlaying(false);
      }, 600);
    }
  }, []);

  const updateIntensity = useCallback((options: JetEngineSoundOptions) => {
    const nodes = nodesRef.current;
    const audioContext = audioContextRef.current;
    
    if (!audioContext || !nodes.masterGain) return;

    const { isFlying, isPreparing, crashed, intensity = 0 } = options;
    intensityRef.current = intensity;

    const currentTime = audioContext.currentTime;
    const rampTime = 0.1;

    if (crashed) {
      // Crash - rapid spin down
      nodes.masterGain.gain.linearRampToValueAtTime(0, currentTime + 0.3);
      nodes.lowOsc?.frequency.linearRampToValueAtTime(30, currentTime + 0.5);
      nodes.midOsc?.frequency.linearRampToValueAtTime(100, currentTime + 0.5);
      return;
    }

    if (isPreparing) {
      // Idle - low rumble
      nodes.masterGain.gain.linearRampToValueAtTime(0.15, currentTime + rampTime);
      nodes.lowOsc?.frequency.linearRampToValueAtTime(60, currentTime + rampTime);
      nodes.midOsc?.frequency.linearRampToValueAtTime(300, currentTime + rampTime);
      nodes.highGain?.gain.linearRampToValueAtTime(0, currentTime + rampTime);
      nodes.noiseGain?.gain.linearRampToValueAtTime(0.04, currentTime + rampTime);
    } else if (isFlying) {
      // Flying - intensity-based sound
      const baseVolume = 0.25;
      const intensityBoost = intensity * 0.35;
      
      nodes.masterGain.gain.linearRampToValueAtTime(baseVolume + intensityBoost, currentTime + rampTime);
      
      // Low frequency increases with intensity
      nodes.lowOsc?.frequency.linearRampToValueAtTime(80 + intensity * 60, currentTime + rampTime);
      nodes.lowGain?.gain.linearRampToValueAtTime(0.3 + intensity * 0.2, currentTime + rampTime);
      
      // Mid frequency rises dramatically
      nodes.midOsc?.frequency.linearRampToValueAtTime(400 + intensity * 800, currentTime + rampTime);
      nodes.midGain?.gain.linearRampToValueAtTime(0.15 + intensity * 0.15, currentTime + rampTime);
      
      // High frequency afterburner screech
      nodes.highOsc?.frequency.linearRampToValueAtTime(2000 + intensity * 1500, currentTime + rampTime);
      nodes.highGain?.gain.linearRampToValueAtTime(intensity * 0.08, currentTime + rampTime);
      
      // Noise increases with intensity
      nodes.noiseGain?.gain.linearRampToValueAtTime(0.08 + intensity * 0.12, currentTime + rampTime);
    } else {
      // Not flying, not preparing - very quiet idle
      nodes.masterGain.gain.linearRampToValueAtTime(0.08, currentTime + rampTime);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (newMuted && isPlaying) {
        stopEngine();
      }
      return newMuted;
    });
  }, [isPlaying, stopEngine]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        nodesRef.current.lowOsc?.stop();
        nodesRef.current.midOsc?.stop();
        nodesRef.current.highOsc?.stop();
        nodesRef.current.noiseSource?.stop();
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    startEngine,
    stopEngine,
    updateIntensity,
    isPlaying,
    isMuted,
    toggleMute,
  };
};
