import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  type: 'fire' | 'smoke' | 'spark' | 'debris' | 'dust';
  size: number;
  rotation: number;
  rotationSpeed: number;
}

interface CoinTrainCanvasProps {
  currentMultiplier?: number;
  isFlying?: boolean;
  crashed?: boolean;
  isPreparing?: boolean;
  timeLeft?: number;
}

const CoinTrainCanvas = ({ currentMultiplier = 1.0, isFlying = false, crashed = false, isPreparing = false, timeLeft = 0 }: CoinTrainCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [trainPos, setTrainPos] = useState({ x: 50, y: 0 });
  const [trainScale, setTrainScale] = useState(0.28);
  const [trainBottom, setTrainBottom] = useState(40);
  const prevPosRef = useRef({ x: 50 });
  
  const safeMultiplier = typeof currentMultiplier === 'number' && !isNaN(currentMultiplier) ? currentMultiplier : 1.0;
  const prevMultiplierRef = useRef(1.0);
  
  const [explosionParticles, setExplosionParticles] = useState<Particle[]>([]);
  const [trackOffset, setTrackOffset] = useState(0);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [pistonOffset, setPistonOffset] = useState(0);
  
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [justHitMilestone, setJustHitMilestone] = useState(false);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const [crashFlash, setCrashFlash] = useState(false);
  const [showCrashedTrain, setShowCrashedTrain] = useState(false);
  
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

  // Responsive train sizing
  useEffect(() => {
    const updateTrainSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setTrainScale(0.55);
        setTrainBottom(54);
      } else if (width < 768) {
        setTrainScale(0.45);
        setTrainBottom(48);
      } else if (width < 1024) {
        setTrainScale(0.48);
        setTrainBottom(55);
      } else {
        setTrainScale(0.80);
        setTrainBottom(60);
      }
    };
    
    updateTrainSize();
    window.addEventListener('resize', updateTrainSize);
    return () => window.removeEventListener('resize', updateTrainSize);
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

    // Draw railroad tracks
    const drawTracks = (offset: number) => {
      const canvasHeight = canvas.offsetHeight;
      const canvasWidth = canvas.offsetWidth;
      const trackY = canvasHeight - 60;
      
      // Ground
      ctx.fillStyle = "#3d2817";
      ctx.fillRect(0, trackY + 20, canvasWidth, 60);
      
      // Gravel bed
      const gravelGradient = ctx.createLinearGradient(0, trackY, 0, trackY + 25);
      gravelGradient.addColorStop(0, "#5c4033");
      gravelGradient.addColorStop(1, "#3d2817");
      ctx.fillStyle = gravelGradient;
      ctx.fillRect(0, trackY, canvasWidth, 25);
      
      // Rails
      ctx.fillStyle = "#6b7280";
      ctx.fillRect(0, trackY + 2, canvasWidth, 4);
      ctx.fillRect(0, trackY + 18, canvasWidth, 4);
      
      // Rail shine
      ctx.fillStyle = "#9ca3af";
      ctx.fillRect(0, trackY + 2, canvasWidth, 1);
      ctx.fillRect(0, trackY + 18, canvasWidth, 1);
      
      // Railroad ties (wooden sleepers)
      ctx.fillStyle = "#5c4033";
      const tieWidth = 8;
      const tieSpacing = 30;
      const wrappedOffset = offset % tieSpacing;
      
      for (let x = -wrappedOffset; x < canvasWidth + tieSpacing; x += tieSpacing) {
        ctx.fillRect(x, trackY - 2, tieWidth, 28);
      }
    };

    // Draw background scenery
    const drawScenery = (offset: number) => {
      const canvasHeight = canvas.offsetHeight;
      const canvasWidth = canvas.offsetWidth;
      
      // Sky gradient - Premium dark navy
      const skyGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight - 80);
      if (crashed) {
        skyGradient.addColorStop(0, "#2d1f1f");
        skyGradient.addColorStop(0.5, "#1a1215");
        skyGradient.addColorStop(1, "#0f0a0c");
      } else if (isFlying) {
        skyGradient.addColorStop(0, "#0f172a");
        skyGradient.addColorStop(0.3, "#1e293b");
        skyGradient.addColorStop(0.7, "#0f172a");
        skyGradient.addColorStop(1, "#020617");
      } else {
        skyGradient.addColorStop(0, "#0f172a");
        skyGradient.addColorStop(0.5, "#1e293b");
        skyGradient.addColorStop(1, "#020617");
      }
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Stars with emerald tint
      for (let i = 0; i < 40; i++) {
        const x = (i * 37 + offset * 0.1) % canvasWidth;
        const y = (i * 23) % (canvasHeight - 100);
        const brightness = 0.3 + Math.sin(offset * 0.01 + i) * 0.2;
        ctx.fillStyle = i % 3 === 0 ? `rgba(52, 211, 153, ${brightness})` : `rgba(255, 255, 255, ${brightness})`;
        ctx.beginPath();
        ctx.arc(x, y, i % 5 === 0 ? 1.5 : 1, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Distant mountains - darker slate
      const mountainOffset = offset * 0.15;
      ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
      for (let i = -1; i <= 3; i++) {
        const baseX = i * 350 - (mountainOffset % 350);
        ctx.beginPath();
        ctx.moveTo(baseX, canvasHeight - 80);
        ctx.lineTo(baseX + 120, canvasHeight - 180);
        ctx.lineTo(baseX + 250, canvasHeight - 80);
        ctx.fill();
      }
      
      // Foreground hills
      ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
      for (let i = -1; i <= 3; i++) {
        const baseX = i * 300 - ((mountainOffset * 1.5) % 300);
        ctx.beginPath();
        ctx.moveTo(baseX, canvasHeight - 60);
        ctx.quadraticCurveTo(baseX + 100, canvasHeight - 120, baseX + 200, canvasHeight - 60);
        ctx.fill();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      drawScenery(trackOffset);
      drawTracks(trackOffset);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [trackOffset, isFlying, crashed]);

  // Animate track scrolling and wheel rotation
  useEffect(() => {
    if (!isFlying) {
      setWheelRotation(0);
      setPistonOffset(0);
      return;
    }
    
    let animationFrameId: number;
    const baseSpeed = 4 + Math.min(safeMultiplier * 0.5, 10);
    
    const animate = () => {
      setTrackOffset(prev => prev + baseSpeed);
      // Smooth wheel rotation based on speed
      setWheelRotation(prev => (prev + baseSpeed * 3) % 360);
      // Piston moves in a sinusoidal pattern
      setPistonOffset(prev => {
        const newOffset = (prev + baseSpeed * 0.1) % (Math.PI * 2);
        return newOffset;
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isFlying, safeMultiplier]);

  // Update train position based on multiplier
  useEffect(() => {
    if (!isFlying || crashed) {
      setTrainPos({ x: 50, y: 0 });
      prevPosRef.current = { x: 50 };
      prevMultiplierRef.current = 1.0;
      setExplosionParticles([]);
      setTrackOffset(0);
      return;
    }

    let animationFrameId: number;
    let internalMultiplier = prevMultiplierRef.current;
    
    const animate = () => {
      const targetMultiplier = Math.max(safeMultiplier, internalMultiplier);
      const multiplierDiff = targetMultiplier - internalMultiplier;
      const smoothness = 0.15;
      internalMultiplier = internalMultiplier + multiplierDiff * smoothness;
      
      prevMultiplierRef.current = Math.max(prevMultiplierRef.current, internalMultiplier);
      
      // Train moves right based on multiplier
      const progress = Math.min((internalMultiplier - 1) / 5, 1);
      const easedProgress = progress * progress * (3 - 2 * progress);
      
      const targetX = 50 + easedProgress * (canvasWidth - 150);
      const x = Math.max(prevPosRef.current.x, targetX);
      
      prevPosRef.current = { x };
      setTrainPos({ x, y: 0 });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [safeMultiplier, isFlying, crashed, canvasWidth]);


  // Create explosion particles when crashed
  useEffect(() => {
    if (crashed && explosionParticles.length === 0) {
      const newParticles: Particle[] = [];
      const centerX = trainPos.x + 80;
      const centerY = 180;
      
      // Fire particles
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.5;
        const speed = 4 + Math.random() * 8;
        newParticles.push({
          id: i,
          x: centerX + (Math.random() - 0.5) * 40,
          y: centerY + (Math.random() - 0.5) * 20,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          life: 1,
          type: 'fire',
          size: 8 + Math.random() * 12,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 20,
        });
      }
      
      // Smoke particles
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        newParticles.push({
          id: 30 + i,
          x: centerX + (Math.random() - 0.5) * 60,
          y: centerY + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: -1 - Math.random() * 2,
          life: 1,
          type: 'smoke',
          size: 20 + Math.random() * 30,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 5,
        });
      }
      
      // Sparks
      for (let i = 0; i < 40; i++) {
        const angle = (Math.PI * 2 * i) / 40;
        const speed = 6 + Math.random() * 12;
        newParticles.push({
          id: 50 + i,
          x: centerX + (Math.random() - 0.5) * 30,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 4,
          life: 1,
          type: 'spark',
          size: 2 + Math.random() * 4,
          rotation: 0,
          rotationSpeed: 0,
        });
      }
      
      // Debris
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI - Math.PI / 2;
        const speed = 5 + Math.random() * 10;
        newParticles.push({
          id: 90 + i,
          x: centerX + (Math.random() - 0.5) * 50,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 5,
          life: 1,
          type: 'debris',
          size: 4 + Math.random() * 8,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 30,
        });
      }
      
      // Ground dust cloud - spreads horizontally along the ground
      for (let i = 0; i < 25; i++) {
        const direction = Math.random() > 0.5 ? 1 : -1;
        const speed = 2 + Math.random() * 6;
        newParticles.push({
          id: 105 + i,
          x: centerX + (Math.random() - 0.5) * 100,
          y: centerY + 40 + Math.random() * 20,
          vx: direction * speed,
          vy: -0.5 - Math.random() * 1.5,
          life: 1,
          type: 'dust',
          size: 30 + Math.random() * 50,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 3,
        });
      }
      
      // Secondary dust wave - delayed feel
      for (let i = 0; i < 15; i++) {
        const direction = Math.random() > 0.5 ? 1 : -1;
        const speed = 4 + Math.random() * 8;
        newParticles.push({
          id: 130 + i,
          x: centerX + direction * (20 + Math.random() * 40),
          y: centerY + 30,
          vx: direction * speed,
          vy: -0.3 - Math.random(),
          life: 0.9,
          type: 'dust',
          size: 40 + Math.random() * 60,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 2,
        });
      }
      
      setExplosionParticles(newParticles);
      setCrashFlash(true);
      setShowCrashedTrain(true);
      setTimeout(() => setCrashFlash(false), 150);
    }
    
    if (!crashed) {
      setExplosionParticles([]);
      setShowCrashedTrain(false);
    }
  }, [crashed, trainPos.x]);

  // Screen shake effect
  useEffect(() => {
    if (!crashed) {
      setScreenShake({ x: 0, y: 0 });
      return;
    }
    
    let frameCount = 0;
    let animationFrameId: number;
    
    const shake = () => {
      frameCount++;
      const intensity = Math.max(0, 1 - frameCount / 30) * 8;
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
              case 'dust':
                gravity = -0.01;
                drag = 0.96;
                decay = 0.008;
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
              size: p.type === 'dust' ? p.size * 1.02 : p.size,
            };
          })
          .filter(p => p.life > 0)
      );
      
      animationFrameId = requestAnimationFrame(animateExplosion);
    };
    
    animationFrameId = requestAnimationFrame(animateExplosion);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [explosionParticles.length > 0]);

  return (
    <Card 
      className={cn(
        "relative overflow-hidden h-[240px] sm:h-[280px] md:h-[320px] lg:h-[380px] border-emerald-600/20 bg-gradient-to-b from-slate-900 via-slate-800/50 to-slate-900 shadow-2xl shadow-black/50",
        crashFlash && "bg-red-900/30"
      )}
      style={{
        transform: `translate(${screenShake.x}px, ${screenShake.y}px)`,
      }}
    >
      {/* Crash flash overlay */}
      {crashFlash && (
        <div className="absolute inset-0 bg-gradient-radial from-red-500/40 via-orange-600/20 to-transparent z-20 pointer-events-none" />
      )}
      
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ width: "100%", height: "100%" }}
      />
      
      {/* Train */}
      {!crashed && (
        <div
          className="absolute pointer-events-none transition-transform duration-100"
          style={{
            left: `${Math.max(5, trainPos.x * 0.6)}px`,
            bottom: `${trainBottom}px`,
            transform: `scaleX(-1) scale(${trainScale})`,
            transformOrigin: 'bottom left',
          }}
        >
          <div className="flex items-end">
            {/* Locomotive */}
            <div className="relative">
              {/* Chimney/Smokestack */}
              <div className="absolute -top-10 left-6 w-5 h-8 bg-gradient-to-t from-gray-800 to-gray-600 rounded-t-lg border-2 border-gray-500">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-7 h-2 bg-gray-700 rounded-t-sm" />
              </div>
              
              {/* Steam dome */}
              <div className="absolute -top-6 left-14 w-4 h-4 bg-gradient-to-t from-gray-700 to-gray-500 rounded-full" />
              
              {/* Boiler */}
              <div className="relative w-28 h-14 bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-700 rounded-l-full rounded-r-lg shadow-lg border-2 border-emerald-400">
                {/* Boiler bands */}
                <div className="absolute top-2 left-4 w-1 h-10 bg-emerald-800/50 rounded-full" />
                <div className="absolute top-2 left-10 w-1 h-10 bg-emerald-800/50 rounded-full" />
                <div className="absolute top-2 left-16 w-1 h-10 bg-emerald-800/50 rounded-full" />
                
                {/* Headlight */}
                <div className="absolute top-4 left-1 w-3 h-3 bg-emerald-300 rounded-full shadow-lg" style={{ boxShadow: isFlying ? '0 0 10px #6ee7b7, 0 0 20px #6ee7b7' : 'none' }} />
              </div>
              
              {/* Cab */}
              <div className="absolute -top-4 right-0 w-14 h-18 bg-gradient-to-b from-emerald-600 to-emerald-800 rounded-t-lg border-2 border-emerald-500">
                {/* Cab window */}
                <div className="absolute top-1 left-2 w-10 h-6 bg-cyan-300/80 rounded-sm border border-cyan-400">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
                </div>
                {/* Cab roof */}
                <div className="absolute -top-2 -left-1 w-16 h-2 bg-gray-700 rounded-t-sm" />
              </div>
              
              {/* Cow catcher */}
              <div className="absolute bottom-0 -left-3 w-6 h-4 bg-gradient-to-r from-gray-600 to-gray-500" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
              
              {/* Wheels with spokes and realistic animation */}
              <div className="absolute -bottom-5 left-1 flex gap-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="relative">
                    <div 
                      className={cn("w-10 h-10 rounded-full bg-gray-900 border-4 border-gray-600 shadow-lg overflow-hidden")}
                      style={{ 
                        transform: `rotate(${wheelRotation}deg)`,
                        transition: isFlying ? 'none' : 'transform 0.3s ease-out'
                      }}
                    >
                      {/* Wheel spokes - 8 spokes for realism */}
                      {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5].map(angle => (
                        <div 
                          key={angle} 
                          className="absolute top-1/2 left-1/2 w-full h-0.5 bg-gradient-to-r from-gray-500 via-gray-400 to-gray-500 origin-center"
                          style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
                        />
                      ))}
                      {/* Outer rim shine */}
                      <div className="absolute inset-0.5 rounded-full border border-gray-400/30" />
                      {/* Hub */}
                      <div className="absolute inset-2 rounded-full bg-gray-700 border-2 border-gray-500" />
                      <div className="absolute inset-3 rounded-full bg-gradient-to-br from-gray-500 to-gray-700">
                        {/* Hub bolt pattern */}
                        {[0, 60, 120, 180, 240, 300].map(angle => (
                          <div 
                            key={angle}
                            className="absolute w-1 h-1 bg-gray-400 rounded-full"
                            style={{ 
                              top: '50%', 
                              left: '50%',
                              transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-4px)`
                            }}
                          />
                        ))}
                      </div>
                    </div>
                    {/* Piston rod - moves with wheel rotation */}
                    {i === 1 && (
                      <div 
                        className="absolute -left-2 top-1/2 w-12 h-1.5 bg-gradient-to-r from-gray-600 via-gray-400 to-gray-600 rounded-full origin-right"
                        style={{ 
                          transform: `translateY(-50%) translateX(${Math.sin(pistonOffset) * 8}px)`,
                        }}
                      >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-gray-500 rounded-full border border-gray-400" />
                      </div>
                    )}
                    {/* Connecting rod between wheels */}
                    {i < 2 && (
                      <div 
                        className="absolute top-1/2 left-[calc(100%+4px)] w-4 h-1.5 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full"
                        style={{ 
                          transform: `translateY(-50%) translateY(${Math.sin(wheelRotation * Math.PI / 180 + i) * 2}px)`,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Main drive cylinder */}
              <div className="absolute -bottom-2 left-0 w-8 h-3 bg-gradient-to-b from-gray-600 to-gray-800 rounded-sm">
                <div 
                  className="absolute left-0 top-1/2 w-3 h-2 bg-gray-500 rounded-r-sm"
                  style={{ transform: `translateY(-50%) translateX(${Math.sin(pistonOffset) * 4}px)` }}
                />
              </div>
              
              {/* Glow effect */}
              {isFlying && (
                <div className="absolute inset-0 rounded-lg" 
                  style={{ 
                    boxShadow: `0 0 30px rgba(16, 185, 129, 0.5), 0 0 60px rgba(16, 185, 129, 0.3)` 
                  }} 
                />
              )}
            </div>
            
            {/* Coal Tender */}
            <div className="relative -ml-2">
              <div className="w-16 h-12 bg-gradient-to-b from-gray-700 to-gray-900 rounded-sm border-2 border-gray-600">
                {/* Coal pile */}
                <div className="absolute top-1 left-1 right-1 h-6 bg-gray-900 rounded-t-lg overflow-hidden">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="absolute w-2 h-2 bg-gray-800 rounded-full" style={{ left: `${(i % 4) * 25}%`, top: `${Math.floor(i / 4) * 40}%` }} />
                  ))}
                </div>
              </div>
              {/* Tender wheels */}
              <div className="absolute -bottom-4 left-1 flex gap-2">
                {[0, 1].map(i => (
                  <div 
                    key={i} 
                    className="w-7 h-7 rounded-full bg-gray-900 border-3 border-gray-600 overflow-hidden"
                    style={{ 
                      transform: `rotate(${wheelRotation}deg)`,
                      transition: isFlying ? 'none' : 'transform 0.3s ease-out'
                    }}
                  >
                    {[0, 45, 90, 135].map(angle => (
                      <div 
                        key={angle} 
                        className="absolute top-1/2 left-1/2 w-full h-0.5 bg-gray-500 origin-center"
                        style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
                      />
                    ))}
                    <div className="absolute inset-1.5 rounded-full bg-gray-700" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Gold Coin Cargo Cars */}
            {[1, 2, 3].map(carIndex => (
              <div key={carIndex} className="relative -ml-1">
                <div className="w-14 h-10 bg-gradient-to-b from-emerald-800 to-emerald-950 rounded-sm border-2 border-emerald-700">
                  {/* Gold coins pile */}
                  <div className="absolute top-0 left-0 right-0 h-8 flex flex-wrap justify-center items-start p-0.5 gap-0.5 overflow-hidden">
                    {[...Array(6)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-3 h-3 rounded-full bg-gradient-to-br from-emerald-300 via-emerald-400 to-emerald-600 border border-emerald-500 shadow-sm"
                        style={{ 
                          transform: `rotate(${i * 15}deg)`,
                          animation: isFlying ? `pulse ${1 + i * 0.1}s ease-in-out infinite` : 'none'
                        }}
                      >
                        <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-emerald-200 to-transparent opacity-50" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Cargo car wheels */}
                <div className="absolute -bottom-3 left-1 flex gap-2">
                  {[0, 1].map(i => (
                    <div 
                      key={i} 
                      className="w-5 h-5 rounded-full bg-gray-900 border-2 border-gray-600 overflow-hidden"
                      style={{ 
                        transform: `rotate(${wheelRotation}deg)`,
                        transition: isFlying ? 'none' : 'transform 0.3s ease-out'
                      }}
                    >
                      {[0, 45, 90, 135].map(angle => (
                        <div 
                          key={angle} 
                          className="absolute top-1/2 left-1/2 w-full h-px bg-gray-500 origin-center"
                          style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
                        />
                      ))}
                      <div className="absolute inset-1 rounded-full bg-gray-700" />
                    </div>
                  ))}
                </div>
                {/* Coupling */}
                <div className="absolute top-1/2 -left-1 w-2 h-1 bg-gray-500 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Crashed Train */}
      {showCrashedTrain && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${Math.max(5, trainPos.x * 0.6)}px`,
            bottom: `${trainBottom - 10}px`,
            transform: `scaleX(-1) scale(${trainScale}) rotate(15deg)`,
            transformOrigin: 'bottom left',
            filter: 'brightness(0.6) sepia(0.5)',
          }}
        >
          <div className="flex items-end opacity-80">
            {/* Locomotive - tilted/crashed */}
            <div className="relative">
              <div className="absolute -top-10 left-6 w-5 h-8 bg-gradient-to-t from-gray-800 to-gray-600 rounded-t-lg border-2 border-gray-500" />
              <div className="relative w-28 h-14 bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800 rounded-l-full rounded-r-lg shadow-lg border-2 border-gray-600">
                <div className="absolute top-4 left-1 w-3 h-3 bg-gray-500 rounded-full" />
              </div>
              <div className="absolute -top-4 right-0 w-14 h-18 bg-gradient-to-b from-gray-700 to-gray-900 rounded-t-lg border-2 border-gray-600">
                <div className="absolute top-1 left-2 w-10 h-6 bg-gray-500/50 rounded-sm border border-gray-600" />
              </div>
              <div className="absolute -bottom-5 left-1 flex gap-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gray-900 border-4 border-gray-700" />
                ))}
              </div>
            </div>
            {/* Derailed cars */}
            <div className="relative -ml-2" style={{ transform: 'rotate(-5deg)' }}>
              <div className="w-16 h-12 bg-gradient-to-b from-gray-800 to-gray-950 rounded-sm border-2 border-gray-700" />
            </div>
          </div>
        </div>
      )}

      {/* Explosion Particles */}
      {explosionParticles.map(particle => {
        if (particle.type === 'fire') {
          return (
            <div
              key={particle.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                background: `radial-gradient(circle, #fbbf24 0%, #f97316 40%, #ef4444 70%, transparent 100%)`,
                transform: `translate(-50%, -50%) rotate(${particle.rotation}deg)`,
                opacity: particle.life,
                boxShadow: `0 0 ${20 * particle.life}px ${8 * particle.life}px rgba(251, 191, 36, ${particle.life * 0.6})`,
              }}
            />
          );
        }
        
        if (particle.type === 'smoke') {
          return (
            <div
              key={particle.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                width: `${particle.size * (2 - particle.life)}px`,
                height: `${particle.size * (2 - particle.life)}px`,
                background: `radial-gradient(circle, rgba(60, 60, 60, ${particle.life * 0.6}) 0%, transparent 70%)`,
                transform: `translate(-50%, -50%) rotate(${particle.rotation}deg)`,
                opacity: particle.life * 0.7,
              }}
            />
          );
        }
        
        if (particle.type === 'spark') {
          return (
            <div
              key={particle.id}
              className="absolute pointer-events-none"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                width: `${particle.size}px`,
                height: `${particle.size * 3}px`,
                background: `linear-gradient(to bottom, #fef3c7, #fbbf24, #f59e0b)`,
                transform: `translate(-50%, -50%) rotate(${Math.atan2(particle.vy, particle.vx) * 180 / Math.PI + 90}deg)`,
                opacity: particle.life,
                borderRadius: '50%',
                boxShadow: `0 0 ${6 * particle.life}px ${2 * particle.life}px rgba(251, 191, 36, ${particle.life})`,
              }}
            />
          );
        }
        
        if (particle.type === 'debris') {
          return (
            <div
              key={particle.id}
              className="absolute pointer-events-none"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                width: `${particle.size}px`,
                height: `${particle.size * 0.6}px`,
                background: `linear-gradient(135deg, #78716c, #57534e, #44403c)`,
                transform: `translate(-50%, -50%) rotate(${particle.rotation}deg)`,
                opacity: particle.life,
                borderRadius: '2px',
              }}
            />
          );
        }
        
        if (particle.type === 'dust') {
          return (
            <div
              key={particle.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                width: `${particle.size}px`,
                height: `${particle.size * 0.6}px`,
                background: `radial-gradient(ellipse, rgba(139, 119, 101, ${particle.life * 0.5}) 0%, rgba(101, 85, 71, ${particle.life * 0.3}) 40%, transparent 70%)`,
                transform: `translate(-50%, -50%) rotate(${particle.rotation}deg) scaleY(0.5)`,
                opacity: particle.life * 0.8,
                filter: `blur(${(1 - particle.life) * 4}px)`,
              }}
            />
          );
        }
        
        return null;
      })}

      {/* Multiplier Display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          <div
            className={cn(
              "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter transition-all duration-300",
              crashed 
                ? "text-red-400 animate-pulse drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]" 
                : isFlying 
                  ? "bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]" 
                  : "text-slate-300"
            )}
            style={{
              transform: justHitMilestone ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.3s ease-out',
              textShadow: isFlying && !crashed ? '0 0 40px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          >
            {crashed ? "DERAILED!" : `${displayMultiplier.toFixed(2)}x`}
          </div>
          
          {/* Milestone Badge */}
          {milestone && justHitMilestone && (
            <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-emerald-600 px-2 sm:px-3 py-0.5 rounded-full text-slate-900 font-bold text-[10px] sm:text-xs animate-bounce shadow-lg shadow-emerald-500/30 whitespace-nowrap">
              {milestone}x
            </div>
          )}
        </div>
      </div>

      {/* Preparing Countdown */}
      {isPreparing && timeLeft > 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-center">
          <span className="text-emerald-500/80 text-xs sm:text-sm font-semibold bg-slate-900/60 px-3 py-1 rounded-full border border-emerald-600/20">{timeLeft}s</span>
        </div>
      )}

      {/* Connection Status */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-xs bg-slate-900/60 px-2 py-1 rounded-full border border-slate-700/50">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-slate-400">Live</span>
      </div>
    </Card>
  );
};

export default CoinTrainCanvas;