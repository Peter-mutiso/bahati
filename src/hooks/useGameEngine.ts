import { useEffect, useState, useRef } from "react";
import { useTenantId } from "@/contexts/TenantContext";

interface GameState {
  status: 'preparing' | 'flying' | 'crashed';
  multiplier: number;
  crashPoint: number;
  roundNumber: number;
  roundId?: string | null;
  timeLeft?: number;
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
}

export const useGameEngine = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'preparing',
    multiplier: 1.0,
    crashPoint: 0,
    roundNumber: 0,
    roundId: null,
    timeLeft: 8,
    serverSeed: undefined,
    serverSeedHash: undefined,
    clientSeed: undefined,
    nonce: undefined,
  });
  const [isConnected, setIsConnected] = useState(false);
  const [ping, setPing] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingRef = useRef<number>(0);
  const reconnectAttempts = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectDelay = 30000; // Max 30 seconds
  const isReconnecting = useRef<boolean>(false);
  const tenantId = useTenantId();

  // Fallback simulation if WebSocket fails
  useEffect(() => {
    if (isConnected) {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
        simulationRef.current = null;
      }
      return;
    }

    // Start simulation after 3 seconds if not connected
    const timeout = setTimeout(() => {
      if (!isConnected) {
        startSimulation();
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [isConnected]);

  const startSimulation = () => {
    let currentStatus: 'preparing' | 'flying' | 'crashed' = 'preparing';
    let currentMultiplier = 1.0;
    let currentCrashPoint = 0;
    let roundNum = 1;
    let prepareTime = 8;
    let flyStartTime = 0;
    let lastUpdate = Date.now();

    const generateCrashPoint = () => {
      const random = Math.random();
      if (random < 0.5) return 1 + Math.random() * 2;
      if (random < 0.75) return 3 + Math.random() * 4;
      if (random < 0.90) return 7 + Math.random() * 8;
      if (random < 0.97) return 15 + Math.random() * 20;
      return 35 + Math.random() * 45;
    };

    const updateGame = () => {
      const now = Date.now();
      const delta = now - lastUpdate;
      
      // Only update every 150ms to reduce re-renders
      if (delta < 150 && currentStatus === 'flying') {
        requestAnimationFrame(updateGame);
        return;
      }
      lastUpdate = now;

      if (currentStatus === 'preparing') {
        prepareTime--;
        setGameState(prev => ({
          ...prev,
          status: 'preparing',
          multiplier: 1.0,
          crashPoint: 0,
          roundNumber: roundNum,
          timeLeft: prepareTime,
        }));

        if (prepareTime <= 0) {
          currentStatus = 'flying';
          currentCrashPoint = generateCrashPoint();
          flyStartTime = Date.now();
          currentMultiplier = 1.0;
        }
        setTimeout(updateGame, 1000);
      } else if (currentStatus === 'flying') {
        const elapsed = (Date.now() - flyStartTime) / 1000;
        currentMultiplier = 1.0 * Math.pow(1.1, elapsed * 2);
        
        if (currentMultiplier >= currentCrashPoint) {
          currentStatus = 'crashed';
          currentMultiplier = currentCrashPoint;
          setGameState(prev => ({
            ...prev,
            status: 'crashed',
            multiplier: currentCrashPoint,
            crashPoint: currentCrashPoint,
            roundNumber: roundNum,
          }));

          setTimeout(() => {
            currentStatus = 'preparing';
            prepareTime = 8;
            roundNum++;
            updateGame();
          }, 2000);
        } else {
          setGameState(prev => ({
            ...prev,
            status: 'flying',
            multiplier: currentMultiplier,
            crashPoint: currentCrashPoint,
            roundNumber: roundNum,
          }));
          requestAnimationFrame(updateGame);
        }
      }
    };

    updateGame();
  };

  useEffect(() => {
    const scheduleReconnect = () => {
      if (isReconnecting.current) return;
      
      isReconnecting.current = true;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), maxReconnectDelay);
      reconnectAttempts.current++;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        isReconnecting.current = false;
        connectWebSocket();
      }, delay);
    };

    const connectWebSocket = () => {
      // Clear any existing reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      try {
        const wsUrl = `wss://ddmpfhpmyonkhtfcdnhd.supabase.co/functions/v1/game-engine${tenantId ? `?tenant=${tenantId}` : ''}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
          
          // Start ping measurement
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              lastPingRef.current = Date.now();
              ws.send(JSON.stringify({ type: 'ping', data: {} }));
            }
          }, 2000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
            pingIntervalRef.current = null;
          }
          
          // Schedule reconnection
          scheduleReconnect();
        };

        let updateThrottle: NodeJS.Timeout | null = null;
        let pendingUpdate: number | null = null;

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            // Calculate ping
            if (message.type === 'pong') {
              const latency = Date.now() - lastPingRef.current;
              setPing(latency);
              return;
            }

            // Handle server heartbeat
            if (message.type === 'heartbeat') {
              // Server keep-alive, no action needed
              return;
            }
            
            // Comprehensive validation
            if (!message || typeof message !== 'object') {
              console.warn('Invalid message format:', message);
              return;
            }

            if (!message.type) {
              console.warn('Message missing type:', message);
              return;
            }
            
            // Extract and validate data once
            const messageData = message.data;
            const isValidData = messageData && typeof messageData === 'object';
            
            // Throttle multiplier updates to reduce re-renders
            if (message.type === 'multiplier_update') {
              if (!isValidData) {
                console.warn('multiplier_update missing data:', message);
                return;
              }
              
              const multiplierValue = messageData.multiplier;
              const crashPoint = messageData.crashPoint;
              
              if (typeof multiplierValue !== 'number') {
                console.warn('multiplier_update missing multiplier value:', message);
                return;
              }
              
              // Store both multiplier and crashPoint for synchronization
              pendingUpdate = multiplierValue;
              
              if (!updateThrottle) {
                updateThrottle = setTimeout(() => {
                  if (pendingUpdate !== null && typeof pendingUpdate === 'number') {
                    setGameState((prev) => ({
                      ...prev,
                      status: 'flying',
                      multiplier: pendingUpdate,
                      crashPoint: typeof crashPoint === 'number' ? crashPoint : prev.crashPoint,
                    }));
                    pendingUpdate = null;
                  }
                  updateThrottle = null;
                }, 50); // Reduced from 100ms to 50ms for better sync
              }
              return;
            }
            
            // All other message types require data
            if (!isValidData) {
              console.warn(`${message.type} missing data:`, message);
              return;
            }
            
            if (message.type === 'state') {
              // Full state sync - apply immediately
              const data = messageData;
              setGameState({
                status: data.status || 'preparing',
                multiplier: typeof data.multiplier === 'number' ? data.multiplier : 1.0,
                crashPoint: typeof data.crashPoint === 'number' ? data.crashPoint : 0,
                roundNumber: typeof data.roundNumber === 'number' ? data.roundNumber : 0,
                roundId: data.roundId || null,
                timeLeft: typeof data.timeLeft === 'number' ? data.timeLeft : undefined,
                serverSeedHash: data.serverSeedHash,
                clientSeed: data.clientSeed,
                serverSeed: data.serverSeed,
                nonce: typeof data.nonce === 'number' ? data.nonce : undefined,
              });
            } else if (message.type === 'preparing') {
              const timeLeft = messageData.timeLeft;
              const roundNumber = messageData.roundNumber;
              const serverSeedHash = messageData.serverSeedHash;
              const clientSeed = messageData.clientSeed;
              if (typeof timeLeft === 'number') {
                setGameState(prev => ({ 
                  ...prev, 
                  status: 'preparing', 
                  timeLeft,
                  roundNumber: typeof roundNumber === 'number' ? roundNumber : prev.roundNumber,
                  multiplier: 1.0,
                  serverSeedHash,
                  clientSeed,
                  serverSeed: undefined, // Hide server seed during preparation
                  nonce: typeof roundNumber === 'number' ? roundNumber : prev.nonce,
                }));
              }
            } else if (message.type === 'round_start') {
              const roundNumber = messageData.roundNumber;
              const roundId = messageData.roundId;
              const serverSeedHash = messageData.serverSeedHash;
              const clientSeed = messageData.clientSeed;
              const nonce = messageData.nonce;
              if (typeof roundNumber === 'number') {
                setGameState(prev => ({ 
                  ...prev, 
                  status: 'flying', 
                  roundNumber,
                  roundId,
                  multiplier: 1.0,
                  serverSeedHash,
                  clientSeed,
                  nonce: typeof nonce === 'number' ? nonce : prev.nonce,
                  serverSeed: undefined, // Don't reveal server seed until crash
                  crashPoint: 0, // Don't reveal crash point until crash
                }));
              }
            } else if (message.type === 'crash') {
              const crashPoint = messageData.crashPoint;
              const roundNumber = messageData.roundNumber;
              const serverSeed = messageData.serverSeed;
              const serverSeedHash = messageData.serverSeedHash;
              const clientSeed = messageData.clientSeed;
              const nonce = messageData.nonce;
              if (typeof crashPoint === 'number') {
                setGameState(prev => ({ 
                  ...prev, 
                  status: 'crashed', 
                  multiplier: crashPoint,
                  crashPoint,
                  roundNumber: typeof roundNumber === 'number' ? roundNumber : prev.roundNumber,
                  serverSeed, // NOW reveal server seed after crash
                  serverSeedHash,
                  clientSeed,
                  nonce: typeof nonce === 'number' ? nonce : prev.nonce,
                }));
              }
            }
          } catch (error) {
            console.error('Error parsing game message:', error, event.data);
          }
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [tenantId]); // re-connect if tenantId changes

  const placeBet = (userId: string, amount: number, autoCashout: number | null, roundId: string, onSuccess?: (betId: string) => void) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const requestId = crypto.randomUUID();
      
      const messageHandler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'bet_placed') {
            const messageData = message.data;
            if (messageData && 
                typeof messageData === 'object' &&
                messageData.requestId === requestId &&
                messageData.success && 
                messageData.betId) {
              onSuccess?.(messageData.betId);
              wsRef.current?.removeEventListener('message', messageHandler);
            }
          }
        } catch (error) {
          console.error('Error handling bet_placed message:', error);
        }
      };
      
      if (onSuccess) {
        wsRef.current.addEventListener('message', messageHandler);
      }
      
      wsRef.current.send(JSON.stringify({
        type: 'place_bet',
        data: { userId, amount, autoCashout, roundId, requestId }
      }));
    } else {
      console.warn('Cannot place bet: WebSocket not connected');
    }
  };

  const cashout = (betId: string, userId: string, onSuccess?: (profit: number, multiplier: number) => void, onError?: (error: string) => void) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      let timeoutId: NodeJS.Timeout;
      let isHandled = false;
      
      const messageHandler = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'cashout_result') {
            const messageData = message.data;
            if (messageData && typeof messageData === 'object') {
              if (!isHandled) {
                isHandled = true;
                clearTimeout(timeoutId);
                wsRef.current?.removeEventListener('message', messageHandler);
                
                if (messageData.success) {
                  onSuccess?.(messageData.profit, messageData.multiplier);
                } else {
                  console.error('Cashout failed:', messageData.error);
                  onError?.(messageData.error || 'Cashout failed');
                }
              }
            }
          }
        } catch (error) {
          console.error('Error handling cashout_result message:', error);
          if (!isHandled) {
            isHandled = true;
            clearTimeout(timeoutId);
            wsRef.current?.removeEventListener('message', messageHandler);
            onError?.('Failed to process cashout response');
          }
        }
      };
      
      if (onSuccess || onError) {
        wsRef.current.addEventListener('message', messageHandler);
        
        // Timeout after 10 seconds
        timeoutId = setTimeout(() => {
          console.error('Cashout timeout for bet:', betId);
          if (!isHandled) {
            isHandled = true;
            wsRef.current?.removeEventListener('message', messageHandler);
            onError?.('Cashout request timed out');
          }
        }, 10000);
      }
      
      wsRef.current.send(JSON.stringify({
        type: 'cashout',
        data: { betId, userId }
      }));
    } else {
      console.warn('Cannot cashout: WebSocket not connected');
      onError?.('Connection lost. Please refresh the page.');
    }
  };

  return { gameState, placeBet, cashout, isConnected, ping };
};