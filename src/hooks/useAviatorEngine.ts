import { useState, useEffect, useRef, useCallback } from 'react';

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

export const useAviatorEngine = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'preparing',
    multiplier: 1.0,
    crashPoint: 0,
    roundNumber: 0,
    roundId: null,
    timeLeft: 8,
    serverSeed: '',
    serverSeedHash: '',
    clientSeed: '',
    nonce: 0,
  });
  
  const [isConnected, setIsConnected] = useState(false);
  const [ping, setPing] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingTime = useRef<number>(0);

  const connectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const projectId = supabaseUrl.match(/https:\/\/([^.]+)/)?.[1];
    
    if (!projectId) {
      console.error('Could not extract project ID from Supabase URL');
      return;
    }

    const wsUrl = `wss://${projectId}.supabase.co/functions/v1/aviator-engine`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          lastPingTime.current = Date.now();
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 5000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'state':
          case 'round_start':
            setGameState(prev => ({
              ...prev,
              ...message.data,
              status: message.data.status || prev.status,
              roundId: message.data.roundId || prev.roundId,
              serverSeedHash: message.data.serverSeedHash || prev.serverSeedHash,
              clientSeed: message.data.clientSeed || prev.clientSeed,
              nonce: message.data.nonce || message.data.roundNumber || prev.nonce,
            }));
            break;
            
          case 'preparing':
            setGameState(prev => ({
              ...prev,
              status: 'preparing',
              timeLeft: message.data.timeLeft,
              serverSeedHash: message.data.serverSeedHash || prev.serverSeedHash,
              clientSeed: message.data.clientSeed || prev.clientSeed,
              roundNumber: message.data.roundNumber || prev.roundNumber,
              roundId: message.data.roundId || prev.roundId,
            }));
            break;
            
          case 'multiplier_update':
            setGameState(prev => ({
              ...prev,
              multiplier: message.data.multiplier,
              status: 'flying',
            }));
            break;
            
          case 'crash':
            setGameState(prev => ({
              ...prev,
              status: 'crashed',
              crashPoint: message.data.crashPoint,
              multiplier: message.data.crashPoint,
              serverSeed: message.data.serverSeed,
              serverSeedHash: message.data.serverSeedHash,
              clientSeed: message.data.clientSeed,
              nonce: message.data.nonce,
            }));
            break;
            
          case 'round_prepare':
            setGameState(prev => ({
              ...prev,
              status: 'preparing',
              multiplier: 1.0,
              serverSeedHash: message.data.serverSeedHash,
              clientSeed: message.data.clientSeed,
              roundNumber: message.data.roundNumber,
              roundId: message.data.roundId || null,
            }));
            break;
            
          case 'pong':
          case 'heartbeat':
            if (lastPingTime.current > 0) {
              setPing(Date.now() - lastPingTime.current);
            }
            break;
        }
      } catch (e) {
        console.error('Error parsing Aviator WebSocket message:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('Aviator WebSocket error:', error);
    };

    ws.onclose = () => {
      setIsConnected(false);
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const placeBet = useCallback((
    userId: string, 
    amount: number, 
    autoCashout: number | null, 
    roundId: string,
    onSuccess?: (betId: string) => void
  ) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const requestId = `bet_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'bet_placed' && message.data.requestId === requestId) {
            onSuccess?.(message.data.betId);
            wsRef.current?.removeEventListener('message', handleMessage);
          } else if (message.type === 'bet_error' && message.data.requestId === requestId) {
            console.error('Aviator bet error:', message.data.error);
            wsRef.current?.removeEventListener('message', handleMessage);
          }
        } catch (e) {
          console.error('Error handling aviator bet response:', e);
        }
      };
      
      wsRef.current.addEventListener('message', handleMessage);
      
      wsRef.current.send(JSON.stringify({
        type: 'place_bet',
        data: { userId, amount, autoCashout, roundId, requestId },
      }));
      
      setTimeout(() => {
        wsRef.current?.removeEventListener('message', handleMessage);
      }, 10000);
    }
  }, []);

  const cashout = useCallback((
    betId: string, 
    userId: string,
    onSuccess?: (profit: number, multiplier: number) => void,
    onError?: (error: string) => void
  ) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const requestId = `cashout_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'cashout_success' && message.data.requestId === requestId) {
            onSuccess?.(message.data.profit, message.data.multiplier);
            wsRef.current?.removeEventListener('message', handleMessage);
          } else if (message.type === 'cashout_error' && message.data.requestId === requestId) {
            onError?.(message.data.error);
            wsRef.current?.removeEventListener('message', handleMessage);
          }
        } catch (e) {
          console.error('Error handling aviator cashout response:', e);
        }
      };
      
      wsRef.current.addEventListener('message', handleMessage);
      
      wsRef.current.send(JSON.stringify({
        type: 'cashout',
        data: { betId, userId, multiplier: gameState.multiplier, requestId },
      }));
      
      setTimeout(() => {
        wsRef.current?.removeEventListener('message', handleMessage);
      }, 10000);
    }
  }, [gameState.multiplier]);

  return {
    gameState,
    placeBet,
    cashout,
    isConnected,
    ping,
  };
};