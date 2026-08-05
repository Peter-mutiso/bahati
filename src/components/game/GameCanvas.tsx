import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import rocketImage from "@/assets/rocket_2.png";

interface GameCanvasProps {
  currentMultiplier?: number;
  isFlying?: boolean;
  crashed?: boolean;
  isPreparing?: boolean;
  timeLeft?: number;
}

const GameCanvas = ({ currentMultiplier = 1.0, isFlying = false, crashed = false, isPreparing = false, timeLeft = 0 }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasHeight, setCanvasHeight] = useState(500);
  const startY = canvasHeight - 20; // Start from bottom
  const [rocketPos, setRocketPos] = useState({ x: 20, y: startY });
  const prevPosRef = useRef({ x: 20, y: startY });
  const [rocketAngle, setRocketAngle] = useState(-45);
  
  // Ensure multiplier is always a valid number
  const safeMultiplier = typeof currentMultiplier === 'number' && !isNaN(currentMultiplier) ? currentMultiplier : 1.0;
  const prevMultiplierRef = useRef(1.0);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number; life: number }>>([]);
  const [exhaustParticles, setExhaustParticles] = useState<Array<{ id: number; x: number; y: number; vx: number; vy: number; life: number; size: number }>>([]);
  const trailPositionsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [trailPositions, setTrailPositions] = useState<Array<{ x: number; y: number }>>([]);
  const [bgOffset, setBgOffset] = useState(0);
  
  // Animated multiplier for smooth transitions
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [justHitMilestone, setJustHitMilestone] = useState(false);
  
  // Smooth multiplier animation with improved speed
  useEffect(() => {
    const animationSpeed = 0.5; // Faster response for better tracking
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
  
  // Check for milestones
  useEffect(() => {
    const milestones = [2, 5, 10, 20, 50, 100];
    const currentMilestone = milestones.find(m => 
      prevMultiplierRef.current < m && safeMultiplier >= m
    );
    
    if (currentMilestone) {
      setMilestone(currentMilestone);
      setJustHitMilestone(true);
      setTimeout(() => setJustHitMilestone(false), 1000);
    }
    
    prevMultiplierRef.current = safeMultiplier;
  }, [safeMultiplier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    // Set canvas size
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Update canvas height state
    setCanvasHeight(canvas.offsetHeight);

    // Draw background mountains at the bottom with scrolling
    const drawMountains = (offset: number) => {
      const canvasHeight = canvas.offsetHeight;
      const canvasWidth = canvas.offsetWidth;
      ctx.fillStyle = "rgba(20, 20, 30, 0.8)";
      
      // Pattern width for seamless loop
      const patternWidth = 900;
      const wrappedOffset = offset % patternWidth;
      
      // Draw pattern twice to create seamless loop
      for (let i = -1; i <= 1; i++) {
        const baseX = i * patternWidth - wrappedOffset;
        
        // Mountain 1
        ctx.beginPath();
        ctx.moveTo(baseX + 0, canvasHeight);
        ctx.lineTo(baseX + 150, canvasHeight - 120);
        ctx.lineTo(baseX + 300, canvasHeight);
        ctx.fill();

        // Mountain 2
        ctx.beginPath();
        ctx.moveTo(baseX + 200, canvasHeight);
        ctx.lineTo(baseX + 400, canvasHeight - 150);
        ctx.lineTo(baseX + 600, canvasHeight);
        ctx.fill();

        // Mountain 3
        ctx.beginPath();
        ctx.moveTo(baseX + 500, canvasHeight);
        ctx.lineTo(baseX + 700, canvasHeight - 100);
        ctx.lineTo(baseX + 900, canvasHeight);
        ctx.fill();
      }
    };

    // Draw trajectory line
    const drawTrajectory = () => {
      if (!isFlying) return;

      const gradient = ctx.createLinearGradient(0, 0, rocketPos.x, rocketPos.y);
      gradient.addColorStop(0, crashed ? "#ef4444" : "#06b6d4");
      gradient.addColorStop(1, crashed ? "#f97316" : "#3b82f6");

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      const pathStartY = canvasHeight - 20;
      ctx.beginPath();
      ctx.moveTo(20, pathStartY);
      
      // Smooth curved path with more interpolation points
      const points = [];
      for (let i = 0; i <= 40; i++) {
        const progress = i / 40;
        const x = 20 + (rocketPos.x - 20) * progress;
        const y = pathStartY - (pathStartY - rocketPos.y) * Math.pow(progress, 0.8);
        points.push({ x, y });
      }

      points.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });

      ctx.stroke();
      
      // Draw comet tail
      if (trailPositions.length > 1) {
        const tailLength = Math.min(10 + Math.floor(safeMultiplier * 3), 50); // Longer tail at higher multipliers
        const recentTrail = trailPositions.slice(-tailLength);
        
        recentTrail.forEach((pos, i) => {
          const alpha = (i / recentTrail.length) * 0.8;
          const size = ((i / recentTrail.length) * 8) + 2;
          
          const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, size);
          gradient.addColorStop(0, `rgba(6, 182, 212, ${alpha})`);
          gradient.addColorStop(0.5, `rgba(59, 130, 246, ${alpha * 0.6})`);
          gradient.addColorStop(1, `rgba(59, 130, 246, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, size, 0, Math.PI * 2);
          ctx.fill();
        });
      }
      
      // Draw exhaust particles with flame gradient
      exhaustParticles.forEach(particle => {
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        );
        
        // Flame colors: bright yellow center to orange to red edges
        gradient.addColorStop(0, `rgba(255, 255, 100, ${particle.life})`);
        gradient.addColorStop(0.4, `rgba(255, 150, 50, ${particle.life * 0.8})`);
        gradient.addColorStop(1, `rgba(255, 50, 0, ${particle.life * 0.3})`);
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(255, 100, 0, ${particle.life})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Glow effect
      if (!crashed) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#06b6d4";
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      drawMountains(bgOffset);
      drawTrajectory();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [rocketPos, isFlying, crashed]);

  // Create explosion particles when crashed
  useEffect(() => {
    if (crashed && particles.length === 0) {
      const newParticles = [];
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30;
        const speed = 2 + Math.random() * 3;
        newParticles.push({
          id: i,
          x: rocketPos.x,
          y: rocketPos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
        });
      }
      setParticles(newParticles);
    }
    
    if (!crashed && particles.length > 0) {
      setParticles([]);
    }
  }, [crashed, rocketPos.x, rocketPos.y]);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;

    let animationFrameId: number;
    
    const animateParticles = () => {
      setParticles(prev => 
        prev
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1, // gravity
            life: p.life - 0.02,
          }))
          .filter(p => p.life > 0)
      );
      
      animationFrameId = requestAnimationFrame(animateParticles);
    };
    
    animationFrameId = requestAnimationFrame(animateParticles);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [particles.length > 0]);

  // Animate background scrolling - OPTIMIZED to 30fps
  useEffect(() => {
    if (!isFlying) {
      setBgOffset(0);
      return;
    }
    
    let animationFrameId: number;
    let lastTime = performance.now();
    const speed = 3; // Pixels per frame
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      if (deltaTime >= 33) { // ~30fps for background
        setBgOffset(prev => prev + speed);
        lastTime = currentTime;
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isFlying]);

  // Update rocket position based on multiplier with smooth 60fps animation
  useEffect(() => {
    const pathStartY = canvasHeight - 20;
    
    if (!isFlying || crashed) {
      setRocketPos({ x: 20, y: pathStartY });
      prevPosRef.current = { x: 20, y: pathStartY };
      prevMultiplierRef.current = 1.0;
      setTrailPositions([]);
      trailPositionsRef.current = [];
      setRocketAngle(-45);
      setExhaustParticles([]);
      setParticles([]);
      return;
    }

    let animationFrameId: number;
    let internalMultiplier = prevMultiplierRef.current;
    
    const animate = () => {
      const canvas = canvasRef.current;
      const maxX = canvas?.offsetWidth || 800;
      
      // Smooth internal multiplier - always moves forward, never backwards
      const targetMultiplier = Math.max(safeMultiplier, internalMultiplier);
      const multiplierDiff = targetMultiplier - internalMultiplier;
      const smoothness = 0.15;
      internalMultiplier = internalMultiplier + multiplierDiff * smoothness;
      
      // Update ref to prevent rollback
      prevMultiplierRef.current = Math.max(prevMultiplierRef.current, internalMultiplier);
      
      // Calculate progress based on smooth internal multiplier
      const progress = Math.min((internalMultiplier - 1) / 5, 1);
      
      // Smooth easing for natural movement
      const easedProgress = progress * progress * (3 - 2 * progress);
      
      // Calculate target position
      const targetX = 20 + easedProgress * (maxX - 40);
      const travelDistance = pathStartY - 20;
      const targetY = pathStartY - easedProgress * travelDistance;
      
      // Ensure position only moves forward/upward, never backward
      const x = Math.max(prevPosRef.current.x, targetX);
      const y = Math.min(prevPosRef.current.y, targetY);
      
      // Calculate rocket angle based on actual movement
      const dx = x - prevPosRef.current.x;
      const dy = y - prevPosRef.current.y;
      
      if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        setRocketAngle(angle);
      }
      
      prevPosRef.current = { x, y };
      setRocketPos({ x, y });
      
      // Update trail positions - OPTIMIZED
      trailPositionsRef.current = [...trailPositionsRef.current, { x, y }].slice(-30);
      if (trailPositionsRef.current.length % 3 === 0) {
        setTrailPositions([...trailPositionsRef.current]);
      }
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [safeMultiplier, isFlying, crashed, canvasHeight]);

  // Generate exhaust particles - OPTIMIZED for performance
  useEffect(() => {
    if (!isFlying || crashed) {
      setExhaustParticles([]);
      return;
    }

    const particleInterval = setInterval(() => {
      // Increased particle count for more visible flame effect
      const particleCount = 3;
      
      const newParticles = [];
      for (let i = 0; i < particleCount; i++) {
        // Calculate exhaust spawn position (behind the rocket)
        const angleRad = (rocketAngle * Math.PI) / 180;
        const offsetDistance = 18;
        const offsetX = -Math.cos(angleRad) * offsetDistance;
        const offsetY = -Math.sin(angleRad) * offsetDistance;
        
        // Add more spread for flame effect
        const spread = 8;
        
        newParticles.push({
          id: Date.now() + Math.random(),
          x: rocketPos.x + offsetX + (Math.random() - 0.5) * spread,
          y: rocketPos.y + offsetY + (Math.random() - 0.5) * spread,
          vx: -Math.cos(angleRad) * (1.5 + Math.random() * 1.5) - 0.5,
          vy: -Math.sin(angleRad) * (1.5 + Math.random() * 1.5) + (Math.random() - 0.5) * 2,
          life: 1,
          size: 3 + Math.random() * 3,
        });
      }
      
      setExhaustParticles(prev => [...prev, ...newParticles].slice(-30)); // Increased max particles
    }, 50); // Faster generation for continuous flame

    return () => clearInterval(particleInterval);
  }, [isFlying, crashed, rocketPos.x, rocketPos.y, rocketAngle]);

  // Animate exhaust particles - OPTIMIZED to 30fps
  useEffect(() => {
    if (exhaustParticles.length === 0) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    
    const animateExhaust = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      if (deltaTime >= 32) { // ~30fps for particles
        setExhaustParticles(prev => 
          prev
            .map(p => ({
              ...p,
              x: p.x + p.vx,
              y: p.y + p.vy,
              vy: p.vy + 0.15, // slight gravity for downward drift
              life: p.life - 0.04, // Fade out smoothly
              size: p.size * 0.93, // shrink for flame effect
            }))
            .filter(p => p.life > 0)
        );
        lastTime = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(animateExhaust);
    };
    
    animationFrameId = requestAnimationFrame(animateExhaust);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [exhaustParticles.length > 0]);

  return (
    <Card className="relative overflow-hidden card-shadow h-[280px] sm:h-[320px] md:h-[380px] lg:h-[420px]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
      
      {/* Rocket */}
      {!crashed && (
        <img
          src={rocketImage}
          alt="Rocket"
          className="absolute w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 pointer-events-none"
          style={{
            left: `${rocketPos.x}px`,
            top: `${rocketPos.y}px`,
            transform: `translate(-50%, -50%) rotate(${rocketAngle + 45}deg) scale(${isFlying ? 1 + Math.min(safeMultiplier * 0.03, 0.5) : 1})`,
            filter: isFlying 
              ? `drop-shadow(0 0 10px hsl(var(--primary))) drop-shadow(0 0 20px hsl(var(--primary) / 0.6))` 
              : "none",
          }}
        />
      )}

      {/* Explosion Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-3 h-3 rounded-full bg-destructive"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            transform: "translate(-50%, -50%)",
            opacity: particle.life,
            boxShadow: `0 0 ${10 * particle.life}px ${4 * particle.life}px hsl(var(--destructive) / ${particle.life})`,
          }}
        />
      ))}

      {/* Multiplier Display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          <div
            className={cn(
              "text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-bold transition-all duration-300",
              crashed
                ? "text-destructive scale-110"
                : isFlying
                ? "text-primary scale-100"
                : "text-muted-foreground scale-90",
              justHitMilestone && "animate-pulse scale-125"
            )}
            style={{
              textShadow: justHitMilestone 
                ? `0 0 20px hsl(var(--primary)), 0 0 40px hsl(var(--primary)), 0 0 60px hsl(var(--primary))`
                : crashed
                ? `0 0 20px hsl(var(--destructive))`
                : isFlying && safeMultiplier > 2
                ? `0 0 ${Math.min(safeMultiplier * 5, 40)}px hsl(var(--primary) / 0.6)`
                : undefined,
              filter: justHitMilestone ? 'brightness(1.5)' : undefined
            }}
          >
            {displayMultiplier.toFixed(2)}x
          </div>
        </div>
      </div>

      {/* Status Text */}
      {crashed && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-12 sm:mt-14 md:mt-16">
          <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-destructive animate-pulse">CRASHED!</p>
        </div>
      )}

      {isPreparing && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-10 sm:mt-12 md:mt-16 text-center px-4">
          <p className="text-xs sm:text-sm md:text-base font-bold text-muted-foreground mb-1 sm:mb-2">Preparing next round</p>
          <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-primary animate-pulse">
            {timeLeft}
          </div>
        </div>
      )}
    </Card>
  );
};

export default GameCanvas;