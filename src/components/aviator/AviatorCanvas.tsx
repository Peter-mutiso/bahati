import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import rafaleJet from "@/assets/games/rafale-jet.png";

// Runway motion blur and shockwave animations
const runwayAnimationStyles = `
  @keyframes slideRight {
    from { transform: translateX(0); }
    to { transform: translateX(200%); }
  }
  @keyframes shockwaveExpand {
    0% {
      transform: translate(-50%, -50%) scale(0.3);
      opacity: 0.9;
      border-width: 4px;
    }
    50% {
      opacity: 0.6;
      border-width: 2px;
    }
    100% {
      transform: translate(-50%, -50%) scale(3);
      opacity: 0;
      border-width: 1px;
    }
  }
  @keyframes sonicBoomFlash {
    0% { opacity: 0; }
    20% { opacity: 0.3; }
    100% { opacity: 0; }
  }
  @keyframes flameFlicker {
    0% {
      transform: translateX(-10px) translateY(-2px) scaleX(0.92) scaleY(0.95);
      opacity: 0.85;
    }
    100% {
      transform: translateX(-10px) translateY(-3px) scaleX(1.08) scaleY(1.05);
      opacity: 1;
    }
  }
  @keyframes flameGlow {
    0% {
      opacity: 0.4;
      filter: blur(4px);
    }
    100% {
      opacity: 0.7;
      filter: blur(6px);
    }
  }
`;

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: 'fire' | 'smoke' | 'spark' | 'debris';
  size: number;
  rotation: number;
  rotationSpeed: number;
}

interface AviatorCanvasProps {
  currentMultiplier?: number;
  isFlying?: boolean;
  crashed?: boolean;
  isPreparing?: boolean;
  timeLeft?: number;
}

const AviatorCanvas = ({ currentMultiplier = 1.0, isFlying = false, crashed = false, isPreparing = false, timeLeft = 0 }: AviatorCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [planePos, setPlanePos] = useState({ x: 20, y: 0 });
  const [planeScale, setPlaneScale] = useState(0.6);
  const prevPosRef = useRef({ x: 20, y: 0 });
  
  const safeMultiplier = typeof currentMultiplier === 'number' && !isNaN(currentMultiplier) ? currentMultiplier : 1.0;
  const safeMultiplierRef = useRef(safeMultiplier);
  safeMultiplierRef.current = safeMultiplier;
  const prevMultiplierRef = useRef(1.0);
  
  const [explosionParticles, setExplosionParticles] = useState<Particle[]>([]);
  const [cloudOffset, setCloudOffset] = useState(0);
  const [afterburnerIntensity, setAfterburnerIntensity] = useState(0);
  
  // Takeoff animation states
  const [takeoffPhase, setTakeoffPhase] = useState<'idle' | 'accelerating' | 'lifting' | 'flying'>('idle');
  const [runwayPosition, setRunwayPosition] = useState(20);
  const [liftProgress, setLiftProgress] = useState(0);
  const takeoffStartTimeRef = useRef<number | null>(null);
  
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [justHitMilestone, setJustHitMilestone] = useState(false);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const [sonicBoomActive, setSonicBoomActive] = useState(false);
  const [shockwaveRings, setShockwaveRings] = useState<number[]>([]);
  const [crashFlash, setCrashFlash] = useState(false);

  // Smooth multiplier animation
  useEffect(() => {
    const animationSpeed = 0.5;
    let animationFrameId: number;
    
    const animateMultiplier = () => {
      setDisplayMultiplier(prev => {
        const diff = safeMultiplier - prev;
        if (Math.abs(diff) < 0.005) return safeMultiplier;
        return prev + diff * animationSpeed;
      });
      animationFrameId = requestAnimationFrame(animateMultiplier);
    };
    
    animationFrameId = requestAnimationFrame(animateMultiplier);
    return () => cancelAnimationFrame(animationFrameId);
  }, [safeMultiplier]);
  
  // Check for milestones and sonic boom
  useEffect(() => {
    const milestones = [2, 5, 10, 20, 50, 100];
    const currentMilestone = milestones.find(m => 
      prevMultiplierRef.current < m && safeMultiplier >= m
    );
    
    if (currentMilestone) {
      setMilestone(currentMilestone);
      setJustHitMilestone(true);
      setTimeout(() => setJustHitMilestone(false), 1000);
      
      // Trigger sonic boom at 10x+
      if (currentMilestone >= 10) {
        setSonicBoomActive(true);
        // Add new shockwave ring
        setShockwaveRings(prev => [...prev, Date.now()]);
        setTimeout(() => setSonicBoomActive(false), 500);
      }
    }
    
    prevMultiplierRef.current = safeMultiplier;
  }, [safeMultiplier]);
  
  // Clean up old shockwave rings
  useEffect(() => {
    if (shockwaveRings.length === 0) return;
    const timer = setTimeout(() => {
      setShockwaveRings(prev => prev.slice(1));
    }, 1500);
    return () => clearTimeout(timer);
  }, [shockwaveRings]);
  
  // Continuous shockwaves at very high multipliers
  useEffect(() => {
    if (safeMultiplier < 10 || !isFlying || crashed) {
      setShockwaveRings([]);
      return;
    }
    
    const interval = setInterval(() => {
      if (safeMultiplier >= 20) {
        setShockwaveRings(prev => [...prev.slice(-3), Date.now()]);
      } else if (safeMultiplier >= 10) {
        setShockwaveRings(prev => [...prev.slice(-2), Date.now()]);
      }
    }, safeMultiplier >= 50 ? 300 : safeMultiplier >= 20 ? 500 : 800);
    
    return () => clearInterval(interval);
  }, [safeMultiplier, isFlying, crashed]);

  // Responsive plane sizing
  useEffect(() => {
    const updatePlaneSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setPlaneScale(0.5);
      } else if (width < 768) {
        setPlaneScale(0.55);
      } else if (width < 1024) {
        setPlaneScale(0.6);
      } else {
        setPlaneScale(0.7);
      }
    };
    
    updatePlaneSize();
    window.addEventListener('resize', updatePlaneSize);
    return () => window.removeEventListener('resize', updatePlaneSize);
  }, []);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    setCanvasWidth(canvas.offsetWidth);

    // Draw dreamy daydream sky background
    const drawSky = (offset: number) => {
      const canvasHeight = canvas.offsetHeight;
      const canvasWidth = canvas.offsetWidth;
      
      // Daydream gradient - soft pastels with warm tones
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      if (crashed) {
        skyGradient.addColorStop(0, "#2d1b1b");
        skyGradient.addColorStop(0.3, "#4a2020");
        skyGradient.addColorStop(0.6, "#3d1515");
        skyGradient.addColorStop(1, "#1a0a0a");
      } else if (isFlying) {
        // Flying - golden hour dreamy sky
        skyGradient.addColorStop(0, "#1a1035");
        skyGradient.addColorStop(0.2, "#2d1f4a");
        skyGradient.addColorStop(0.4, "#4a2d5c");
        skyGradient.addColorStop(0.6, "#6b3a5c");
        skyGradient.addColorStop(0.8, "#8b4a4a");
        skyGradient.addColorStop(1, "#c4785a");
      } else {
        // Idle/preparing - soft dawn sky
        skyGradient.addColorStop(0, "#1a1530");
        skyGradient.addColorStop(0.3, "#2a1f45");
        skyGradient.addColorStop(0.5, "#3d2850");
        skyGradient.addColorStop(0.7, "#5a3555");
        skyGradient.addColorStop(1, "#7a4a50");
      }
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Animated light rays (god rays effect)
      const rayCount = 8;
      for (let i = 0; i < rayCount; i++) {
        const rayX = (canvasWidth / rayCount) * i + Math.sin(offset * 0.003 + i) * 30;
        const rayWidth = 40 + Math.sin(offset * 0.005 + i * 0.5) * 20;
        const rayOpacity = 0.03 + Math.sin(offset * 0.004 + i) * 0.02;
        
        const rayGradient = ctx.createLinearGradient(rayX, 0, rayX + rayWidth, canvasHeight);
        rayGradient.addColorStop(0, `rgba(255, 200, 150, ${rayOpacity})`);
        rayGradient.addColorStop(0.5, `rgba(255, 180, 130, ${rayOpacity * 0.5})`);
        rayGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = rayGradient;
        ctx.beginPath();
        ctx.moveTo(rayX - 20, 0);
        ctx.lineTo(rayX + rayWidth + 40, canvasHeight);
        ctx.lineTo(rayX + rayWidth - 20, canvasHeight);
        ctx.lineTo(rayX - 60, 0);
        ctx.closePath();
        ctx.fill();
      }
      
      // Dreamy floating particles (dust motes in sunlight)
      for (let i = 0; i < 40; i++) {
        const particleX = (i * 47 + offset * 0.3) % canvasWidth;
        const particleY = (i * 31 + Math.sin(offset * 0.02 + i) * 20) % canvasHeight;
        const particleSize = 1 + Math.sin(offset * 0.01 + i) * 0.5;
        const particleOpacity = 0.2 + Math.sin(offset * 0.015 + i * 0.5) * 0.15;
        
        ctx.fillStyle = `rgba(255, 220, 180, ${particleOpacity})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Soft fluffy clouds - multiple layers for depth
      const drawCloud = (x: number, y: number, scale: number, opacity: number) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        // Main cloud body
        ctx.beginPath();
        ctx.ellipse(x, y, 80 * scale, 25 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 50 * scale, y + 5 * scale, 50 * scale, 20 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 50 * scale, y + 8 * scale, 55 * scale, 18 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 20 * scale, y - 15 * scale, 40 * scale, 20 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 30 * scale, y - 10 * scale, 35 * scale, 18 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      };
      
      // Background clouds (far, slow moving)
      for (let i = -1; i <= 5; i++) {
        const cloudX = i * 300 - (offset * 0.2 % 300);
        drawCloud(cloudX, canvasHeight * 0.25, 0.6, 0.04);
      }
      
      // Mid-layer clouds
      for (let i = -1; i <= 4; i++) {
        const cloudX = i * 350 - (offset * 0.5 % 350) + 100;
        drawCloud(cloudX, canvasHeight * 0.45, 0.8, 0.06);
      }
      
      // Foreground clouds (close, faster moving)
      for (let i = -1; i <= 3; i++) {
        const cloudX = i * 400 - (offset * 1.2 % 400) + 50;
        drawCloud(cloudX, canvasHeight * 0.7, 1.2, 0.08);
      }
      
      // Subtle lens flare effect when flying high
      if (isFlying && safeMultiplier > 2) {
        const flareOpacity = Math.min((safeMultiplier - 2) * 0.02, 0.15);
        const flareGradient = ctx.createRadialGradient(
          canvasWidth * 0.8, canvasHeight * 0.15, 0,
          canvasWidth * 0.8, canvasHeight * 0.15, 150
        );
        flareGradient.addColorStop(0, `rgba(255, 200, 100, ${flareOpacity})`);
        flareGradient.addColorStop(0.3, `rgba(255, 150, 80, ${flareOpacity * 0.5})`);
        flareGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = flareGradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      drawSky(cloudOffset);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [cloudOffset, isFlying, crashed]);

  // Animate clouds and afterburner
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      // Afterburner intensity
      if (takeoffPhase === 'accelerating') {
        setAfterburnerIntensity(prev => Math.min(prev + 0.05, 0.7));
      } else if (takeoffPhase === 'lifting' || takeoffPhase === 'flying' || isFlying) {
        setAfterburnerIntensity(prev => Math.min(prev + 0.02, 1));
      } else if (isPreparing) {
        setAfterburnerIntensity(0.2 + (5 - Math.min(timeLeft, 5)) * 0.1);
      } else {
        setAfterburnerIntensity(prev => Math.max(prev - 0.05, 0));
      }
      
      if (isFlying || takeoffPhase === 'flying') {
        const baseSpeed = 2 + Math.min(safeMultiplier * 0.3, 8);
        setCloudOffset(prev => prev + baseSpeed);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isFlying, safeMultiplier, takeoffPhase, isPreparing, timeLeft]);

  // Takeoff animation sequence
  useEffect(() => {
    if (isFlying && takeoffPhase === 'idle') {
      // Start takeoff sequence
      setTakeoffPhase('accelerating');
      takeoffStartTimeRef.current = Date.now();
      setRunwayPosition(20);
      setLiftProgress(0);
    }
    
    if (!isFlying && !isPreparing) {
      // Reset to idle
      setTakeoffPhase('idle');
      setRunwayPosition(20);
      setLiftProgress(0);
      setPlanePos({ x: 20, y: 0 });
      prevPosRef.current = { x: 20, y: 0 };
      prevMultiplierRef.current = 1.0;
      setExplosionParticles([]);
      setCloudOffset(0);
      takeoffStartTimeRef.current = null;
    }
    
    if (crashed) {
      setTakeoffPhase('idle');
    }
  }, [isFlying, isPreparing, crashed]);

  // Runway acceleration and liftoff animation
  useEffect(() => {
    if (takeoffPhase !== 'accelerating' && takeoffPhase !== 'lifting') return;
    
    let animationFrameId: number;
    const accelerationDuration = 800; // ms to reach liftoff point
    const liftDuration = 400; // ms for liftoff
    
    const animate = () => {
      if (!takeoffStartTimeRef.current) return;
      
      const elapsed = Date.now() - takeoffStartTimeRef.current;
      
      if (takeoffPhase === 'accelerating') {
        // Accelerate along runway
        const progress = Math.min(elapsed / accelerationDuration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 2);
        
        // Move from left (20) to center-right (about 100)
        const newRunwayPos = 20 + easeOut * 80;
        setRunwayPosition(newRunwayPos);
        setPlanePos({ x: newRunwayPos, y: 0 });
        
        if (progress >= 1) {
          setTakeoffPhase('lifting');
          takeoffStartTimeRef.current = Date.now();
        }
      } else if (takeoffPhase === 'lifting') {
        // Lift off the ground
        const liftElapsed = Date.now() - takeoffStartTimeRef.current;
        const liftProg = Math.min(liftElapsed / liftDuration, 1);
        const easeOut = 1 - Math.pow(1 - liftProg, 3);
        
        setLiftProgress(easeOut);
        setPlanePos({ x: 100 + easeOut * 20, y: easeOut * 30 });
        
        if (liftProg >= 1) {
          setTakeoffPhase('flying');
          prevPosRef.current = { x: 120, y: 30 };
        }
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [takeoffPhase]);

  // Update plane position during flight (after takeoff) - pure smooth time-based flight
  useEffect(() => {
    if (takeoffPhase !== 'flying' || crashed) return;

    let animationFrameId: number;
    const flightStartTime = performance.now();
    
    // Fixed start position (where liftoff ends)
    const startX = 120;
    const startY = 30;
    
    // Fixed target position (top right area)
    const targetX = 280;
    const targetY = 110;
    
    // Flight duration in milliseconds
    const flightDuration = 12000;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - flightStartTime;
      const progress = Math.min(elapsed / flightDuration, 1);
      
      // Smooth easing for natural flight feel
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      // Interpolate position from start to target
      const newX = startX + (targetX - startX) * easeProgress;
      const newY = startY + (targetY - startY) * easeProgress;
      
      // Subtle floating motion
      const floatY = Math.sin(currentTime * 0.002) * 1.5;
      
      prevPosRef.current = { x: newX, y: newY };
      setPlanePos({ x: newX, y: newY + floatY });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [takeoffPhase, crashed]);

  // Explosion particles
  useEffect(() => {
    if (crashed && explosionParticles.length === 0) {
      const newParticles: Particle[] = [];
      const centerX = planePos.x + 60;
      const centerY = 150 - planePos.y;
      
      for (let i = 0; i < 40; i++) {
        const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.5;
        const speed = 4 + Math.random() * 10;
        newParticles.push({
          id: i,
          x: centerX + (Math.random() - 0.5) * 40,
          y: centerY + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          life: 1,
          type: 'fire',
          size: 10 + Math.random() * 15,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 20,
        });
      }
      
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        newParticles.push({
          id: 40 + i,
          x: centerX + (Math.random() - 0.5) * 60,
          y: centerY + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: -1 - Math.random() * 3,
          life: 1,
          type: 'smoke',
          size: 25 + Math.random() * 35,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 5,
        });
      }
      
      setExplosionParticles(newParticles);
      setCrashFlash(true);
      setTimeout(() => setCrashFlash(false), 150);
    }
    
    if (!crashed) {
      setExplosionParticles([]);
    }
  }, [crashed, planePos.x, planePos.y]);

  // Screen shake
  useEffect(() => {
    if (!crashed) {
      setScreenShake({ x: 0, y: 0 });
      return;
    }
    
    let frameCount = 0;
    let animationFrameId: number;
    
    const shake = () => {
      frameCount++;
      const intensity = Math.max(0, 1 - frameCount / 30) * 10;
      setScreenShake({
        x: (Math.random() - 0.5) * intensity,
        y: (Math.random() - 0.5) * intensity,
      });
      
      if (frameCount < 30) {
        animationFrameId = requestAnimationFrame(shake);
      } else {
        setScreenShake({ x: 0, y: 0 });
      }
    };
    
    animationFrameId = requestAnimationFrame(shake);
    return () => cancelAnimationFrame(animationFrameId);
  }, [crashed]);

  // Animate explosion particles
  useEffect(() => {
    if (explosionParticles.length === 0) return;

    let animationFrameId: number;
    
    const animateExplosion = () => {
      setExplosionParticles(prev => 
        prev
          .map(p => {
            let gravity, drag, decay;
            
            switch (p.type) {
              case 'smoke':
                gravity = -0.02;
                drag = 0.98;
                decay = 0.012;
                break;
              case 'spark':
                gravity = 0.3;
                drag = 0.99;
                decay = 0.035;
                break;
              default:
                gravity = 0.2;
                drag = 0.97;
                decay = 0.02;
            }
            
            return {
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vx: p.vx * drag,
              vy: p.vy * drag + gravity,
              life: p.life - decay,
              rotation: p.rotation + p.rotationSpeed,
            };
          })
          .filter(p => p.life > 0)
      );
      animationFrameId = requestAnimationFrame(animateExplosion);
    };

    animationFrameId = requestAnimationFrame(animateExplosion);
    return () => cancelAnimationFrame(animationFrameId);
  }, [explosionParticles.length]);

  const getMultiplierColor = () => {
    if (crashed) return "text-red-500";
    if (safeMultiplier >= 10) return "text-yellow-400";
    if (safeMultiplier >= 5) return "text-orange-400";
    if (safeMultiplier >= 2) return "text-red-400";
    return "text-red-300";
  };

  return (
    <>
      <style>{runwayAnimationStyles}</style>
      <Card 
        ref={containerRef}
        className="relative overflow-hidden border-red-900/30 bg-gradient-to-b from-slate-900/95 to-red-950/30 backdrop-blur-sm shadow-2xl shadow-red-500/10"
        style={{
          transform: `translate(${screenShake.x}px, ${screenShake.y}px)`,
        }}
      >
        {crashFlash && (
          <div className="absolute inset-0 bg-red-500/40 z-30 pointer-events-none" />
        )}
      
      <canvas
        ref={canvasRef}
        className="w-full h-64 sm:h-72 md:h-80 lg:h-96"
      />
      
      {/* Runway/Ramp for takeoff */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 h-12 sm:h-14 md:h-16 transition-all duration-300",
          (takeoffPhase === 'lifting' || takeoffPhase === 'flying') && "opacity-0 translate-y-4"
        )}
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(30,30,30,0.9) 30%, #1a1a1a 100%)',
          opacity: takeoffPhase === 'lifting' ? 1 - liftProgress : takeoffPhase === 'flying' ? 0 : 1,
        }}
      >
        {/* Motion blur lines during acceleration */}
        {takeoffPhase === 'accelerating' && (
          <div className="absolute inset-0 overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="absolute h-0.5 bg-gradient-to-r from-transparent via-yellow-400/40 to-transparent animate-pulse"
                style={{
                  left: `${-100 + (i * 15)}%`,
                  top: `${30 + i * 8}%`,
                  width: '60%',
                  animation: `slideRight 0.3s linear infinite`,
                  animationDelay: `${i * 0.03}s`,
                }}
              />
            ))}
          </div>
        )}
        
        {/* Runway surface */}
        <div className="absolute bottom-0 left-0 right-0 h-8 sm:h-10 bg-gradient-to-b from-gray-700 to-gray-800">
          {/* Center line markings - animate during takeoff */}
          <div 
            className="absolute top-1/2 left-0 right-0 h-1 flex items-center gap-4"
            style={{
              transform: takeoffPhase === 'accelerating' ? `translateX(${-runwayPosition * 2}px)` : 'translateX(0)',
              transition: takeoffPhase === 'accelerating' ? 'none' : 'transform 0.3s ease-out',
            }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="w-8 h-0.5 bg-yellow-400/60 flex-shrink-0" />
            ))}
          </div>
          {/* Edge lights - sequential animation during takeoff */}
          <div className="absolute bottom-1 left-4 right-4 flex justify-between">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={cn(
                "w-1.5 h-1.5 rounded-full transition-all duration-150",
                takeoffPhase === 'accelerating' 
                  ? i <= Math.floor((runwayPosition - 20) / 7) 
                    ? "bg-green-400 shadow-[0_0_12px_rgba(74,222,128,1)] scale-125" 
                    : "bg-yellow-400/50 shadow-[0_0_4px_rgba(250,204,21,0.5)]"
                  : takeoffPhase === 'lifting' || takeoffPhase === 'flying'
                    ? "bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"
                    : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]"
              )} />
            ))}
          </div>
        </div>
        {/* Ramp incline - only show when idle */}
        {takeoffPhase === 'idle' && !isPreparing && (
          <div 
            className="absolute bottom-8 sm:bottom-10 left-[20px] w-16 h-3"
            style={{
              background: 'linear-gradient(135deg, #4b5563 0%, #374151 100%)',
              clipPath: 'polygon(0 100%, 100% 0, 100% 100%)',
            }}
          />
        )}
      </div>
      
      {/* 3D Red Rafale Jet Sprite */}
      <div
        className={cn(
          "absolute z-10",
          crashed && "opacity-0"
        )}
        style={{
          left: `${planePos.x}px`,
          bottom: `${-15 + planePos.y}px`,
          transform: `scale(${planeScale}) scaleX(-1) rotate(${
            takeoffPhase === 'accelerating' ? 0 :
            takeoffPhase === 'lifting' ? liftProgress * 15 :
            takeoffPhase === 'flying' ? 18 :
            0
          }deg)`,
          transformOrigin: 'center center',
        }}
      >
        <img 
          src={rafaleJet} 
          alt="Rafale Jet" 
          className="w-40 sm:w-48 md:w-56 lg:w-64 h-auto"
          style={{ 
            filter: 'drop-shadow(0 8px 25px rgba(239,68,68,0.5)) drop-shadow(0 4px 15px rgba(0,0,0,0.7))',
          }}
        />
        
        {/* Afterburner flames effect - always visible with base flame */}
        <div 
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full"
        >
          {/* Base idle flame - always visible with flicker animation */}
          <div 
            className="absolute"
            style={{
              width: `${15 + afterburnerIntensity * 60}px`,
              height: `${8 + afterburnerIntensity * 14}px`,
              background: 'linear-gradient(90deg, rgba(251,191,36,0.95) 0%, rgba(251,146,60,0.9) 40%, rgba(239,68,68,0.6) 70%, rgba(220,38,38,0.2) 100%)',
              borderRadius: '0 50% 50% 0',
              filter: 'blur(1px)',
              transform: 'translateX(-10px) translateY(-2px)',
              animation: 'flameFlicker 0.15s ease-in-out infinite alternate',
            }}
          />
          {/* Main flame - grows with intensity */}
          <div 
            className="absolute"
            style={{
              width: `${20 + afterburnerIntensity * 55}px`,
              height: `${12 + afterburnerIntensity * 12}px`,
              background: 'linear-gradient(90deg, rgba(147,197,253,0.9) 0%, rgba(251,146,60,0.9) 30%, rgba(239,68,68,0.7) 60%, rgba(220,38,38,0.3) 100%)',
              borderRadius: '0 50% 50% 0',
              filter: 'blur(2px)',
              transform: 'translateX(-10px) translateY(-4px)',
              opacity: 0.6 + afterburnerIntensity * 0.4,
              animation: 'flameFlicker 0.12s ease-in-out infinite alternate-reverse',
            }}
          />
          {/* Core flame - hottest part */}
          <div 
            className="absolute"
            style={{
              width: `${10 + afterburnerIntensity * 35}px`,
              height: `${5 + afterburnerIntensity * 7}px`,
              background: 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(147,197,253,0.9) 40%, rgba(251,191,36,0.7) 100%)',
              borderRadius: '0 50% 50% 0',
              filter: 'blur(1px)',
              transform: 'translateX(-10px) translateY(-1px)',
              animation: 'flameFlicker 0.1s ease-in-out infinite alternate',
            }}
          />
          {/* Outer glow */}
          <div 
            className="absolute"
            style={{
              width: `${25 + afterburnerIntensity * 70}px`,
              height: `${18 + afterburnerIntensity * 20}px`,
              background: 'radial-gradient(ellipse at left, rgba(251,146,60,0.4) 0%, rgba(239,68,68,0.2) 50%, transparent 70%)',
              borderRadius: '0 50% 50% 0',
              filter: 'blur(4px)',
              transform: 'translateX(-12px) translateY(-7px)',
              opacity: 0.5 + afterburnerIntensity * 0.5,
              animation: 'flameGlow 0.2s ease-in-out infinite alternate',
            }}
          />
          {/* Shock diamonds */}
          {isFlying && afterburnerIntensity > 0.3 && (
            <>
              <div 
                className="absolute w-2 h-2 rounded-full bg-white/70"
                style={{ 
                  transform: `translateX(${10 + afterburnerIntensity * 18}px) translateY(-2px)`,
                  animation: 'flameFlicker 0.08s ease-in-out infinite alternate',
                }}
              />
              <div 
                className="absolute w-1.5 h-1.5 rounded-full bg-white/50"
                style={{ 
                  transform: `translateX(${22 + afterburnerIntensity * 28}px) translateY(-2px)`,
                  animation: 'flameFlicker 0.1s ease-in-out infinite alternate-reverse',
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Sonic Boom Shockwave Rings */}
      {shockwaveRings.map((ringId, index) => (
        <div
          key={ringId}
          className="absolute pointer-events-none"
          style={{
            left: `${planePos.x + 90 * planeScale}px`,
            bottom: `${35 + planePos.y + 35 * planeScale}px`,
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: '3px solid rgba(147, 197, 253, 0.8)',
            boxShadow: '0 0 20px rgba(147, 197, 253, 0.5), inset 0 0 20px rgba(147, 197, 253, 0.2)',
            animation: 'shockwaveExpand 1.2s ease-out forwards',
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
      
      {/* Sonic Boom Flash Effect */}
      {sonicBoomActive && (
        <div 
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: 'radial-gradient(circle at center, rgba(147, 197, 253, 0.3) 0%, transparent 70%)',
            animation: 'sonicBoomFlash 0.5s ease-out forwards',
          }}
        />
      )}

      {/* Explosion particles */}
      {explosionParticles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            opacity: particle.life,
            transform: `rotate(${particle.rotation}deg)`,
            background: particle.type === 'fire' 
              ? `radial-gradient(circle, #fbbf24 0%, #ef4444 50%, #991b1b 100%)`
              : particle.type === 'smoke'
              ? `radial-gradient(circle, rgba(100,100,100,0.8) 0%, rgba(50,50,50,0.4) 100%)`
              : '#fbbf24',
          }}
        />
      ))}
      
      {/* Multiplier Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {isPreparing ? (
          <div className="text-center">
            <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-red-400 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]">
              {timeLeft}s
            </div>
            <div className="text-sm sm:text-base md:text-lg text-red-300/80 mt-2 font-semibold tracking-wider">
              GET READY TO FLY
            </div>
          </div>
        ) : crashed ? (
          <div className="text-center">
            <div className="text-lg sm:text-xl md:text-2xl text-red-400 font-bold mb-1 animate-pulse">
              CRASHED!
            </div>
            <div className={cn(
              "text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black",
              getMultiplierColor(),
              "drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]"
            )}>
              {displayMultiplier.toFixed(2)}x
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className={cn(
              "text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black transition-all duration-200",
              getMultiplierColor(),
              justHitMilestone && "scale-125",
              "drop-shadow-[0_0_40px_rgba(239,68,68,0.5)]"
            )}>
              {displayMultiplier.toFixed(2)}x
            </div>
            {milestone && justHitMilestone && (
              <div className="text-lg sm:text-xl md:text-2xl text-yellow-400 font-bold mt-2 animate-bounce">
                🔥 {milestone}x REACHED!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
        <div className={cn(
          "px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider",
          isPreparing && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
          isFlying && !crashed && "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse",
          crashed && "bg-red-900/30 text-red-500 border border-red-900/50"
        )}>
          {isPreparing ? "Waiting" : crashed ? "Crashed" : "Flying"}
        </div>
      </div>
      </Card>
    </>
  );
};

export default AviatorCanvas;