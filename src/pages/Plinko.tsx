import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DesktopNav from "@/components/layout/DesktopNav";
import BottomNav from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import { AuthDrawer } from "@/components/auth/AuthDrawer";
import { toast } from "sonner";
import { Minus, Plus, ArrowLeft } from "lucide-react";
import { Label } from "@/components/ui/label";
import { PlinkoProvablyFair } from "@/components/game/PlinkoProvablyFair";
import confetti from "canvas-confetti";
import { useGameSounds } from "@/hooks/useGameSounds";

interface Bet {
  id: string;
  amount: number;
  rows: number;
  risk: string;
  result_slot: number;
  multiplier: number;
  profit: number;
  created_at: string;
}

const MULTIPLIERS = {
  low: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    12: [18, 4, 1.7, 0.9, 0.5, 0.3, 0.2, 0.3, 0.5, 0.9, 1.7, 4, 18],
    16: [43, 7, 2, 1, 0.6, 0.4, 0.3, 0.2, 0.2, 0.2, 0.3, 0.4, 0.6, 1, 2, 7, 43],
  },
  high: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    12: [76, 10, 3, 0.9, 0.3, 0.2, 0.2, 0.2, 0.3, 0.9, 3, 10, 76],
    16: [170, 24, 8, 2, 0.7, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.7, 2, 8, 24, 170],
  },
};

export default function Plinko() {
  const navigate = useNavigate();
  const { symbol } = useCurrency();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { playPlinkoPegHit, playPlinkoSlotLand, playPlinkoDrop } = useGameSounds();
  
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [showAuthDrawer, setShowAuthDrawer] = useState(false);
  
  const [betAmount, setBetAmount] = useState(10);
  const [rows, setRows] = useState<8 | 12 | 16>(12);
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [gameMode, setGameMode] = useState<'lightning' | 'low' | 'medium' | 'high'>('medium');
  const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');
  const [isPlaying, setIsPlaying] = useState(false);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  // Auto-bet state
  const [isAutoBet, setIsAutoBet] = useState(false);
  const [autoBetCount, setAutoBetCount] = useState(10);
  const [autoBetDelay, setAutoBetDelay] = useState(1000);
  const [autoBetStopOnProfit, setAutoBetStopOnProfit] = useState<number | null>(null);
  const [autoBetStopOnLoss, setAutoBetStopOnLoss] = useState<number | null>(null);
  const [currentAutoBetRound, setCurrentAutoBetRound] = useState(0);
  const [autoBetStartBalance, setAutoBetStartBalance] = useState(0);
  const autoBetIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const shouldContinueAutoBet = useRef(false);
  
  useEffect(() => {
    checkUser();
    fetchSettings();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadBalance(session.user.id);
        loadMyBets(session.user.id);
      } else {
        setUser(null);
        setBalance(0);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await loadBalance(session.user.id);
      await loadMyBets(session.user.id);
    }
  };

  const loadBalance = async (userId: string) => {
    const { data } = await supabase
      .from("wallets")
      .select("wallet_cash, wallet_bonus")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      setBalance(data.wallet_cash + data.wallet_bonus);
    }
  };

  const loadMyBets = async (userId: string) => {
    const { data } = await supabase
      .from("plinko_bets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) {
      setMyBets(data);
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("plinko_settings")
      .select("*")
      .single();
    
    if (data) {
      setSettings(data);
    }
  };

  const stopAutoBet = () => {
    setIsAutoBet(false);
    shouldContinueAutoBet.current = false;
    setCurrentAutoBetRound(0);
    if (autoBetIntervalRef.current) {
      clearTimeout(autoBetIntervalRef.current);
      autoBetIntervalRef.current = null;
    }
  };

  const checkAutoBetStopConditions = (currentBalance: number) => {
    const profitLoss = currentBalance - autoBetStartBalance;
    
    if (autoBetStopOnProfit !== null && profitLoss >= autoBetStopOnProfit) {
      toast.success(`Auto-bet stopped: Target profit reached (${symbol}${profitLoss.toFixed(2)})`);
      return true;
    }
    
    if (autoBetStopOnLoss !== null && profitLoss <= -autoBetStopOnLoss) {
      toast.error(`Auto-bet stopped: Loss limit reached (${symbol}${Math.abs(profitLoss).toFixed(2)})`);
      return true;
    }
    
    return false;
  };

  const playPlinko = async (onAnimationComplete?: () => void) => {
    if (!user) {
      setShowAuthDrawer(true);
      return;
    }

    if (betAmount < (settings?.min_bet || 1) || betAmount > (settings?.max_bet || 10000)) {
      toast.error(`Bet must be between ${symbol}${settings?.min_bet} and ${symbol}${settings?.max_bet}`);
      return;
    }

    if (betAmount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    setIsPlaying(true);

    try {
      // Play drop sound
      playPlinkoDrop();
      
      const response = await supabase.functions.invoke('plinko-engine', {
        body: {
          user_id: user.id,
          amount: betAmount,
          rows,
          risk,
        }
      });

      if (response.error) throw response.error;

      const result = response.data;
      
      // Animate ball drop with callback for notification
      animateBallDrop(result.result_slot, result.multiplier, async () => {
        // Update balance after animation
        await loadBalance(user.id);
        await loadMyBets(user.id);
        
        // Show notification after ball lands
        if (result.profit > 0) {
          toast.success(`Won ${symbol}${result.profit.toFixed(2)} (${result.multiplier}x)!`);
        } else {
          toast.error(`Lost ${symbol}${betAmount.toFixed(2)}`);
        }
        
        setIsPlaying(false);
        
        // Call the completion callback if provided (for auto-bet)
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      });
    } catch (error: any) {
      console.error("Plinko error:", error);
      toast.error(error.message || "Failed to play");
      setIsPlaying(false);
      if (isAutoBet) {
        stopAutoBet();
      }
    }
  };

  const startAutoBet = async () => {
    if (!user) {
      setShowAuthDrawer(true);
      return;
    }

    const { data: walletData } = await supabase
      .from("wallets")
      .select("wallet_cash, wallet_bonus")
      .eq("user_id", user.id)
      .single();

    if (walletData) {
      setAutoBetStartBalance(walletData.wallet_cash + walletData.wallet_bonus);
    }

    setIsAutoBet(true);
    shouldContinueAutoBet.current = true;
    setCurrentAutoBetRound(0);
    executeAutoBet(0);
  };

  const executeAutoBet = async (round: number) => {
    // Check if auto-bet should continue before executing
    if (!shouldContinueAutoBet.current) {
      return;
    }

    if (round >= autoBetCount) {
      toast.success(`Auto-bet completed: ${autoBetCount} drops finished`);
      stopAutoBet();
      return;
    }

    setCurrentAutoBetRound(round + 1);
    
    // Execute drop and wait for animation to complete
    await playPlinko(async () => {
      // Check if auto-bet should continue before processing next round
      if (!shouldContinueAutoBet.current) {
        return;
      }

      // After animation completes, check stop conditions
      if (user) {
        const { data: walletData } = await supabase
          .from("wallets")
          .select("wallet_cash, wallet_bonus")
          .eq("user_id", user.id)
          .single();

        if (walletData) {
          const currentBalance = walletData.wallet_cash + walletData.wallet_bonus;
          if (checkAutoBetStopConditions(currentBalance)) {
            stopAutoBet();
            return;
          }
        }
      }

      // Final check before scheduling next drop
      if (!shouldContinueAutoBet.current) {
        return;
      }

      // Schedule next drop with the configured delay
      autoBetIntervalRef.current = setTimeout(() => {
        executeAutoBet(round + 1);
      }, autoBetDelay);
    });
  };

  const animateBallDrop = (resultSlot: number, multiplier: number, onComplete?: () => void) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get computed CSS colors
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--primary').trim();
    const mutedColor = computedStyle.getPropertyValue('--muted').trim();
    const primaryForeground = computedStyle.getPropertyValue('--primary-foreground').trim();
    
    // Convert HSL values to full hsl() format
    const primaryHsl = `hsl(${primaryColor})`;
    const mutedHsl = `hsl(${mutedColor})`;
    const primaryForegroundHsl = `hsl(${primaryForeground})`;

    const multipliers = MULTIPLIERS[risk][rows];
    
    // Responsive sizing based on canvas width and rows - matching the draw logic
    const isMobile = canvas.width < 640;
    const isLargeScreen = canvas.width >= 1024;
    
    // Scale factors for better PC display - optimized for centered layout
    const scaleFactor = isLargeScreen ? Math.min(canvas.width / 600, 0.9) : 1;
    
    const pegSpacing = isMobile 
      ? (rows === 8 ? 32 : rows === 12 ? 24 : 20)
      : isLargeScreen 
        ? (rows === 8 ? 55 : rows === 12 ? 45 : 38) * scaleFactor
        : 40;
    const pegSize = isMobile ? 3 : isLargeScreen ? 7 * scaleFactor : 5;
    const ballSize = isMobile ? 6 : isLargeScreen ? 12 * scaleFactor : 8;
    const slotWidth = isMobile 
      ? (rows === 8 ? Math.min(canvas.width / 9, 38) : rows === 12 ? Math.min(canvas.width / 13, 28) : Math.min(canvas.width / 17, 22))
      : isLargeScreen
        ? (rows === 8 ? 70 : rows === 12 ? 55 : 45) * scaleFactor
        : 50;
    
    const startX = canvas.width / 2;
    const startY = isMobile 
      ? (rows === 8 ? 30 : rows === 12 ? 25 : 20)
      : isLargeScreen ? 80 * scaleFactor : 50;
    
    let currentRow = 0;
    let currentX = startX;
    let currentY = startY;
    let velocityY = 0;
    const gravity = 0.5;
    const bounceDecay = 0.7;
    let hasLanded = false;
    
    // Calculate target X position for the result slot
    const slotStartX = startX - (multipliers.length * slotWidth) / 2;
    const targetX = slotStartX + resultSlot * slotWidth + slotWidth / 2;

    // Peg glow effects system
    interface PegGlow {
      x: number;
      y: number;
      intensity: number;
      maxIntensity: number;
    }
    const pegGlows: PegGlow[] = [];

    // Particle system
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      size: number;
      color: string;
      hue?: number; // For rainbow effect
    }
    const particles: Particle[] = [];
    
    // Slot animation state
    let slotScale = 1;
    let slotGlowIntensity = 0;
    const targetSlotScale = 1.15;
    const glowFadeSpeed = 0.05;

    // Get color based on multiplier value (returns rgba format for canvas)
    const getMultiplierColor = (mult: number, alpha: number = 1) => {
      let r, g, b;
      if (mult < 0.5) {
        [r, g, b] = [220, 38, 38]; // Red
      } else if (mult < 1) {
        [r, g, b] = [249, 115, 22]; // Orange
      } else if (mult < 2) {
        [r, g, b] = [234, 179, 8]; // Yellow
      } else if (mult < 5) {
        [r, g, b] = [34, 197, 94]; // Green
      } else if (mult < 10) {
        [r, g, b] = [14, 165, 233]; // Cyan
      } else if (mult < 20) {
        [r, g, b] = [168, 85, 247]; // Purple
      } else {
        [r, g, b] = [236, 72, 153]; // Magenta
      }
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Determine particle colors based on multiplier tier
    const getParticleColors = (mult: number) => {
      if (mult < 2) {
        // Low multiplier - Green
        return { type: 'solid' as const, color: 'hsl(120, 70%, 50%)' };
      } else if (mult < 10) {
        // Medium multiplier - Orange
        return { type: 'solid' as const, color: 'hsl(30, 100%, 50%)' };
      } else {
        // High multiplier - Rainbow
        return { type: 'rainbow' as const, color: '' };
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw peg glow effects
      const glowRadius = isLargeScreen ? 35 * scaleFactor : 20;
      pegGlows.forEach((glow) => {
        const alpha = glow.intensity / glow.maxIntensity;
        const glowGradient = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glowRadius);
        glowGradient.addColorStop(0, primaryHsl.replace(')', ` / ${alpha * 0.8})`));
        glowGradient.addColorStop(1, primaryHsl.replace(')', ' / 0)'));
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(glow.x, glow.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw pegs with neon glow
      for (let row = 0; row < rows; row++) {
        const pegsInRow = row + 3;
        const rowY = startY + row * pegSpacing;
        const rowStartX = startX - (pegsInRow - 1) * pegSpacing / 2;
        
        for (let col = 0; col < pegsInRow; col++) {
          const pegX = rowStartX + col * pegSpacing;
          
          // Neon glow effect for pegs - scaled for large screens
          const pegShadowBlur = isLargeScreen ? 25 * scaleFactor : 15;
          const pegInnerShadowBlur = isLargeScreen ? 13 * scaleFactor : 8;
          
          ctx.shadowBlur = pegShadowBlur;
          ctx.shadowColor = primaryHsl;
          
          ctx.beginPath();
          ctx.arc(pegX, rowY, pegSize, 0, Math.PI * 2);
          ctx.fillStyle = primaryHsl;
          ctx.fill();
          
          // Inner bright core
          ctx.shadowBlur = pegInnerShadowBlur;
          ctx.beginPath();
          ctx.arc(pegX, rowY, pegSize * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = 'white';
          ctx.fill();
          
          ctx.shadowBlur = 0;
        }
      }

      // Draw multiplier slots with rounded corners
      const slotY = startY + rows * pegSpacing + (isMobile 
        ? (rows === 8 ? 20 : rows === 12 ? 18 : 15)
        : isLargeScreen ? 50 * scaleFactor : 30);
      const slotHeight = isMobile ? 35 : isLargeScreen ? 55 * scaleFactor : 40;
      const slotRadius = isMobile ? 8 : isLargeScreen ? 12 : 8;
      multipliers.forEach((mult, index) => {
        const slotX = startX - (multipliers.length * slotWidth) / 2 + index * slotWidth;
        
        // Apply scale and glow to landing slot
        const isLandingSlot = hasLanded && index === resultSlot;
        
        if (isLandingSlot) {
          ctx.save();
          
          // Add glow effect
          const multColor = getMultiplierColor(mult);
          ctx.shadowBlur = 30 * slotGlowIntensity;
          ctx.shadowColor = multColor;
          
          // Scale from center
          const centerX = slotX + slotWidth / 2;
          const centerY = slotY + slotHeight / 2;
          ctx.translate(centerX, centerY);
          ctx.scale(slotScale, slotScale);
          ctx.translate(-centerX, -centerY);
        }
        
        // Helper function to draw rounded rectangle
        const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
        };
        
        // 3D Border Effect - Bottom/Right shadows (dark)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        drawRoundedRect(slotX + 2, slotY + 2, slotWidth - 2, slotHeight, slotRadius);
        ctx.fill();
        
        // 3D Border Effect - Top/Left highlights (light)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        drawRoundedRect(slotX - 1, slotY - 1, slotWidth - 2, slotHeight, slotRadius);
        ctx.fill();
        
        // Colorful multiplier slots based on value
        ctx.fillStyle = isLandingSlot ? getMultiplierColor(mult) : getMultiplierColor(mult, 0.6);
        drawRoundedRect(slotX, slotY, slotWidth - 2, slotHeight, slotRadius);
        ctx.fill();
        
        // Inner 3D border with rounded corners
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        drawRoundedRect(slotX + 1, slotY + 1, slotWidth - 4, slotHeight - 2, slotRadius - 1);
        ctx.stroke();
        
        // 3D Text effect for multipliers
        const fontSize = isMobile 
          ? (rows === 8 ? 11 : rows === 12 ? 9 : 8)
          : isLargeScreen 
            ? (rows === 8 ? 18 : rows === 12 ? 15 : 13) * scaleFactor
            : 12;
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        
        // Draw shadow layers for 3D depth
        for (let i = 3; i > 0; i--) {
          ctx.fillStyle = `rgba(0, 0, 0, ${0.3 - i * 0.08})`;
          ctx.fillText(`${mult}x`, slotX + slotWidth / 2 + i, slotY + slotHeight / 2 + 4 + i);
        }
        
        // Draw main text
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.shadowBlur = 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.fillText(`${mult}x`, slotX + slotWidth / 2, slotY + slotHeight / 2 + 4);
        ctx.shadowBlur = 0;
    
    if (isLandingSlot) {
      ctx.restore();
    }
  });

      // Draw particles
      particles.forEach((particle) => {
        const alpha = particle.life / particle.maxLife;
        
        // Use particle's color (for rainbow, update hue)
        let particleColor = particle.color;
        if (particle.hue !== undefined) {
          // Rainbow effect - cycle through hues
          particleColor = `hsl(${particle.hue}, 100%, 50%)`;
        }
        
        ctx.fillStyle = particleColor.replace(')', ` / ${alpha})`);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add particle glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = particleColor;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw ball (only if not landed) with neon glow
      if (!hasLanded) {
        // Outer glow - scaled for large screens
        const ballOuterGlow = isLargeScreen ? 40 * scaleFactor : 25;
        const ballInnerGlow = isLargeScreen ? 25 * scaleFactor : 15;
        
        ctx.shadowBlur = ballOuterGlow;
        ctx.shadowColor = primaryHsl;
        
        ctx.beginPath();
        ctx.arc(currentX, currentY, ballSize, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(currentX, currentY, 0, currentX, currentY, ballSize);
        gradient.addColorStop(0, 'white');
        gradient.addColorStop(0.3, primaryHsl);
        gradient.addColorStop(1, primaryHsl.replace(')', ' / 0.5)'));
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Inner bright core
        ctx.shadowBlur = ballInnerGlow;
        ctx.beginPath();
        ctx.arc(currentX, currentY, ballSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        
        ctx.shadowBlur = 0;
      }
    };

    const animate = () => {
      // Update peg glows
      for (let i = pegGlows.length - 1; i >= 0; i--) {
        pegGlows[i].intensity -= 2;
        if (pegGlows[i].intensity <= 0) {
          pegGlows.splice(i, 1);
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // Gravity for particles
        p.life -= 1;
        
        // Update rainbow hue
        if (p.hue !== undefined) {
          p.hue = (p.hue + 3) % 360;
        }
        
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
      
      // Animate slot scale and glow when landed
      if (hasLanded) {
        // Scale up animation
        if (slotScale < targetSlotScale) {
          slotScale += 0.015;
          if (slotScale > targetSlotScale) slotScale = targetSlotScale;
        }
        
        // Glow pulse effect
        if (slotGlowIntensity < 1) {
          slotGlowIntensity += 0.05;
          if (slotGlowIntensity > 1) slotGlowIntensity = 1;
        } else {
          // Fade out glow slowly
          slotGlowIntensity -= glowFadeSpeed;
          if (slotGlowIntensity < 0) slotGlowIntensity = 0;
        }
      }

      if (!hasLanded) {
        velocityY += gravity;
        currentY += velocityY;

        // Check collision with pegs
        for (let row = currentRow; row < rows; row++) {
          const pegsInRow = row + 3;
          const rowY = startY + row * pegSpacing;
          const rowStartX = startX - (pegsInRow - 1) * pegSpacing / 2;
          
          if (currentY >= rowY - 10 && currentY <= rowY + 10) {
            for (let col = 0; col < pegsInRow; col++) {
              const pegX = rowStartX + col * pegSpacing;
              const distance = Math.sqrt(Math.pow(currentX - pegX, 2) + Math.pow(currentY - rowY, 2));
              
            const collisionDistance = isLargeScreen ? 18 * scaleFactor : 12;
            if (distance < collisionDistance) {
              velocityY = -velocityY * bounceDecay;
              
              // Play peg hit sound
              playPlinkoPegHit();
              
              // Guide ball toward target slot
              const direction = targetX > currentX ? 1 : -1;
              const randomness = (Math.random() - 0.3) * pegSpacing * 0.5;
              currentX += direction * pegSpacing * 0.4 + randomness;
              
              currentRow = row + 1;
                
                // Add peg glow effect
                pegGlows.push({
                  x: pegX,
                  y: rowY,
                  intensity: 100,
                  maxIntensity: 100
                });
                
                break;
              }
            }
          }
        }

        // Check if reached bottom
        const finalY = startY + rows * pegSpacing + (isMobile 
          ? (rows === 8 ? 10 : rows === 12 ? 8 : 6)
          : isLargeScreen ? 25 * scaleFactor : 20);
        if (currentY >= finalY) {
          currentX = targetX;
          currentY = finalY;
          hasLanded = true;
          
          // Play slot landing sound
          playPlinkoSlotLand(multiplier);
          
          // Create particle burst
          const particleColors = getParticleColors(multiplier);
          const particleCount = Math.min(multiplier * 5, 50);
          
          for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 3;
            
            const particle: Particle = {
              x: targetX,
              y: finalY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 2,
              life: 60,
              maxLife: 60,
              size: 2 + Math.random() * 3,
              color: particleColors.color
            };
            
            // Add rainbow hue for high multipliers
            if (particleColors.type === 'rainbow') {
              particle.hue = (360 / particleCount) * i; // Distribute colors evenly
            }
            
            particles.push(particle);
          }
        }
      }

      draw();
      
      // Continue animation if ball hasn't landed or particles still exist
      if (!hasLanded || particles.length > 0) {
        requestAnimationFrame(animate);
      } else if (hasLanded && particles.length === 0 && onComplete) {
        // Call completion callback once animation fully finishes
        onComplete();
      }
    };

    animate();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        // Draw initial board
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Get computed CSS colors
          const computedStyle = getComputedStyle(document.documentElement);
          const primaryColor = computedStyle.getPropertyValue('--primary').trim();
          const mutedColor = computedStyle.getPropertyValue('--muted').trim();
          const primaryForeground = computedStyle.getPropertyValue('--primary-foreground').trim();
          
          const primaryHsl = `hsl(${primaryColor})`;
          const mutedHsl = `hsl(${mutedColor})`;
          const primaryForegroundHsl = `hsl(${primaryForeground})`;

          const multipliers = MULTIPLIERS[risk][rows];
          
          // Responsive sizing based on canvas dimensions
          const isMobile = canvas.width < 640;
          const isLargeScreen = canvas.width >= 1024;
          
          // Scale factors for better PC display - optimized for centered layout
          const scaleFactor = Math.min(container.clientWidth / 550, isLargeScreen ? 0.9 : 1);
          
          const pegSpacing = isMobile 
            ? (rows === 8 ? 32 : rows === 12 ? 24 : 20)
            : isLargeScreen 
              ? (rows === 8 ? 55 : rows === 12 ? 45 : 38) * scaleFactor
              : 40;
          const pegSize = isMobile ? 3 : isLargeScreen ? 7 * scaleFactor : 5;
          const slotWidth = isMobile 
            ? (rows === 8 ? Math.min(canvas.width / 9, 38) : rows === 12 ? Math.min(canvas.width / 13, 28) : Math.min(canvas.width / 17, 22))
            : isLargeScreen
              ? (rows === 8 ? 70 : rows === 12 ? 55 : 45) * scaleFactor
              : 50;
          
          const startX = canvas.width / 2;
          const startY = isMobile 
            ? (rows === 8 ? 30 : rows === 12 ? 25 : 20)
            : isLargeScreen ? 80 * scaleFactor : 50;
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          // Draw pegs with neon glow
          for (let row = 0; row < rows; row++) {
            const pegsInRow = row + 3;
            const rowY = startY + row * pegSpacing;
            const rowStartX = startX - (pegsInRow - 1) * pegSpacing / 2;
            
            for (let col = 0; col < pegsInRow; col++) {
              const pegX = rowStartX + col * pegSpacing;
              
              // Neon glow effect for pegs
              ctx.shadowBlur = 15;
              ctx.shadowColor = primaryHsl;
              
              ctx.beginPath();
              ctx.arc(pegX, rowY, pegSize, 0, Math.PI * 2);
              ctx.fillStyle = primaryHsl;
              ctx.fill();
              
              // Inner bright core
              ctx.shadowBlur = 8;
              ctx.beginPath();
              ctx.arc(pegX, rowY, pegSize * 0.6, 0, Math.PI * 2);
              ctx.fillStyle = 'white';
              ctx.fill();
              
              ctx.shadowBlur = 0;
            }
          }

          // Get color based on multiplier value (returns rgba format for canvas)
          const getMultiplierColor = (mult: number, alpha: number = 1) => {
            let r, g, b;
            if (mult < 0.5) [r, g, b] = [220, 38, 38];
            else if (mult < 1) [r, g, b] = [249, 115, 22];
            else if (mult < 2) [r, g, b] = [234, 179, 8];
            else if (mult < 5) [r, g, b] = [34, 197, 94];
            else if (mult < 10) [r, g, b] = [14, 165, 233];
            else if (mult < 20) [r, g, b] = [168, 85, 247];
            else [r, g, b] = [236, 72, 153];
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
          };
          
          // Draw multiplier slots with rounded corners
          const slotY = startY + rows * pegSpacing + (isMobile 
            ? (rows === 8 ? 20 : rows === 12 ? 18 : 15)
            : isLargeScreen ? 50 * scaleFactor : 30);
          const slotHeight = isMobile ? 35 : isLargeScreen ? 55 * scaleFactor : 40;
          const slotRadius = isMobile ? 8 : isLargeScreen ? 12 : 8;
          
          // Helper function to draw rounded rectangle
          const drawRoundedRect = (x: number, y: number, width: number, height: number, radius: number) => {
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + width - radius, y);
            ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
            ctx.lineTo(x + width, y + height - radius);
            ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            ctx.lineTo(x + radius, y + height);
            ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
          };
          
          multipliers.forEach((mult, index) => {
            const slotX = startX - (multipliers.length * slotWidth) / 2 + index * slotWidth;
            
            // 3D Border Effect - Bottom/Right shadows (dark)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            drawRoundedRect(slotX + 2, slotY + 2, slotWidth - 2, slotHeight, slotRadius);
            ctx.fill();
            
            // 3D Border Effect - Top/Left highlights (light)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            drawRoundedRect(slotX - 1, slotY - 1, slotWidth - 2, slotHeight, slotRadius);
            ctx.fill();
            
            // Colorful multiplier slots based on value
            ctx.fillStyle = getMultiplierColor(mult, 0.6);
            drawRoundedRect(slotX, slotY, slotWidth - 2, slotHeight, slotRadius);
            ctx.fill();
            
            // Inner 3D border with rounded corners
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            drawRoundedRect(slotX + 1, slotY + 1, slotWidth - 4, slotHeight - 2, slotRadius - 1);
            ctx.stroke();
            
            // 3D Text effect for multipliers
            const fontSize = isMobile 
              ? (rows === 8 ? 11 : rows === 12 ? 9 : 8)
              : isLargeScreen 
                ? (rows === 8 ? 18 : rows === 12 ? 15 : 13) * scaleFactor
                : 12;
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            
            // Draw shadow layers for 3D depth
            for (let i = 3; i > 0; i--) {
              ctx.fillStyle = `rgba(0, 0, 0, ${0.3 - i * 0.08})`;
              ctx.fillText(`${mult}x`, slotX + slotWidth / 2 + i, slotY + slotHeight / 2 + 4 + i);
            }
            
            // Draw main text
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.shadowBlur = 2;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.fillText(`${mult}x`, slotX + slotWidth / 2, slotY + slotHeight / 2 + 4);
            ctx.shadowBlur = 0;
          });
        }
      }
    };

    // Initial resize with delay to ensure container has dimensions
    const initialResize = setTimeout(() => {
      resizeCanvas();
    }, 100);
    
    // Also call immediately
    resizeCanvas();
    
    window.addEventListener('resize', resizeCanvas);

    return () => {
      clearTimeout(initialResize);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [rows, risk]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DesktopNav isAuthenticated={!!user} />
      
      <AuthDrawer open={showAuthDrawer} onOpenChange={setShowAuthDrawer} />
      
      <div className="flex-1 container mx-auto px-2 pt-4 pb-20 md:pt-28 md:pb-4 lg:pt-32 lg:pb-8 max-w-[1920px]">
        {/* Wallet Display - Mobile */}
        <div className="md:hidden mb-3">
          <Card className="p-2.5 bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm border-2 border-primary/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 -ml-1"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <span className="text-xs font-medium text-muted-foreground">Balance</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-md border border-green-500/30 font-semibold">
                  Provably Fair
                </span>
              </div>
              <span className="text-sm font-bold text-foreground">{symbol}{balance.toFixed(2)}</span>
            </div>
          </Card>
        </div>

        {/* Desktop Header - Balance & Provably Fair */}
        <div className="hidden lg:block mb-6 max-w-[1800px] mx-auto">
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 backdrop-blur-sm border-2 border-primary/20 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 -ml-1"
                  onClick={() => navigate(-1)}
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
                <span className="text-base font-medium text-muted-foreground">Balance</span>
                <span className="text-xl font-bold text-foreground">{symbol}{balance.toFixed(2)}</span>
              </div>
              <span className="text-xs px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 font-semibold">
                Provably Fair
              </span>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-[1600px] mx-auto">
          {/* Left Side - Bet Controls */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <Card className="p-2.5 md:p-3 space-y-2.5 bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm border-2 rounded-2xl">
              <Tabs defaultValue="manual" className="w-full" onValueChange={(value) => setActiveTab(value as 'manual' | 'auto')}>
                <div className="mb-2.5">
                  {/* Dynamic Button Based on Tab and State */}
                  {isAutoBet ? (
                    <Button
                      className="w-full h-10 md:h-11 text-sm font-bold rounded-xl shadow-lg"
                      onClick={stopAutoBet}
                      variant="destructive"
                    >
                      Stop Auto-Bet
                    </Button>
                  ) : activeTab === 'manual' ? (
                    <Button
                      className="w-full h-10 md:h-11 text-sm font-bold rounded-xl shadow-lg"
                      onClick={() => playPlinko()}
                      disabled={isPlaying}
                    >
                      {isPlaying ? "Dropping..." : "Drop Ball"}
                    </Button>
                  ) : (
                    <Button
                      className="w-full h-10 md:h-11 text-sm font-bold rounded-xl shadow-lg bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600 text-black border-2 border-yellow-400/50"
                      onClick={startAutoBet}
                      disabled={isPlaying}
                    >
                      Start AutoBet
                    </Button>
                  )}
                </div>

                <TabsList className="grid w-full grid-cols-2 h-9 md:h-10 rounded-xl bg-muted/50">
                  <TabsTrigger value="manual" className="text-xs md:text-sm font-semibold rounded-lg">Manual</TabsTrigger>
                  <TabsTrigger value="auto" className="text-xs md:text-sm font-semibold rounded-lg">Auto</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-2.5 mt-2.5">
                  {/* Bet Amount */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Bet Amount</label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      className="h-8 md:h-9 text-center text-sm font-semibold rounded-lg border-2"
                      min={settings?.min_bet || 1}
                      max={settings?.max_bet || 10000}
                    />
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1 text-xs font-bold rounded-lg"
                        onClick={() => setBetAmount(Math.max((settings?.min_bet || 1), betAmount / 2))}
                      >
                        ½
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1 text-xs font-bold rounded-lg"
                        onClick={() => setBetAmount(Math.min((settings?.max_bet || 10000), betAmount * 2))}
                      >
                        2×
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1 text-xs font-bold rounded-lg"
                        onClick={() => setBetAmount(Math.min((settings?.max_bet || 10000), balance))}
                      >
                        Max
                      </Button>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Rows</label>
                    <div className="flex gap-1.5">
                      {[8, 12, 16].map((r) => (
                        <Button
                          key={r}
                          variant={rows === r ? "default" : "outline"}
                          size="sm"
                          className="h-8 flex-1 text-xs font-bold rounded-lg"
                          onClick={() => setRows(r as 8 | 12 | 16)}
                        >
                          {r}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Game Mode */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Game Mode</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant={gameMode === 'lightning' ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs font-bold rounded-lg ${
                          gameMode === 'lightning' 
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black shadow-lg' 
                            : ''
                        }`}
                        onClick={() => {
                          setGameMode('lightning');
                          setRisk('low');
                        }}
                      >
                        Lightning
                      </Button>
                      <Button
                        variant={gameMode === 'low' ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs font-bold rounded-lg ${
                          gameMode === 'low' 
                            ? 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white shadow-lg' 
                            : ''
                        }`}
                        onClick={() => {
                          setGameMode('low');
                          setRisk('low');
                        }}
                      >
                        Low
                      </Button>
                      <Button
                        variant={gameMode === 'medium' ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs font-bold rounded-lg ${
                          gameMode === 'medium' 
                            ? 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white shadow-lg' 
                            : ''
                        }`}
                        onClick={() => {
                          setGameMode('medium');
                          setRisk('medium');
                        }}
                      >
                        Medium
                      </Button>
                      <Button
                        variant={gameMode === 'high' ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs font-bold rounded-lg ${
                          gameMode === 'high' 
                            ? 'bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-lg' 
                            : ''
                        }`}
                        onClick={() => {
                          setGameMode('high');
                          setRisk('high');
                        }}
                      >
                        High
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="auto" className="space-y-2.5 mt-2.5">
                  {/* Remaining Bets Counter - Pill Shape */}
                  {isAutoBet && (
                    <div className="flex items-center justify-center">
                      <div className="bg-gradient-to-r from-primary/20 to-primary/10 rounded-full px-3 py-1.5 border-2 border-primary/30 backdrop-blur-sm">
                        <span className="text-xs font-bold text-primary">
                          Remaining: {autoBetCount - currentAutoBetRound} / {autoBetCount}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bet Amount */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Bet Amount</label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Number(e.target.value))}
                      className="h-8 md:h-9 text-center text-sm font-semibold rounded-lg border-2"
                      min={settings?.min_bet || 1}
                      max={settings?.max_bet || 10000}
                    />
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1 text-xs font-bold rounded-lg"
                        onClick={() => setBetAmount(Math.max((settings?.min_bet || 1), betAmount / 2))}
                      >
                        ½
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1 text-xs font-bold rounded-lg"
                        onClick={() => setBetAmount(Math.min((settings?.max_bet || 10000), betAmount * 2))}
                      >
                        2×
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 flex-1 text-xs font-bold rounded-lg"
                        onClick={() => setBetAmount(Math.min((settings?.max_bet || 10000), balance))}
                      >
                        Max
                      </Button>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Rows</label>
                    <div className="flex gap-1.5">
                      {[8, 12, 16].map((r) => (
                        <Button
                          key={r}
                          variant={rows === r ? "default" : "outline"}
                          size="sm"
                          className="h-8 flex-1 text-xs font-bold rounded-lg"
                          onClick={() => setRows(r as 8 | 12 | 16)}
                        >
                          {r}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Game Mode */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Game Mode</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant={gameMode === 'lightning' ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs font-bold rounded-lg ${
                          gameMode === 'lightning' 
                            ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black shadow-lg' 
                            : ''
                        }`}
                        onClick={() => {
                          setGameMode('lightning');
                          setRisk('low');
                        }}
                      >
                        Lightning
                      </Button>
                      <Button
                        variant={gameMode === 'low' ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs font-bold rounded-lg ${
                          gameMode === 'low' 
                            ? 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white shadow-lg' 
                            : ''
                        }`}
                        onClick={() => {
                          setGameMode('low');
                          setRisk('low');
                        }}
                      >
                        Low
                      </Button>
                      <Button
                        variant={gameMode === 'medium' ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs font-bold rounded-lg ${
                          gameMode === 'medium' 
                            ? 'bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white shadow-lg' 
                            : ''
                        }`}
                        onClick={() => {
                          setGameMode('medium');
                          setRisk('medium');
                        }}
                      >
                        Medium
                      </Button>
                      <Button
                        variant={gameMode === 'high' ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs font-bold rounded-lg ${
                          gameMode === 'high' 
                            ? 'bg-gradient-to-br from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 text-white shadow-lg' 
                            : ''
                        }`}
                        onClick={() => {
                          setGameMode('high');
                          setRisk('high');
                        }}
                      >
                        High
                      </Button>
                    </div>
                  </div>

                  {/* Number of Drops */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Number of Drops</label>
                    <Input
                      type="number"
                      value={autoBetCount}
                      onChange={(e) => setAutoBetCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="h-8 md:h-9 text-sm rounded-lg border-2"
                      min="1"
                    />
                  </div>

                  {/* Delay */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Delay (ms)</label>
                    <Input
                      type="number"
                      value={autoBetDelay}
                      onChange={(e) => setAutoBetDelay(Math.max(100, parseInt(e.target.value) || 1000))}
                      className="h-8 md:h-9 text-sm rounded-lg border-2"
                      min="100"
                      step="100"
                    />
                  </div>

                  {/* Stop on Profit */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Stop on Profit (optional)</label>
                    <Input
                      type="number"
                      value={autoBetStopOnProfit || ''}
                      onChange={(e) => setAutoBetStopOnProfit(e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 md:h-9 text-sm rounded-lg border-2"
                      placeholder="No limit"
                    />
                  </div>

                  {/* Stop on Loss */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Stop on Loss (optional)</label>
                    <Input
                      type="number"
                      value={autoBetStopOnLoss || ''}
                      onChange={(e) => setAutoBetStopOnLoss(e.target.value ? parseFloat(e.target.value) : null)}
                      className="h-8 md:h-9 text-sm rounded-lg border-2"
                      placeholder="No limit"
                    />
                  </div>

                  {/* Purple Info Bar */}
                  {!isAutoBet && (
                    <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg px-2.5 py-1.5 backdrop-blur-sm">
                      <p className="text-[10px] md:text-xs text-purple-300 text-center font-medium">
                        Auto-bet continues until stopped or conditions met
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>

          {/* Middle - Game Board */}
          <div className="lg:col-span-6 order-1 lg:order-2 flex justify-center items-start">
            <Card className="p-2 w-full max-w-md lg:max-w-sm h-[400px] sm:h-[450px] lg:h-[420px] bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm border-2 rounded-2xl">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
              />
            </Card>
          </div>

          {/* Right Side - Bets & Info */}
          <div className="lg:col-span-3 order-3">
            <Tabs defaultValue="mybets" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-10 md:h-11 rounded-xl bg-muted/50">
                <TabsTrigger value="mybets" className="text-xs font-semibold rounded-lg">My Bets</TabsTrigger>
                <TabsTrigger value="fairness" className="text-xs font-semibold rounded-lg">Fairness</TabsTrigger>
              </TabsList>

              <TabsContent value="mybets" className="mt-3">
                <Card className="p-3 h-[300px] lg:h-[420px] overflow-y-auto bg-gradient-to-br from-card/95 to-card/80 backdrop-blur-sm border-2 rounded-2xl">
                  <div className="space-y-2">
                    {myBets.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-8">No bets yet</p>
                    ) : (
                      myBets.map((bet) => (
                        <div
                          key={bet.id}
                          className="p-3 rounded-xl bg-gradient-to-br from-card to-card/50 border-2 border-border/50 hover:border-primary/30 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">{bet.rows} Rows • {bet.risk}</span>
                            <Badge variant={bet.profit > 0 ? "default" : "destructive"} className="text-xs font-bold rounded-lg">
                              {bet.multiplier}x
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Bet: {symbol}{bet.amount.toFixed(2)}</span>
                            <span className={bet.profit > 0 ? "text-green-500 font-bold" : "text-red-500 font-bold"}>
                              {bet.profit > 0 ? "+" : ""}{symbol}{bet.profit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="fairness" className="mt-3">
                <div className="h-[300px] lg:h-[420px] overflow-y-auto">
                  <PlinkoProvablyFair />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <BottomNav isAuthenticated={!!user} />
    </div>
  );
}
