import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import OfferRainDialog from '@/components/chickenroad/OfferRainDialog';
import OfferRainBanner from '@/components/chickenroad/OfferRainBanner';
import MyOfferRainStatus from '@/components/chickenroad/MyOfferRainStatus';

// Assets imports
import footpathImg from '@/assets/games/chicken-road/footpath.jpg';
import footpath2OnImg from '@/assets/games/chicken-road/footpath2-on.jpg';
import footpath2OffImg from '@/assets/games/chicken-road/footpath2-off.jpg';
import chickenImg from '@/assets/games/chicken-road/chicken-alive.png';
import chickenDeadImg from '@/assets/games/chicken-road/chicken-dead.png';
import ovalImg from '@/assets/games/chicken-road/oval.png';
import ovalRevealImg from '@/assets/games/chicken-road/oval-reveal.png';
import barrierImg from '@/assets/games/chicken-road/barrier.png';
import poleOnImg from '@/assets/games/chicken-road/pole-on.png';
import poleOffImg from '@/assets/games/chicken-road/pole-off.png';

// Fake usernames for live wins
const FAKE_USERNAMES = [
  'Gold Ratty', 'Lucky Star', 'Pro Gamer', 'Winner99', 'BigBoss', 'CashKing',
  'Diamond', 'FireBird', 'Thunder', 'Storm', 'Blaze', 'Shadow', 'Phoenix',
  'Dragon', 'Tiger', 'Eagle', 'Hawk', 'Wolf', 'Bear', 'Lion', 'Shark'
];

// Car image paths (public assets)
const CAR_IMAGE_PATHS = [
  '/assets/games/chicken-road/caro.png',
  '/assets/games/chicken-road/caro1.png',
  '/assets/games/chicken-road/caro2.png',
  '/assets/games/chicken-road/caro3.png',
  '/assets/games/chicken-road/caro4.png',
  '/assets/games/chicken-road/caro5.png'
];

// All images to preload - includes both imported and public path images
const ALL_IMAGES = [
  footpathImg,
  footpath2OnImg,
  footpath2OffImg,
  chickenImg,
  chickenDeadImg,
  ovalImg,
  ovalRevealImg,
  barrierImg,
  poleOnImg,
  poleOffImg,
  ...CAR_IMAGE_PATHS,
  '/assets/games/chicken-road/logo.png'
];

// Preloaded image cache - stores loaded Image objects for instant rendering
const preloadedImages: Map<string, HTMLImageElement> = new Map();

// Admin settings interface
interface ChickenRoadSettingsType {
  min_bet: number;
  max_bet: number;
  rtp_percentage: number;
  manual_control_enabled: boolean;
  manual_crash_lanes_easy: number[];
  manual_crash_lanes_medium: number[];
  manual_crash_lanes_hard: number[];
  manual_crash_lanes_expert: number[];
  lanes_easy: number;
  lanes_medium: number;
  lanes_hard: number;
  lanes_expert: number;
  multiplier_easy: number;
  multiplier_medium: number;
  multiplier_hard: number;
  multiplier_expert: number;
  bet_button_text: string;
  use_custom_lane_odds: boolean;
  lane_odds_easy: number[];
  lane_odds_medium: number[];
  lane_odds_hard: number[];
  lane_odds_expert: number[];
}

// How to Play interface
interface HowToPlayType {
  title: string;
  content: string;
  rules: string[];
}

// Default lane counts per difficulty (fallback if admin not loaded)
const DEFAULT_DIFFICULTY_LANES: Record<string, number> = {
  easy: 30,
  moderate: 25,
  hard: 22,
  hardcore: 18
};

const ChickenRoad: React.FC = () => {
  // Currency from admin settings
  const { symbol: currencySymbol } = useCurrency();
  
  // Admin settings state
  const [adminSettings, setAdminSettings] = useState<ChickenRoadSettingsType | null>(null);
  
  // How to Play content from database
  const [howToPlayContent, setHowToPlayContent] = useState<HowToPlayType | null>(null);
  
  // State
  const [showSplash, setShowSplash] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [wallet, setWallet] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isBanned, setIsBanned] = useState(false);
  const [bet, setBetAmount] = useState(100);
  const [betInputValue, setBetInputValue] = useState('100'); // String for input display
  const [currentLane, setCurrentLane] = useState(-1);
  const [multiplier, setMultiplier] = useState(1.0);
  const [gameOver, setGameOver] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  
  // Sound/Music toggles - load from localStorage
  const [isMusicOn, setIsMusicOn] = useState(() => {
    const stored = localStorage.getItem('chickenRoad_musicOn');
    return stored ? stored === 'true' : false;
  });
  const [isSoundOn, setIsSoundOn] = useState(() => {
    const stored = localStorage.getItem('chickenRoad_soundOn');
    return stored ? stored === 'true' : false; // Default to false
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [pfModalOpen, setPfModalOpen] = useState(false);
  const [showBalanceWarning, setShowBalanceWarning] = useState(false);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [multiplierStep, setMultiplierStep] = useState(0.2);
  const [crashProbability, setCrashProbability] = useState(0.15);
  const [activeDifficulty, setActiveDifficulty] = useState('moderate');
  const [killLane, setKillLane] = useState(-1);
  const [chickenDead, setChickenDead] = useState(false);
  const [chickenJumping, setChickenJumping] = useState(false);
  const [chickenLeft, setChickenLeft] = useState<number | null>(null);
  const [showMultiplierBadge, setShowMultiplierBadge] = useState(false);
  const [revealedLanes, setRevealedLanes] = useState<number[]>([]);
  const [barriers, setBarriers] = useState<number[]>([]);
  const [stoppedCars, setStoppedCars] = useState<number[]>([]);
  const [noTrafficLanes, setNoTrafficLanes] = useState<number[]>([]); // Lanes where traffic should not render (e.g., after death)
  const [feathers, setFeathers] = useState<{id: number, left: number, tx: string, ty: string, rot: string}[]>([]);
  const [killCarActive, setKillCarActive] = useState(false); // Fast car that hits chicken on kill lane
  const [clientSeed, setClientSeed] = useState('ClientSeed_User123');
  const [currentBetId, setCurrentBetId] = useState<string | null>(null); // Track current bet for DB
  const [poleOn, setPoleOn] = useState(true);

  // Helper to get lane count for current difficulty from admin settings
  const getDifficultyLanes = useCallback((difficulty: string): number => {
    if (!adminSettings) return DEFAULT_DIFFICULTY_LANES[difficulty] || 25;
    switch (difficulty) {
      case 'easy': return adminSettings.lanes_easy || 30;
      case 'moderate': return adminSettings.lanes_medium || 25;
      case 'hard': return adminSettings.lanes_hard || 22;
      case 'hardcore': return adminSettings.lanes_expert || 18;
      default: return 25;
    }
  }, [adminSettings]);
  
  
  // Random car data per lane - each lane gets random car, speed, and delay - fixed during game
  const [laneCarData, setLaneCarData] = useState<{carIndex: number, speed: number, delay: number}[]>([]);
  
  // Dead end pole light toggle - switches every 2 seconds
  const [poleLight, setPoleLight] = useState(true);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setPoleLight(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  
  // Randomize cars once on game reset - use max lanes (30) so difficulty changes don't affect traffic
  const MAX_LANES = 30;
  useEffect(() => {
    // Only regenerate car data when game resets (new round starts)
    if (currentLane === -1 && adminSettings && laneCarData.length === 0) {
      setLaneCarData(Array.from({ length: MAX_LANES }, (_, i) => ({
        carIndex: Math.floor(Math.random() * 6),
        speed: 0.25 + Math.random() * 0.15,
        delay: Math.random() * 2 // Random delay 0-2 seconds for staggered cars
      })));
    }
  }, [currentLane, adminSettings]);
  
  // Reset car data when a new game round begins (after cashout/death)
  const resetCarData = useCallback(() => {
    setLaneCarData(Array.from({ length: MAX_LANES }, (_, i) => ({
      carIndex: Math.floor(Math.random() * 6),
      speed: 0.25 + Math.random() * 0.15,
      delay: Math.random() * 2 // Random delay 0-2 seconds for staggered cars
    })));
  }, []);
  
  // Helper to get multiplier for a specific lane using custom odds or fallback
  const getLaneMultiplier = useCallback((laneIndex: number): number => {
    if (!adminSettings) return 1 + (laneIndex + 1) * multiplierStep;
    
    if (adminSettings.use_custom_lane_odds) {
      const oddsMap: Record<string, number[]> = {
        easy: adminSettings.lane_odds_easy || [],
        moderate: adminSettings.lane_odds_medium || [],
        hard: adminSettings.lane_odds_hard || [],
        hardcore: adminSettings.lane_odds_expert || [],
      };
      const odds = oddsMap[activeDifficulty] || [];
      return odds[laneIndex] ?? (1 + (laneIndex + 1) * multiplierStep);
    }
    
    return 1 + (laneIndex + 1) * multiplierStep;
  }, [adminSettings, activeDifficulty, multiplierStep]);
  
  // Live wins state
  const [liveWin, setLiveWin] = useState({ name: 'Gold Ratty', amount: 356.00, initial: 'G' });
  const [onlineCount, setOnlineCount] = useState(13689);

  // Refs
  const gameRef = useRef<HTMLDivElement>(null);
  const laneWrapperRef = useRef<HTMLDivElement>(null);
  const betMobileRef = useRef<HTMLInputElement>(null);
  const betDesktopRef = useRef<HTMLInputElement>(null);
  
  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const jumpSoundRef = useRef<HTMLAudioElement | null>(null);
  const carPassSoundRef = useRef<HTMLAudioElement | null>(null);
  const chickenDieSoundRef = useRef<HTMLAudioElement | null>(null);
  const cashOutSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio elements
  useEffect(() => {
    bgMusicRef.current = new Audio('/assets/games/chicken-road/background-music.mp3');
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;
    
    jumpSoundRef.current = new Audio('/assets/games/chicken-road/jump.mp3');
    jumpSoundRef.current.volume = 0.5;
    
    carPassSoundRef.current = new Audio('/assets/games/chicken-road/car-pass.mp3');
    carPassSoundRef.current.volume = 0.3;
    carPassSoundRef.current.loop = true;
    
    chickenDieSoundRef.current = new Audio('/assets/games/chicken-road/chicken-die.mp3');
    chickenDieSoundRef.current.volume = 0.6;
    
    // Create cashout sound using Web Audio API for a celebratory chime
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const createCashoutSound = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1108.73, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1318.51, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    };
    (window as any).__chickenRoadCashoutSound = createCashoutSound;
    
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = null;
      }
      if (carPassSoundRef.current) {
        carPassSoundRef.current.pause();
        carPassSoundRef.current = null;
      }
    };
  }, []);
  
  // Handle traffic sound - controlled by isSoundOn toggle
  useEffect(() => {
    if (carPassSoundRef.current) {
      if (isSoundOn) {
        // Only play if user has interacted (not on mount)
        const playPromise = carPassSoundRef.current.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Autoplay blocked, will play on next user interaction
          });
        }
      } else {
        carPassSoundRef.current.pause();
        carPassSoundRef.current.currentTime = 0;
      }
    }
    // Persist to localStorage
    localStorage.setItem('chickenRoad_soundOn', String(isSoundOn));
  }, [isSoundOn]);
  
  // Handle music toggle
  useEffect(() => {
    if (bgMusicRef.current) {
      if (isMusicOn) {
        bgMusicRef.current.play().catch(() => {});
      } else {
        bgMusicRef.current.pause();
      }
    }
    // Persist to localStorage
    localStorage.setItem('chickenRoad_musicOn', String(isMusicOn));
  }, [isMusicOn]);
  
  // Play jump sound helper
  const playJumpSound = useCallback(() => {
    if (isSoundOn && jumpSoundRef.current) {
      jumpSoundRef.current.currentTime = 0;
      jumpSoundRef.current.play().catch(() => {});
    }
  }, [isSoundOn]);
  
  // Play car pass sound helper
  const playCarPassSound = useCallback(() => {
    if (isSoundOn && carPassSoundRef.current) {
      carPassSoundRef.current.currentTime = 0;
      carPassSoundRef.current.play().catch(() => {});
    }
  }, [isSoundOn]);

  // Preload all images on mount and cache them
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = ALL_IMAGES.length;
    
    const preloadImage = (src: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          // Cache the loaded image for instant access
          preloadedImages.set(src, img);
          loadedCount++;
          setLoadingProgress(Math.round((loadedCount / totalImages) * 100));
          resolve();
        };
        img.onerror = () => {
          loadedCount++;
          setLoadingProgress(Math.round((loadedCount / totalImages) * 100));
          resolve(); // Continue even if image fails
        };
        img.src = src;
      });
    };
    
    Promise.all(ALL_IMAGES.map(preloadImage)).then(() => {
      setImagesLoaded(true);
      // Small delay for smooth transition
      setTimeout(() => setShowSplash(false), 500);
    });
  }, []);

  // Pole light toggle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setPoleOn(prev => !prev);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Car images - use the constant
  const carImages = CAR_IMAGE_PATHS;

  // Fetch admin settings
  const fetchAdminSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chicken_road_settings')
        .select('*')
        .limit(1)
        .single();
      
      if (data && !error) {
        // Cast JSONB fields to number arrays
        const settingsData: ChickenRoadSettingsType = {
          ...data,
          lane_odds_easy: Array.isArray(data.lane_odds_easy) ? (data.lane_odds_easy as number[]) : [],
          lane_odds_medium: Array.isArray(data.lane_odds_medium) ? (data.lane_odds_medium as number[]) : [],
          lane_odds_hard: Array.isArray(data.lane_odds_hard) ? (data.lane_odds_hard as number[]) : [],
          lane_odds_expert: Array.isArray(data.lane_odds_expert) ? (data.lane_odds_expert as number[]) : [],
        };
        setAdminSettings(settingsData);
        // Set min bet as default if current bet is lower
        if (bet < data.min_bet) {
          setBetAmount(data.min_bet);
        }
      }
    } catch (err) {
      console.error('Error fetching chicken road settings:', err);
    }
  }, [bet]);

  // Fetch How to Play content
  const fetchHowToPlay = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chicken_road_how_to_play')
        .select('*')
        .limit(1)
        .single();
      
      if (data && !error) {
        setHowToPlayContent({
          title: data.title,
          content: data.content,
          rules: data.rules as string[] || []
        });
      }
    } catch (err) {
      console.error('Error fetching how to play content:', err);
    }
  }, []);

  // Generate kill lane based on admin settings - RTP-based house edge calculation
  const getKillLane = useCallback(() => {
    const totalLanes = getDifficultyLanes(activeDifficulty);
    
    // Check if admin has manual control enabled for this difficulty
    if (adminSettings?.manual_control_enabled) {
      let manualLanes: number[] = [];
      
      if (activeDifficulty === 'easy') {
        manualLanes = adminSettings.manual_crash_lanes_easy || [];
      } else if (activeDifficulty === 'moderate') {
        manualLanes = adminSettings.manual_crash_lanes_medium || [];
      } else if (activeDifficulty === 'hard') {
        manualLanes = adminSettings.manual_crash_lanes_hard || [];
      } else if (activeDifficulty === 'hardcore') {
        manualLanes = adminSettings.manual_crash_lanes_expert || [];
      }
      
      // If manual lanes are configured, randomly pick one from the list
      if (manualLanes.length > 0) {
        const randomIndex = Math.floor(Math.random() * manualLanes.length);
        const selectedLane = manualLanes[randomIndex];
        // Use the selected lane directly (0-indexed from admin)
        setKillLane(selectedLane);
        return;
      }
    }
    
    // RTP-based house edge calculation
    // RTP = Return To Player (how much % of wagered amount returns to players over time)
    // House Edge = 100% - RTP%
    // 
    // To maintain house edge, we calculate expected crash lane:
    // - Lower RTP = crash earlier (more house profit)
    // - Higher RTP = crash later or not at all (less house profit)
    //
    // Formula: Expected survival probability per lane = (RTP / 100) ^ (1 / totalLanes)
    // This ensures over many games, the house maintains the configured edge
    
    const rtpPercent = adminSettings?.rtp_percentage || 95;
    const houseEdge = (100 - rtpPercent) / 100; // e.g., 5% = 0.05
    
    // Calculate per-lane survival probability to achieve target RTP
    // If player survives all lanes, they get max multiplier
    // We want: (survivalProb ^ totalLanes) * maxMultiplier = RTP
    const survivalProbPerLane = Math.pow(rtpPercent / 100, 1 / totalLanes);
    
    // Determine kill lane by simulating lane-by-lane survival
    let determinedKillLane = -1;
    
    for (let lane = 0; lane < totalLanes; lane++) {
      // Each lane has a chance to be the crash lane based on survival probability
      const crashChance = 1 - survivalProbPerLane;
      
      // Apply difficulty modifier - harder difficulties have higher crash chance earlier
      let difficultyModifier = 1;
      if (activeDifficulty === 'easy') difficultyModifier = 0.8;
      else if (activeDifficulty === 'moderate') difficultyModifier = 1.0;
      else if (activeDifficulty === 'hard') difficultyModifier = 1.2;
      else if (activeDifficulty === 'hardcore') difficultyModifier = 1.5;
      
      const adjustedCrashChance = Math.min(crashChance * difficultyModifier, 0.9);
      
      if (Math.random() < adjustedCrashChance) {
        determinedKillLane = lane;
        break;
      }
    }
    
    // If no crash determined during lanes, set beyond reachable (player wins)
    if (determinedKillLane === -1) {
      determinedKillLane = totalLanes + 10;
    }
    
    setKillLane(determinedKillLane);
  }, [activeDifficulty, adminSettings]);

  // Fetch user wallet from Supabase
  const fetchWallet = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      
      // Check if user is banned
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', user.id)
        .single();
      
      if (profileData?.is_banned) {
        setIsBanned(true);
        return;
      }
      
      const { data: walletData } = await supabase
        .from('wallets')
        .select('wallet_cash, wallet_bonus')
        .eq('user_id', user.id)
        .single();
      
      if (walletData) {
        setWallet(Number(walletData.wallet_cash) + Number(walletData.wallet_bonus));
      }
    }
  }, []);

  // Update wallet in Supabase
  const updateWalletInDB = useCallback(async (amount: number, type: 'bet' | 'win') => {
    if (!userId) return;
    
    const { data: walletData } = await supabase
      .from('wallets')
      .select('wallet_cash, wallet_bonus, wager_completed, wager_required')
      .eq('user_id', userId)
      .single();
    
    if (!walletData) return;
    
    let newCash = Number(walletData.wallet_cash);
    let newBonus = Number(walletData.wallet_bonus);
    let wagerCompleted = Number(walletData.wager_completed) || 0;
    const wagerRequired = Number(walletData.wager_required) || 0;
    
    if (type === 'bet') {
      // Deduct from bonus first, then cash
      if (newBonus >= amount) {
        newBonus -= amount;
      } else {
        const remaining = amount - newBonus;
        newBonus = 0;
        newCash -= remaining;
      }
      
      // Track wager progress - bet amount counts towards wager requirement
      if (wagerRequired > 0) {
        wagerCompleted = Math.min(wagerCompleted + amount, wagerRequired);
      }
    } else {
      // Win goes to cash
      newCash += amount;
    }
    
    await supabase
      .from('wallets')
      .update({ 
        wallet_cash: newCash, 
        wallet_bonus: newBonus,
        wager_completed: wagerCompleted
      })
      .eq('user_id', userId);
    
    setWallet(newCash + newBonus);
  }, [userId]);

  // Process referral bet commission
  const processReferralCommission = useCallback(async (betUserId: string, betAmount: number, betId: string) => {
    try {
      // Check if user was referred by someone
      const { data: referralData } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referred_user_id', betUserId)
        .eq('status', 'completed')
        .single();

      if (!referralData) return;

      // Get commission percentage from settings
      const { data: settings } = await supabase
        .from('game_settings')
        .select('referral_bet_commission_percent')
        .single();

      if (!settings || settings.referral_bet_commission_percent <= 0) return;

      const commissionAmount = betAmount * (settings.referral_bet_commission_percent / 100);

      // Get referrer's current wallet
      const { data: referrerWallet } = await supabase
        .from('wallets')
        .select('wallet_cash')
        .eq('user_id', referralData.referrer_id)
        .single();

      if (!referrerWallet) return;

      // Credit commission to referrer
      const newReferrerBalance = parseFloat(referrerWallet.wallet_cash.toString()) + commissionAmount;
      await supabase
        .from('wallets')
        .update({ wallet_cash: newReferrerBalance })
        .eq('user_id', referralData.referrer_id);

      // Log the commission transaction
      await supabase
        .from('commission_transactions')
        .insert({
          referrer_id: referralData.referrer_id,
          referred_user_id: betUserId,
          commission_type: 'bet_commission',
          amount: commissionAmount,
          reference_id: betId
        });

      console.log(`Chicken Road bet commission awarded: ${commissionAmount} to ${referralData.referrer_id}`);
    } catch (error) {
      console.error('Error processing referral commission:', error);
    }
  }, []);

  // Simulate live wins
  useEffect(() => {
    const interval = setInterval(() => {
      const randomName = FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)];
      const randomAmount = Math.floor(Math.random() * 5000) + 50;
      setLiveWin({
        name: randomName.length > 10 ? randomName.substring(0, 10) + '...' : randomName,
        amount: randomAmount,
        initial: randomName.charAt(0).toUpperCase()
      });
      
      // Random online count fluctuation
      setOnlineCount(prev => prev + Math.floor(Math.random() * 100) - 50);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Initialize - fetch settings and wallet
  useEffect(() => {
    fetchAdminSettings();
    fetchWallet();
    fetchHowToPlay();
    
    // Subscribe to admin settings changes for real-time updates
    const settingsChannel = supabase
      .channel('chicken_road_settings_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chicken_road_settings'
        },
        () => {
          console.log('Chicken Road settings updated, refetching...');
          fetchAdminSettings();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(settingsChannel);
    };
  }, [fetchAdminSettings, fetchWallet, fetchHowToPlay]);

  // Real-time subscription for ban status changes
  useEffect(() => {
    if (!userId) return;
    
    const profileChannel = supabase
      .channel(`profile_ban_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`
        },
        (payload) => {
          if (payload.new && (payload.new as any).is_banned) {
            setIsBanned(true);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [userId]);

  // Generate kill lane and update multiplier step AFTER admin settings are loaded
  useEffect(() => {
    if (adminSettings) {
      getKillLane();
      // Update multiplier step based on current difficulty and admin settings
      const laneCount = getDifficultyLanes(activeDifficulty);
      if (activeDifficulty === 'easy') {
        const adminMultiplier = adminSettings.multiplier_easy || 1.5;
        setMultiplierStep(adminMultiplier / laneCount);
      } else if (activeDifficulty === 'moderate') {
        const adminMultiplier = adminSettings.multiplier_medium || 2.0;
        setMultiplierStep(adminMultiplier / laneCount);
      } else if (activeDifficulty === 'hard') {
        const adminMultiplier = adminSettings.multiplier_hard || 3.0;
        setMultiplierStep(adminMultiplier / laneCount);
      } else if (activeDifficulty === 'hardcore') {
        const adminMultiplier = adminSettings.multiplier_expert || 5.0;
        setMultiplierStep(adminMultiplier / laneCount);
      }
    }
  }, [adminSettings, getKillLane, activeDifficulty, getDifficultyLanes]);

  // Difficulty handler - uses admin-configured multipliers and lane counts
  const setDifficulty = (level: string) => {
    if (isJumping || (currentLane !== -1 && !gameOver)) return;
    
    setActiveDifficulty(level);
    
    // Get lane count and multiplier from admin settings
    const laneCount = getDifficultyLanes(level);
    
    // Get multiplier from admin settings or use defaults
    if (level === 'easy') {
      const adminMultiplier = adminSettings?.multiplier_easy || 1.5;
      setMultiplierStep(adminMultiplier / laneCount);
      setCrashProbability(0.05);
    } else if (level === 'moderate') {
      const adminMultiplier = adminSettings?.multiplier_medium || 2.0;
      setMultiplierStep(adminMultiplier / laneCount);
      setCrashProbability(0.15);
    } else if (level === 'hard') {
      const adminMultiplier = adminSettings?.multiplier_hard || 3.0;
      setMultiplierStep(adminMultiplier / laneCount);
      setCrashProbability(0.3);
    } else if (level === 'hardcore') {
      const adminMultiplier = adminSettings?.multiplier_expert || 5.0;
      setMultiplierStep(adminMultiplier / laneCount);
      setCrashProbability(0.5);
    }
    getKillLane();
  };

  // Bet handlers - use admin settings for min/max
  const minBet = adminSettings?.min_bet || 10;
  const maxBet = adminSettings?.max_bet || 10000;

  const setBet = (amount: number) => {
    if (isJumping || (currentLane !== -1 && !gameOver)) return;
    // Clamp bet to admin settings range
    const clampedAmount = Math.max(minBet, Math.min(maxBet, amount));
    setBetAmount(clampedAmount);
    setBetInputValue(clampedAmount.toString());
  };

  const syncBet = (val: string) => {
    setBetInputValue(val); // Allow empty string for clearing
    if (val === '') return;
    const num = parseInt(val);
    if (!isNaN(num)) {
      const clampedNum = Math.max(minBet, Math.min(maxBet, num));
      setBetAmount(clampedNum);
    }
  };

  const handleBetBlur = () => {
    // On blur, ensure valid value
    if (betInputValue === '' || isNaN(parseInt(betInputValue))) {
      setBetInputValue(bet.toString());
    } else {
      const num = parseInt(betInputValue);
      const clampedNum = Math.max(minBet, Math.min(maxBet, num));
      setBetAmount(clampedNum);
      setBetInputValue(clampedNum.toString());
    }
  };

  const setMin = () => { setBetAmount(minBet); setBetInputValue(minBet.toString()); };
  const setMax = () => { setBetAmount(maxBet); setBetInputValue(maxBet.toString()); };

  // Play click handler
  const handlePlayClick = () => {
    if (isWaiting || isJumping || gameOver) return;
    setIsWaiting(true);

    setTimeout(() => {
      setIsWaiting(false);
      jump();
    }, 500);
  };

  // Jump logic
  const jump = async () => {
    if (gameOver || isJumping) return;

    const nextLane = currentLane === -1 ? 0 : currentLane + 1;
    

    // Start new game
    if (currentLane === -1) {
      if (wallet < bet) {
        setShowBalanceWarning(true);
        setTimeout(() => setShowBalanceWarning(false), 2000);
        return;
      }

      // Deduct bet locally and in DB
      setWallet(prev => prev - bet);
      updateWalletInDB(bet, 'bet');
      
      // Create bet record in database
      if (userId) {
        const totalLanes = getDifficultyLanes(activeDifficulty);
        const { data: betRecord } = await supabase
          .from('chicken_road_bets')
          .insert({
            user_id: userId,
            amount: bet,
            difficulty: activeDifficulty,
            total_lanes: totalLanes,
            lanes_crossed: 0,
            status: 'active'
          })
          .select('id')
          .single();
        
        if (betRecord) {
          setCurrentBetId(betRecord.id);
          
          // Process referral bet commission
          processReferralCommission(userId, bet, betRecord.id);
        }
      }
      
      setCurrentLane(0);
      setMultiplier(getLaneMultiplier(0));
      setTimeout(() => setShowMultiplierBadge(true), 500);
    } else {
      if (currentLane >= 39) return;
      
      // Mark previous lane as revealed
      setRevealedLanes(prev => [...prev, currentLane]);
      const nextLane = currentLane + 1;
      setCurrentLane(nextLane);
      // Only update multiplier if not jumping to dead end footpath
      const totalLanes = getDifficultyLanes(activeDifficulty);
      if (nextLane < totalLanes) {
        setMultiplier(getLaneMultiplier(nextLane));
      }
    }

    // Animation
    setIsJumping(true);
    setChickenJumping(true);
    setShowMultiplierBadge(false);
    
    // Play jump sound
    playJumpSound();

    const targetLaneIndex = currentLane === -1 ? 0 : currentLane + 1;
    const laneLeft = 160 + (targetLaneIndex * 180) + 90;
    setChickenLeft(laneLeft);

    // Scroll to lane
    if (gameRef.current && targetLaneIndex >= 1) {
      const scrollTarget = 160 + (targetLaneIndex * 180) - (window.innerWidth / 2) + 90;
      gameRef.current.scrollTo({ left: scrollTarget, behavior: 'smooth' });
    }

    // Check if this jump will result in crash - activate kill car immediately
    const willCrash = targetLaneIndex === killLane;
    if (willCrash) {
      // Start kill car immediately when chicken starts jumping
      setKillCarActive(true);
    }

    // Resolve jump after animation
    setTimeout(async () => {
      setChickenJumping(false);
      const actualLane = currentLane === -1 ? 0 : currentLane + 1;

      // Check crash
      if (actualLane === killLane) {
        // CRASH - Kill car already active, now chicken dies
        setChickenDead(true);
        setNoTrafficLanes(prev => (prev.includes(actualLane) ? prev : [...prev, actualLane]));
        
        // Play chicken die sound
        if (isSoundOn && chickenDieSoundRef.current) {
          chickenDieSoundRef.current.currentTime = 0;
          chickenDieSoundRef.current.play().catch(() => {});
        }
        
        // Create feathers
        const newFeathers = [];
        for (let i = 0; i < 12; i++) {
          newFeathers.push({
            id: Date.now() + i,
            left: laneLeft + 50,
            tx: (Math.random() * 300 - 150) + 'px',
            ty: (Math.random() * -300 - 50) + 'px',
            rot: (Math.random() * 720) + 'deg'
          });
        }
        setFeathers(newFeathers);
        
        // Update bet record as lost
        if (currentBetId) {
          await supabase
            .from('chicken_road_bets')
            .update({
              status: 'lost',
              lanes_crossed: actualLane,
              profit: -bet
            })
            .eq('id', currentBetId);
        }
        
        setGameOver(true);
        setIsJumping(false);
        
        setTimeout(() => resetGame(), 1400);
      } else {
        // SAFE - Now show the stopped car coming from barrier
        
        // Small delay then show stopped car and barrier
        setTimeout(() => {
          setStoppedCars(prev => [...prev, actualLane]);
          setBarriers(prev => [...prev, actualLane]);
        }, 100);
        
        setShowMultiplierBadge(true);
        setIsJumping(false);
      }
    }, 500);
  };

  // Cashout
  const cashOut = async () => {
    if (gameOver || currentLane === -1) return;

    // Play cashout sound if sound is enabled
    if (isSoundOn && (window as any).__chickenRoadCashoutSound) {
      try {
        (window as any).__chickenRoadCashoutSound();
      } catch (e) {
        // Ignore audio errors
      }
    }

    const profit = bet * multiplier;
    const netProfit = profit - bet;
    setWallet(prev => prev + profit);
    await updateWalletInDB(profit, 'win');
    
    // Update bet record as won
    if (currentBetId) {
      await supabase
        .from('chicken_road_bets')
        .update({
          status: 'won',
          lanes_crossed: currentLane + 1,
          final_multiplier: multiplier,
          profit: netProfit
        })
        .eq('id', currentBetId);
    }
    
    setGameOver(true);
    setRewardAmount(profit);
    setShowRewardPopup(true);

    setTimeout(() => {
      setShowRewardPopup(false);
      resetGame();
    }, 2500);
  };

  // Reset game
  const resetGame = () => {
    setCurrentLane(-1);
    setMultiplier(1.0);
    setGameOver(false);
    setIsJumping(false);
    setChickenDead(false);
    setChickenJumping(false);
    setChickenLeft(null);
    setShowMultiplierBadge(false);
    setRevealedLanes([]);
    setBarriers([]);
    setStoppedCars([]);
    setNoTrafficLanes([]);
    setFeathers([]);
    setKillCarActive(false);
    setCurrentBetId(null);
    // Don't reset car data - let cars continue looping smoothly
    
    if (gameRef.current) {
      gameRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    }
    
    getKillLane();
  };

  // Toggle fullscreen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const controlsDisabled = isJumping || (currentLane !== -1 && !gameOver);
  
  // Check if chicken has passed all lanes and is on the dead end footpath
  const totalLanesForDifficulty = getDifficultyLanes(activeDifficulty);
  const isAtDeadEnd = currentLane !== -1 && currentLane >= totalLanesForDifficulty;

  return (
    <>
      <style>{`
        /* --- GLOBAL RESETS --- */
        .chicken-road-game * { box-sizing: border-box; user-select: none; }

        /* --- ANIMATIONS --- */
        /* Chicken alive idle - breathing with slight bounce */
        @keyframes idleAlive {
          0%, 100% { transform: translate(-50%, -50%) scale(1, 1); }
          50% { transform: translate(-50%, -48%) scale(1.03, 0.97); }
        }
        
        /* Chicken body breathing/bobbing */
        @keyframes chickenBreath {
          0%, 100% { transform: scaleY(1) scaleX(1); }
          30% { transform: scaleY(1.02) scaleX(0.98); }
          60% { transform: scaleY(0.98) scaleX(1.02); }
        }
        
        /* Wing flap animation - continuous when idle */
        @keyframes wingFlapIdle {
          0%, 100% { transform: rotate(0deg) translateY(0); }
          25% { transform: rotate(-8deg) translateY(-2px); }
          50% { transform: rotate(0deg) translateY(0); }
          75% { transform: rotate(8deg) translateY(-1px); }
        }
        
        /* Eye blink animation */
        @keyframes eyeBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        
        /* Head bob/turn animation */
        @keyframes headBob {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          20% { transform: rotate(-3deg) translateX(-1px); }
          40% { transform: rotate(0deg) translateX(0); }
          60% { transform: rotate(4deg) translateX(2px); }
          80% { transform: rotate(0deg) translateX(0); }
        }
        
        /* Wattle wobble */
        @keyframes wattleWobble {
          0%, 100% { transform: rotate(0deg) scaleY(1); }
          25% { transform: rotate(-5deg) scaleY(1.05); }
          50% { transform: rotate(3deg) scaleY(0.95); }
          75% { transform: rotate(-2deg) scaleY(1.02); }
        }
        
        /* Wing flap during jump */
        @keyframes wingFlapJump {
          0% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(-25deg) scale(1.2); }
          30% { transform: rotate(15deg) scale(0.9); }
          45% { transform: rotate(-20deg) scale(1.15); }
          60% { transform: rotate(10deg) scale(0.95); }
          75% { transform: rotate(-15deg) scale(1.1); }
          90% { transform: rotate(5deg) scale(1); }
          100% { transform: rotate(0deg) scale(1); }
        }
        
        @keyframes sideJump { 
          0% { transform: translate(-50%, -50%) scale(1); } 
          20% { transform: translate(-50%, -40%) scale(1.15, 0.85); }
          45% { transform: translate(-50%, -100%) scale(0.9, 1.1) rotate(-5deg); }
          60% { transform: translate(-50%, -80%) scale(0.95, 1.05) rotate(5deg); } 
          80% { transform: translate(-50%, -50%) scale(1.15, 0.85); }
          100% { transform: translate(-50%, -50%) scale(1); } 
        }
        
        @keyframes wingFlap {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1.2) rotate(-45deg); }
          50% { opacity: 1; transform: scale(1.0) rotate(10deg); }
          70% { opacity: 1; transform: scale(1.2) rotate(-45deg); }
          100% { opacity: 0; transform: scale(0.5); }
        }
        
        @keyframes explodeFeather {
          0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0.5); opacity: 0; }
        }
        
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes floatBadge {
          from { transform: translateX(-50%) translateY(0); }
          to { transform: translateX(-50%) translateY(-4px); }
        }
        
        @keyframes bounceIn { 
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; } 
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; } 
          70% { transform: translate(-50%, -50%) scale(0.9); }
        
        /* Traffic Light Animations */
        @keyframes trafficLightRed {
          0%, 45% { background: #ff3333; box-shadow: 0 0 15px #ff3333, 0 0 30px #ff3333, 0 0 45px rgba(255, 51, 51, 0.6); }
          50%, 95% { background: #4a1111; box-shadow: none; }
          100% { background: #ff3333; box-shadow: 0 0 15px #ff3333, 0 0 30px #ff3333, 0 0 45px rgba(255, 51, 51, 0.6); }
        }
        
        @keyframes trafficLightYellow {
          0%, 45% { background: #4a4411; box-shadow: none; }
          50%, 70% { background: #ffcc00; box-shadow: 0 0 15px #ffcc00, 0 0 30px #ffcc00, 0 0 45px rgba(255, 204, 0, 0.6); }
          75%, 100% { background: #4a4411; box-shadow: none; }
        }
        
        @keyframes trafficLightGreen {
          0%, 50% { background: #114a11; box-shadow: none; }
          55%, 95% { background: #33ff33; box-shadow: 0 0 15px #33ff33, 0 0 30px #33ff33, 0 0 45px rgba(51, 255, 51, 0.6); }
          100% { background: #114a11; box-shadow: none; }
        }
        
        @keyframes streetLampGlow {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px #fff9e6) drop-shadow(0 0 15px #ffcc66); }
          50% { opacity: 0.85; filter: drop-shadow(0 0 12px #fff9e6) drop-shadow(0 0 20px #ffcc66); }
        }
        
        @keyframes lampFlicker {
          0%, 95%, 100% { opacity: 1; }
          96%, 98% { opacity: 0.7; }
          97% { opacity: 0.9; }
        }
          100% { transform: translate(-50%, -50%) scale(1); } 
        }
        
        @keyframes blink { 
          0% { opacity: 1; } 
          50% { opacity: 0.5; } 
          100% { opacity: 1; } 
        }
        
        @keyframes dropDown { 
          0% { transform: translateY(-20px) scaleY(0.5); opacity: 0; } 
          60% { transform: translateY(5px) scaleY(1.1); opacity: 1; } 
          100% { transform: translateY(0) scaleY(1); opacity: 1; } 
        }
        
        @keyframes flip { 
          0% { transform: translate(-50%, -50%) rotateY(0deg); } 
          50% { transform: translate(-50%, -50%) rotateY(90deg); } 
          100% { transform: translate(-50%, -50%) rotateY(0deg); } 
        }
        
        @keyframes carMoveDown {
          0% { top: -200px; }
          100% { top: 100%; }
        }
        
        /* Continuous car loop: car passes in ~30% of time, then waits 2.5s (70% of cycle) */
        @keyframes carLoopDown {
          0% { top: -200px; }
          30% { top: 110%; }
          100% { top: 110%; }
        }
        
        /* Fast exit - car speeds out of lane */
        @keyframes carFastExit {
          0% { top: 30%; }
          100% { top: 100%; }
        }
        
        /* Car enters from barrier after chicken lands */
        @keyframes carEnterFromBarrier {
          0% { 
            top: -200px; 
            transform: translateX(-50%);
          }
          100% { 
            top: -85px; 
            transform: translateX(-50%);
          }
        }
        
        @keyframes carBrakeStop {
          0% { 
            top: -200px; 
            transform: translateX(-50%);
          }
          100% { 
            top: -85px; 
            transform: translateX(-50%);
          }
        }
        
        /* Kill car - fast car that hits the chicken */
        @keyframes killCarHit {
          0% { 
            top: -200px; 
            transform: translateX(-50%);
          }
          100% { 
            top: 100%; 
            transform: translateX(-50%);
          }
        }

        /* Hide scrollbar globally for this page */
        *, *::before, *::after {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        *::-webkit-scrollbar { 
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        html, body, #root {
          overflow: hidden !important;
          overscroll-behavior: none !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
        }
        
        /* Optimize image rendering for instant display */
        .chicken-road-game img,
        .chicken-road-game [style*="background-image"] {
          image-rendering: auto;
          will-change: transform, opacity;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        
        /* Force GPU acceleration for animated elements */
        .chicken-road-game [style*="animation"] {
          will-change: transform;
          transform: translateZ(0);
          -webkit-transform: translateZ(0);
        }
      `}</style>

      <div className="chicken-road-game" style={{
        margin: 0,
        padding: 0,
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        background: 'rgb(67, 66, 66)',
        textAlign: 'center',
        overflow: 'hidden',
        touchAction: 'none',
        height: '100vh',
        width: '100%',
        color: 'white',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>

        {/* Splash Screen with Loading Progress */}
        {showSplash && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%)', 
            display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 99999, flexDirection: 'column', color: 'white'
          }}>
            <div style={{ textAlign: 'center' }}>
              <img 
                src="https://chicken-road-two.inout.games/static/image/logo.170cfdc7.png" 
                alt="Game Logo" 
                loading="eager"
                decoding="sync"
                style={{ width: 200, marginBottom: 30 }}
              />
              
              {/* Loading Progress Bar */}
              <div style={{
                width: 200,
                height: 6,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 3,
                overflow: 'hidden',
                margin: '0 auto 15px'
              }}>
                <div style={{
                  width: `${loadingProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ffd700, #ffaa00)',
                  borderRadius: 3,
                  transition: 'width 0.2s ease-out'
                }}></div>
              </div>
              
              <p style={{ 
                fontSize: 14, 
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'sans-serif'
              }}>
                {imagesLoaded ? 'Starting...' : `Loading assets ${loadingProgress}%`}
              </p>
            </div>
          </div>
        )}

        {/* Banned User Overlay */}
        {isBanned && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'linear-gradient(180deg, #1a0a0a 0%, #0d0505 100%)', 
            display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 999999, flexDirection: 'column', color: 'white'
          }}>
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 30px',
                border: '3px solid rgba(239, 68, 68, 0.5)'
              }}>
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                </svg>
              </div>
              
              <h1 style={{ 
                fontSize: 28, 
                fontWeight: 'bold',
                color: '#ef4444',
                marginBottom: 15,
                fontFamily: 'sans-serif'
              }}>
                Account Suspended
              </h1>
              
              <p style={{ 
                fontSize: 16, 
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'sans-serif',
                maxWidth: 350,
                margin: '0 auto 30px',
                lineHeight: 1.6
              }}>
                Your account has been suspended due to a violation of our terms of service. If you believe this is an error, please contact support.
              </p>
              
              <a 
                href="/support"
                style={{
                  display: 'inline-block',
                  background: '#ef4444',
                  color: 'white',
                  padding: '12px 30px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 'bold',
                  fontSize: 14,
                  transition: 'background 0.2s'
                }}
              >
                Contact Support
              </a>
            </div>
          </div>
        )}

        {/* Topbar */}
        <div style={{
          background: '#2e2e2e', color: 'white', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 15px', fontFamily: 'sans-serif',
          position: 'relative', zIndex: 100, height: 60
        }}>
          <img 
            src="https://chicken-road-two.inout.games/static/image/logo.170cfdc7.png" 
            alt="Chicken Road" 
            style={{ height: 'clamp(25px, 5.4vw, 36px)', objectFit: 'contain' }} 
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1.5vw, 8px)' }}>
            <div style={{
              background: '#b8860b', padding: 'clamp(3px, 1vw, 5px) clamp(6px, 2vw, 12px)', borderRadius: 18,
              display: 'flex', alignItems: 'center', fontWeight: 'bold',
              fontSize: 'clamp(11px, 3vw, 15px)', border: '1px solid #d4a017', gap: 'clamp(3px, 1vw, 6px)'
            }}>
              <svg width="clamp(12px, 3.5vw, 16px)" height="clamp(12px, 3.5vw, 16px)" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
              </svg>
              <div style={{ color: 'white', whiteSpace: 'nowrap' }}>{currencySymbol} {wallet.toFixed(2)}</div>
            </div>
            <a href="/wallet" style={{
              background: '#28a745', padding: 'clamp(3px, 1vw, 5px) clamp(8px, 2.5vw, 14px)', borderRadius: 18,
              color: 'white', fontWeight: 'bold', fontSize: 'clamp(10px, 2.8vw, 13px)',
              textDecoration: 'none', border: '1px solid #34c759', whiteSpace: 'nowrap'
            }}>Deposit</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* How to play - PC only */}
            <div 
              onClick={() => setHowToPlayOpen(true)}
              style={{ 
                fontSize: 14, color: '#ccc', cursor: 'pointer',
                display: window.innerWidth >= 1024 ? 'flex' : 'none',
                alignItems: 'center', gap: 6,
                background: '#3a3a3a', borderRadius: 20,
                padding: '6px 14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#4a4a4a'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#ccc'; e.currentTarget.style.background = '#3a3a3a'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <span>How to play?</span>
            </div>
            <div 
              onClick={toggleFullScreen}
              style={{ 
                fontSize: 24, color: 'white', cursor: 'pointer',
                padding: '0 10px', transition: 'color 0.2s',
                display: window.innerWidth >= 1024 ? 'block' : 'none'
              }}
            >⛶</div>
            <div 
              onClick={() => setSettingsOpen(!settingsOpen)}
              style={{ 
                fontSize: 24, color: 'white', cursor: 'pointer',
                padding: '0 10px', transition: 'color 0.2s'
              }}
            >☰</div>
          </div>
        </div>

        {/* Settings Menu */}
        <div style={{
          position: 'absolute', top: 65, right: 10,
          background: '#2a2a2a', border: '1px solid #444',
          borderRadius: 12, width: 280, padding: 15,
          display: 'flex', flexDirection: 'column', gap: 15,
          boxShadow: '0 5px 20px rgba(0,0,0,0.5)',
          zIndex: 101, transform: settingsOpen ? 'scale(1)' : 'scale(0)',
          transformOrigin: 'top right', transition: 'transform 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontWeight: 'bold', color: '#ddd' }}>
            <span>Music</span>
            <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 20 }}>
              <input 
                type="checkbox" 
                checked={isMusicOn}
                onChange={(e) => setIsMusicOn(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isMusicOn ? '#4cd964' : '#555', transition: '.4s', borderRadius: 20
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: 16, width: 16,
                  left: isMusicOn ? 22 : 2, bottom: 2, backgroundColor: 'white',
                  transition: '.4s', borderRadius: '50%'
                }}></span>
              </span>
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontWeight: 'bold', color: '#ddd' }}>
            <span>Sound FX</span>
            <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 20 }}>
              <input 
                type="checkbox" 
                checked={isSoundOn}
                onChange={(e) => setIsSoundOn(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isSoundOn ? '#4cd964' : '#555', transition: '.4s', borderRadius: 20
              }}>
                <span style={{
                  position: 'absolute', content: '""', height: 16, width: 16,
                  left: isSoundOn ? 22 : 2, bottom: 2, backgroundColor: 'white',
                  transition: '.4s', borderRadius: '50%'
                }}></span>
              </span>
            </label>
          </div>
          {/* Offer Rain Button */}
          {userId && (
            <div style={{ marginBottom: 5 }}>
              <OfferRainDialog
                userId={userId}
                walletBalance={wallet}
                currencySymbol={currencySymbol}
                onRainCreated={() => fetchWallet()}
              />
            </div>
          )}
          <button 
            onClick={() => { setRulesModalOpen(true); setSettingsOpen(false); }}
            style={{
              background: '#3a3a3a', color: '#ccc', border: '1px solid #555',
              padding: 12, borderRadius: 8, fontWeight: 'bold',
              cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left',
              display: 'flex', justifyContent: 'space-between'
            }}
          >
            Game Rules <span>&gt;</span>
          </button>
          <button 
            onClick={() => { setPfModalOpen(true); setSettingsOpen(false); }}
            style={{
              background: '#3a3a3a', color: '#ccc', border: '1px solid #555',
              padding: 12, borderRadius: 8, fontWeight: 'bold',
              cursor: 'pointer', fontSize: 13, width: '100%', textAlign: 'left',
              display: 'flex', justifyContent: 'space-between'
            }}
          >
            Provably Fair Settings <span>&gt;</span>
          </button>
        </div>

        {/* Rules Modal */}
        {rulesModalOpen && (
          <div style={{
            display: 'flex', position: 'fixed', top: 0, left: 0,
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: 200,
            alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: '#222', width: '90%', maxWidth: 400,
              borderRadius: 16, padding: 20,
              border: '1px solid #444', color: '#eee',
              textAlign: 'left', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 15, borderBottom: '1px solid #444', paddingBottom: 10
              }}>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>Game Rules</span>
                <span onClick={() => setRulesModalOpen(false)} style={{ cursor: 'pointer', fontSize: 24, color: '#888' }}>×</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: '#ccc' }}>
                <p>1. <b>Place Bet:</b> Choose your amount and difficulty level.</p>
                <p>2. <b>Cross the Road:</b> Click <b>GO</b> to make the chicken jump lanes.</p>
                <p>3. <b>Multipliers:</b> Every successful jump increases your win multiplier.</p>
                <p>4. <b>Cashout:</b> Click <b>CASHOUT</b> at any time to take your winnings.</p>
                <p>5. <b>Crash:</b> If a car hits the chicken, the bet is lost immediately.</p>
                <p style={{ marginTop: 12, fontSize: 12, color: '#888', borderTop: '1px solid #444', paddingTop: 8 }}>
                  *Higher difficulties have faster cars and higher multipliers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* How to Play Modal */}
        {howToPlayOpen && (
          <div style={{
            display: 'flex', position: 'fixed', top: 0, left: 0,
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: 200,
            alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: '#3a3a3a', width: '90%', maxWidth: 520,
              borderRadius: 12, padding: '24px 28px',
              color: '#eee', textAlign: 'left',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 20
              }}>
                <span style={{ fontSize: 22, fontWeight: 'bold', color: 'white' }}>
                  {howToPlayContent?.title || 'How to play?'}
                </span>
                <span 
                  onClick={() => setHowToPlayOpen(false)} 
                  style={{ cursor: 'pointer', fontSize: 28, color: '#888', lineHeight: 1 }}
                >×</span>
              </div>
              <div style={{ fontSize: 15, lineHeight: 1.8, color: '#ddd' }}>
                {howToPlayContent?.content && (
                  <p style={{ marginBottom: 16, color: '#ccc' }}>{howToPlayContent.content}</p>
                )}
                {howToPlayContent?.rules && howToPlayContent.rules.length > 0 ? (
                  howToPlayContent.rules.map((rule, index) => (
                    <div key={index} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', minWidth: 20 }}>{index + 1}.</span>
                      <span>{rule}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', minWidth: 20 }}>1.</span>
                      <span>Specify the amount of your bet.</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', minWidth: 20 }}>2.</span>
                      <span>Choose a difficulty level and press Play.</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', minWidth: 20 }}>3.</span>
                      <span>Cross lanes without getting hit by a car.</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <span style={{ color: '#fff', fontWeight: 'bold', minWidth: 20 }}>4.</span>
                      <span>Cash out anytime to secure your winnings!</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Provably Fair Modal */}
        {pfModalOpen && (
          <div style={{
            display: 'flex', position: 'fixed', top: 0, left: 0,
            width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: 200,
            alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              background: '#222', width: '90%', maxWidth: 400,
              borderRadius: 16, padding: 20,
              border: '1px solid #444', color: '#eee',
              textAlign: 'left', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 15, borderBottom: '1px solid #444', paddingBottom: 10
              }}>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>Fairness Settings</span>
                <span onClick={() => setPfModalOpen(false)} style={{ cursor: 'pointer', fontSize: 24, color: '#888' }}>×</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: '#ccc' }}>
                <div style={{ marginBottom: 15 }}>
                  <span style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Active Client Seed (You can edit this)</span>
                  <input 
                    type="text" 
                    value={clientSeed}
                    onChange={(e) => setClientSeed(e.target.value)}
                    style={{ 
                      width: '100%', background: '#111', border: '1px solid #444', 
                      color: '#4cd964', padding: 8, borderRadius: 6, 
                      fontFamily: 'monospace', fontSize: 12 
                    }}
                  />
                </div>
                <div style={{ marginBottom: 15 }}>
                  <span style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Active Server Seed (Hashed)</span>
                  <input 
                    type="text" 
                    value=""
                    readOnly
                    style={{ 
                      width: '100%', background: '#111', border: '1px solid #444', 
                      color: '#aaa', padding: 8, borderRadius: 6, 
                      fontFamily: 'monospace', fontSize: 12 
                    }}
                  />
                </div>
                <div style={{ marginBottom: 15 }}>
                  <span style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Nonce (Game Count)</span>
                  <input 
                    type="text" 
                    value="0"
                    readOnly
                    style={{ 
                      width: 60, background: '#111', border: '1px solid #444', 
                      color: '#4cd964', padding: 8, borderRadius: 6, 
                      fontFamily: 'monospace', fontSize: 12 
                    }}
                  />
                </div>
                <p style={{ fontSize: 11, color: '#666', marginTop: 15 }}>
                  The game result is determined by the SHA256 hash of the Server Seed, Client Seed, and Nonce. This guarantees that results are pre-determined and cannot be altered during the game.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Offer Rain Banner */}
        <div style={{ position: 'absolute', top: 60, left: 0, right: 0, zIndex: 50, pointerEvents: 'auto' }}>
          <OfferRainBanner
            userId={userId}
            currencySymbol={currencySymbol}
            onClaimed={() => fetchWallet()}
          />
          {userId && (
            <MyOfferRainStatus
              userId={userId}
              currencySymbol={currencySymbol}
            />
          )}
        </div>

        {/* Live Stats Overlay */}
        <div style={{
          position: 'absolute', top: 100, left: 10, zIndex: 50,
          fontFamily: "'Segoe UI', sans-serif", textAlign: 'left', pointerEvents: 'none',
          padding: '12px 20px',
          borderRadius: 12
        }}>
          <div style={{
            fontSize: 12, color: 'rgba(220,220,220,0.7)', display: 'flex', alignItems: 'center',
            gap: 6, marginBottom: 5, textTransform: 'uppercase',
            fontWeight: 800
          }}>
            <span style={{ fontWeight: 800, background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: 6 }}>Live</span>
            <span style={{ width: 5, height: 5, borderRadius: '50%', display: 'inline-block', background: '#22c55e', boxShadow: '0 0 4px #22c55e' }}></span>
            <span style={{ background: 'rgba(0,0,0,0.4)', padding: '3px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: 'rgba(220,220,220,0.7)', fontWeight: 800 }}>Online:</span>
              <span style={{ color: 'rgba(220,220,220,0.7)', fontWeight: 800 }}>{onlineCount.toLocaleString()}</span>
            </span>
          </div>
          <div 
            key={liveWin.name + liveWin.amount}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: 'rgba(0, 0, 0, 0.3)', 
              padding: '4px 12px 4px 4px', borderRadius: 14,
              fontSize: 12, fontWeight: 'bold', color: 'white', width: 180,
              maskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 70%, transparent 100%)',
              animation: 'fadeSlideIn 0.5s ease-out'
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: '50%',
              background: '#f0c040', border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10
            }}>{liveWin.initial}</div>
            <span style={{ color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', fontSize: 13 }}>{liveWin.name}</span>
            <span style={{ color: '#4cd964', marginLeft: 'auto', fontSize: 13 }}>+{currencySymbol}{liveWin.amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Balance Warning */}
        {showBalanceWarning && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(220, 53, 69, 0.95)', color: 'white',
            padding: '15px 25px', borderRadius: 8, fontWeight: 'bold', zIndex: 1000
          }}>
            Insufficient balance
          </div>
        )}

        {/* Reward Popup */}
        {showRewardPopup && (
          <div style={{
            position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 9999, animation: 'bounceIn 0.6s ease-out'
          }}>
            <div style={{
              backgroundColor: '#1b4023', border: '3px solid #00ff66',
              borderRadius: 16, padding: '30px 50px',
              position: 'relative', textAlign: 'center', boxShadow: '0 0 15px #00ff66'
            }}>
              <div style={{
                position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', 
                backgroundColor: '#fce137', color: '#222', padding: '6px 20px', 
                fontSize: 20, fontWeight: 'bold', borderRadius: 20, boxShadow: '0 0 0 2px #00ff66'
              }}>WIN!</div>
              <div style={{ fontSize: 40, fontWeight: 'bold', color: 'white', marginTop: 10 }}>
                {currencySymbol}{rewardAmount.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Game Area */}
        <div 
          ref={gameRef}
          className="game-area"
          style={{
            width: '100%',
            height: window.innerWidth < 1024 ? 370 : 'calc(86vh - 166px)',
            display: 'flex',
            position: 'relative',
            background: '#555',
            overflowX: 'auto',
            overflowY: 'hidden',
            boxShadow: '0 0 15px rgba(0,0,0,0.4)'
          }}
        >
          <div 
            ref={laneWrapperRef}
            style={{
              display: 'flex',
              minWidth: `calc(160px + (180px * ${getDifficultyLanes(activeDifficulty)}))`,
              position: 'relative',
              height: '100%'
            }}
          >
            {/* Footpath */}
            <div style={{
              width: 160,
              height: '100%',
              backgroundImage: `url(${footpathImg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRight: '2px dashed #999',
              position: 'relative',
              flexShrink: 0
            }}>
              {/* Street Pole with on/off animation */}
              <div style={{
                position: 'absolute',
                right: '-3%',
                top: '-53%',
                zIndex: 8,
                width: 300,
                height: 600,
                transition: 'opacity 0.3s ease'
              }}>
                <img 
                  src={poleOn ? poleOnImg : poleOffImg} 
                  alt="Street pole" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'contain',
                    filter: poleOn ? 'drop-shadow(0 0 10px rgba(255, 200, 100, 0.6))' : 'none',
                    transition: 'filter 0.3s ease'
                  }} 
                />
              </div>
            </div>

            {/* Chicken - MOVED OUTSIDE footpath for proper layering */}
            {/* Alive: above everything important. Dead: above ovals, but still below cars/kill-car. */}
            <div style={{
              width: 130, height: 130,
              position: 'absolute',
              top: '58%',
              left: chickenLeft !== null ? chickenLeft : 80,
              transform: 'translate(-50%, -50%)',
              zIndex: chickenDead ? 17 : 50,
              transition: 'left 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
              transformOrigin: 'bottom center',
              animation: chickenJumping ? 'sideJump 0.5s cubic-bezier(0.25, 1.5, 0.5, 1) forwards' : (chickenDead ? 'none' : 'idleAlive 3.5s ease-in-out infinite'),
              pointerEvents: 'none'
            }}>
              {/* Shadow */}
              <div style={{
                position: 'absolute', bottom: 5, left: '50%',
                transform: 'translateX(-50%)', width: 90, height: 18,
                background: 'rgba(0, 0, 0, 0.25)', borderRadius: '50%',
                filter: 'blur(4px)', zIndex: -1
              }}></div>
              
              {/* Chicken Body with breathing */}
              <div style={{
                width: '100%', height: '100%',
                backgroundImage: `url(${chickenDead ? chickenDeadImg : chickenImg})`,
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                animation: chickenDead ? 'none' : 'chickenBreath 2s ease-in-out infinite',
                transformOrigin: 'bottom center'
              }}>
                {/* Head/Comb animation overlay */}
                {!chickenDead && (
                  <div style={{
                    position: 'absolute',
                    top: '5%',
                    left: '35%',
                    width: 35,
                    height: 25,
                    animation: 'headBob 2.5s ease-in-out infinite',
                    transformOrigin: 'bottom center'
                  }} />
                )}
                
                {/* Wattle wobble */}
                {!chickenDead && (
                  <div style={{
                    position: 'absolute',
                    top: '48%',
                    left: '58%',
                    width: 12,
                    height: 18,
                    background: 'linear-gradient(180deg, #e74c3c 0%, #c0392b 100%)',
                    borderRadius: '40% 40% 60% 60%',
                    animation: 'wattleWobble 1.5s ease-in-out infinite',
                    transformOrigin: 'top center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }} />
                )}
              </div>

              {/* Multiplier Badge */}
              {showMultiplierBadge && currentLane >= 0 && currentLane < totalLanesForDifficulty && !chickenDead && (
                <div style={{
                  position: 'absolute', top: '115%', left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white',
                  border: '3px solid #ffffff',
                  borderRadius: 50,
                  boxShadow: '0 6px 0 #00689c, 0 12px 15px rgba(0,0,0,0.4), inset 0 2px 5px rgba(255,255,255,0.6), 0 0 10px rgba(79, 172, 254, 0.6)',
                  fontFamily: "'Verdana', sans-serif",
                  fontWeight: 900, fontSize: 16, letterSpacing: 0.5,
                  textShadow: '1px 2px 0 rgba(0,0,0,0.2)',
                  padding: '6px 16px', whiteSpace: 'nowrap', zIndex: 1000,
                  animation: 'floatBadge 1.5s ease-in-out infinite alternate'
                }}>
                  {multiplier.toFixed(2)}x
                  <div style={{
                    position: 'absolute', top: -9, left: '50%',
                    transform: 'translateX(-50%)',
                    borderWidth: 7, borderStyle: 'solid',
                    borderColor: 'transparent transparent #ffffff transparent',
                    filter: 'drop-shadow(0 -2px 2px rgba(0,0,0,0.1))'
                  }}></div>
                </div>
              )}
            </div>

            {/* Lanes */}
            {Array.from({ length: getDifficultyLanes(activeDifficulty) }, (_, i) => {
              const totalLanes = getDifficultyLanes(activeDifficulty);
              return (
              <div 
                key={i}
                style={{
                  height: '100%',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: 180,
                  backgroundImage: i < totalLanes - 1 ? 'linear-gradient(to bottom, #c0c0c0 25px, transparent 25px)' : 'none',
                  backgroundSize: '3px 70px',
                  backgroundRepeat: 'repeat-y',
                  backgroundPosition: 'right',
                  zIndex: 10
                }}
              >
                {/* Oval Multiplier - must stay below dead chicken, but above lane background */}
                <div style={{
                  width: 117, height: 117,
                  borderRadius: '50%',
                  backgroundImage: `url(${revealedLanes.includes(i) ? ovalRevealImg : ovalImg})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: 16,
                  position: 'absolute',
                  top: '60%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: revealedLanes.includes(i) ? 12 : 0,
                  visibility: (currentLane === i && !chickenDead) ? 'hidden' : 'visible',
                  animation: revealedLanes.includes(i) ? 'flip 0.6s ease-in-out' : 'none'
                }}>
                  {!revealedLanes.includes(i) && `${getLaneMultiplier(i).toFixed(2)}x`}
                </div>

                {/* Single Car per lane - continuous loop with 1.5s delay between passes */}
                {!noTrafficLanes.includes(i) && !stoppedCars.includes(i) && (
                  <div 
                    key={`car-lane-${i}`}
                    style={{
                      width: 410, height: 180,
                      position: 'absolute',
                      left: '50%',
                      top: '-200px',
                      transform: 'translateX(-50%)',
                      backgroundImage: `url(${carImages[laneCarData[i]?.carIndex || 0]})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      zIndex: 20,
                      pointerEvents: 'none',
                      animation: `carLoopDown ${1.65 + (laneCarData[i]?.speed || 0.33)}s linear ${(laneCarData[i]?.delay || i * 0.35)}s infinite`,
                      animationFillMode: 'both'
                    }}
                  ></div>
                )}
                {!noTrafficLanes.includes(i) && stoppedCars.includes(i) && (
                  /* Stopped car - enters from barrier position smoothly */
                  <div style={{
                    width: 410, height: 180,
                    position: 'absolute',
                    left: '50%',
                    backgroundImage: `url(${carImages[laneCarData[i]?.carIndex || 0]})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    zIndex: 18,
                    pointerEvents: 'none',
                    animation: 'carEnterFromBarrier 0.5s ease-out forwards'
                  }}></div>
                )}

                {/* Kill Car - Fast car that hits chicken on kill lane */}
                {killCarActive && i === killLane && (
                  <div style={{
                    width: 410, height: 180,
                    position: 'absolute',
                    left: '50%',
                    top: '-200px',
                    transform: 'translateX(-50%)',
                    backgroundImage: `url(${carImages[Math.floor(Math.random() * carImages.length)]})`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    zIndex: 25,
                    pointerEvents: 'none',
                    animation: 'killCarHit 0.5s linear forwards'
                  }}></div>
                )}

                {/* Barrier */}
                {barriers.includes(i) && (
                  <div style={{
                    width: 100, height: 70,
                    backgroundImage: `url(${barrierImg})`,
                    backgroundSize: 'cover',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center',
                    position: 'absolute',
                    top: 80, left: 40, zIndex: 2,
                    animation: 'dropDown 0.4s ease-out'
                  }}></div>
                )}
              </div>
              );
            })}

            {/* Dead End Footpath - After Last Lane with switching lights */}
            <div 
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: 180,
                height: '100%',
                backgroundImage: `url(${poleLight ? footpath2OnImg : footpath2OffImg})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transition: 'background-image 0.3s ease'
              }}
            >
            </div>

            {/* Feathers */}
            {feathers.map(f => (
              <div 
                key={f.id}
                style={{
                  position: 'absolute',
                  width: 25, height: 12,
                  backgroundColor: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '50% 50% 50% 5px',
                  zIndex: 150,
                  pointerEvents: 'none',
                  left: f.left,
                  top: 250,
                  ['--tx' as any]: f.tx,
                  ['--ty' as any]: f.ty,
                  ['--rot' as any]: f.rot,
                  animation: 'explodeFeather 1.5s ease-out forwards'
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Bet Container - Mobile/Tablet */}
        <div className="lg:hidden bg-[#2a2a2a] p-3 sm:p-4 mx-auto my-2 w-[98%] max-w-[420px] rounded-2xl shadow-lg border border-[#3a3a3a] flex flex-col gap-3">
          {/* Input Group */}
          <div className="flex items-center justify-between bg-[#1f1f1f] p-2 rounded-lg h-12">
            <button 
              onClick={setMin}
              disabled={controlsDisabled}
              className="bg-[#383838] text-[#ccc] border-none text-xs font-extrabold px-4 h-full rounded-lg disabled:opacity-50"
            >MIN</button>
            <input 
              type="number" 
              value={betInputValue}
              onChange={(e) => syncBet(e.target.value)}
              onBlur={handleBetBlur}
              onFocus={(e) => e.target.select()}
              disabled={controlsDisabled}
              className="bg-transparent border-none text-white text-lg sm:text-xl font-bold text-center w-24 h-full outline-none"
            />
            <button 
              onClick={setMax}
              disabled={controlsDisabled}
              className="bg-[#383838] text-[#ccc] border-none text-xs font-extrabold px-4 h-full rounded-lg disabled:opacity-50"
            >MAX</button>
          </div>

          {/* Quick Bet Buttons */}
          <div className="grid grid-cols-4 gap-2 w-full">
            {[100, 200, 300, 400].map(amt => (
              <button 
                key={amt}
                onClick={() => setBet(amt)}
                disabled={controlsDisabled}
                className="bg-[#444] text-white font-bold py-3 border-none rounded-lg text-sm shadow-sm disabled:opacity-50"
              >{amt}</button>
            ))}
          </div>

          {/* Difficulty Tabs */}
          <div className="bg-[#1a1a1a] p-1.5 rounded-lg flex gap-1.5">
            {['easy', 'moderate', 'hard', 'hardcore'].map(level => (
              <button 
                key={level}
                onClick={() => setDifficulty(level)}
                disabled={controlsDisabled}
                className={`flex-1 border-none rounded-lg font-bold cursor-pointer transition-all py-2.5 text-xs sm:text-sm disabled:opacity-50 ${
                  activeDifficulty === level 
                    ? 'bg-[#444] text-white shadow-sm' 
                    : 'bg-transparent text-[#888]'
                }`}
              >
                {level === 'moderate' ? 'Medium' : level === 'hardcore' ? 'Expert' : level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 h-14 mt-1">
            {currentLane >= 0 && !gameOver && (
              <button 
                onClick={cashOut}
                className="flex-1 h-full border-none rounded-xl font-extrabold cursor-pointer uppercase flex items-center justify-center flex-col leading-tight bg-[#ffcc00] text-[#222] shadow-[0_5px_0_#e6b800] text-xl"
              >
                CASHOUT<br/>
                <span className="text-xs">{Math.floor(bet * multiplier)}</span>
              </button>
            )}
            <button 
              onClick={handlePlayClick}
              disabled={isWaiting || isJumping || isAtDeadEnd}
              className={`flex-1 h-full border-none rounded-xl font-extrabold uppercase flex items-center justify-center bg-[#4cd964] text-white shadow-[0_5px_0_#3cb050] text-xl ${(isWaiting || isAtDeadEnd) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {currentLane === -1 ? (adminSettings?.bet_button_text || 'BET') : 'GO'}
            </button>
          </div>
        </div>

        {/* Bet Container - Desktop */}
        <div className="hidden lg:flex fixed bottom-0 left-0 w-full h-[165px] bg-[#252525] border-t border-[#3a3a3a] items-center justify-center px-10 shadow-[0_-10px_30px_rgba(0,0,0,0.6)] z-20">
          <div className="w-full max-w-[1350px] flex items-center justify-between">
            {/* Bet Left */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between bg-[#1a1a1a] rounded-lg p-2 w-[450px] max-w-full border border-[#444] shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]">
                <button 
                  onClick={setMin}
                  disabled={controlsDisabled}
                  className="bg-[#333] border-none text-[#ccc] font-bold text-sm cursor-pointer py-2 px-4 rounded-lg transition-colors hover:bg-[#444] disabled:opacity-50"
                >MIN</button>
                <input 
                  type="number" 
                  value={betInputValue}
                  onChange={(e) => syncBet(e.target.value)}
                  onBlur={handleBetBlur}
                  onFocus={(e) => e.target.select()}
                  disabled={controlsDisabled}
                  className="bg-transparent border-none text-white text-[22px] font-bold text-center flex-1 outline-none"
                />
                <button 
                  onClick={setMax}
                  disabled={controlsDisabled}
                  className="bg-[#333] border-none text-[#ccc] font-bold text-sm cursor-pointer py-2 px-4 rounded-lg transition-colors hover:bg-[#444] disabled:opacity-50"
                >MAX</button>
              </div>
              <div className="flex gap-2">
                {[100, 200, 500, 1000].map(amt => (
                  <button 
                    key={amt}
                    onClick={() => setBet(amt)}
                    disabled={controlsDisabled}
                    className="bg-[#3a3a3a] text-[#ddd] border-none rounded-md py-2.5 px-3.5 text-sm font-bold cursor-pointer transition-colors flex-1 hover:bg-[#555] disabled:opacity-50"
                  >{amt === 1000 ? '1k' : amt}</button>
                ))}
              </div>
            </div>

            {/* Bet Middle - Difficulty */}
            <div className="flex flex-col gap-2 w-[440px]">
              <div className="flex text-sm text-[#999] font-medium px-1">
                <span>Difficulty</span>
              </div>
              <div className="bg-[#1a1a1a] p-1.5 rounded-lg flex gap-1.5">
                {['easy', 'moderate', 'hard', 'hardcore'].map(level => (
                  <button 
                    key={level}
                    onClick={() => setDifficulty(level)}
                    disabled={controlsDisabled}
                    className={`flex-1 border-none rounded-lg font-bold cursor-pointer transition-all py-3.5 text-base disabled:opacity-50 ${
                      activeDifficulty === level 
                        ? 'bg-[#444] text-white shadow-sm' 
                        : 'bg-transparent text-[#888]'
                    }`}
                  >
                    {level === 'moderate' ? 'Medium' : level === 'hardcore' ? 'Expert' : level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Bet Right - Action Buttons */}
            <div className="w-[280px] h-[75px] flex gap-2.5">
              {currentLane >= 0 && !gameOver && (
                <button 
                  onClick={cashOut}
                  className="flex-1 w-full h-full border-none rounded-xl font-extrabold cursor-pointer uppercase flex items-center justify-center flex-col leading-tight bg-[#ffcc00] text-[#222] shadow-[0_5px_0_#e6b800] text-3xl tracking-wide"
                >
                  CASHOUT<br/>
                  <span className="text-sm mt-1">{Math.floor(bet * multiplier)}</span>
                </button>
              )}
              <button 
                onClick={handlePlayClick}
                disabled={isWaiting || isJumping || isAtDeadEnd}
                className={`flex-1 w-full h-full border-none rounded-xl font-extrabold uppercase flex items-center justify-center bg-[#4cd964] text-white shadow-[0_5px_0_#3cb050] text-3xl tracking-wide ${(isWaiting || isAtDeadEnd) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {currentLane === -1 ? (adminSettings?.bet_button_text || 'BET') : 'GO'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChickenRoad;
