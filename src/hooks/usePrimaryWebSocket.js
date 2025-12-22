import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook personalizado para conectar con Primary Remarkets WebSocket API
 * URL: wss://api.remarkets.primary.com.ar/
 * 
 * @param {Object} config - Configuración de conexión
 * @param {string[]} config.symbols - Array de símbolos a suscribir ['GGAL', 'YPF', etc.]
 * @param {boolean} config.autoConnect - Conectar automáticamente al montar
 * @param {number} config.reconnectInterval - Intervalo de reconexión en ms (default: 5000)
 * @param {string} config.market - Mercado ('BYMA', 'CEDEAR', etc.)
 * 
 * @returns {Object} Estado de la conexión y datos
 */
const usePrimaryWebSocket = ({
  symbols = [],
  autoConnect = true,
  reconnectInterval = 5000,
  market = 'BYMA'
}) => {
  const [stockData, setStockData] = useState({});
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const subscribedSymbolsRef = useRef(new Set());

  // Conectar al WebSocket
  const connect = useCallback(() => {
    try {
      // Cerrar conexión existente si hay
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Crear nueva conexión
      const ws = new WebSocket('wss://api.remarkets.primary.com.ar/');
      
      ws.onopen = () => {
        console.log('✅ Conectado a Primary Remarkets WebSocket');
        setConnected(true);
        setError(null);
        
        // Suscribirse a los símbolos
        symbols.forEach(symbol => {
          subscribe(symbol);
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (err) {
          console.error('Error parseando mensaje:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('❌ Error en WebSocket:', event);
        setError('Error de conexión');
      };

      ws.onclose = () => {
        console.log('🔌 Desconectado de Primary Remarkets');
        setConnected(false);
        subscribedSymbolsRef.current.clear();
        
        // Intentar reconectar
        if (autoConnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('🔄 Intentando reconectar...');
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error al conectar:', err);
      setError(err.message);
    }
  }, [symbols, autoConnect, reconnectInterval]);

  // Desconectar
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Suscribirse a un símbolo
  const subscribe = useCallback((symbol) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'subscribe',
        symbol: symbol.toUpperCase(),
        market: market
      };
      
      wsRef.current.send(JSON.stringify(message));
      subscribedSymbolsRef.current.add(symbol.toUpperCase());
      console.log(`📊 Suscrito a ${symbol}`);
    }
  }, [market]);

  // Desuscribirse de un símbolo
  const unsubscribe = useCallback((symbol) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'unsubscribe',
        symbol: symbol.toUpperCase(),
        market: market
      };
      
      wsRef.current.send(JSON.stringify(message));
      subscribedSymbolsRef.current.delete(symbol.toUpperCase());
      console.log(`🚫 Desuscrito de ${symbol}`);
    }
  }, [market]);

  // Manejar mensajes recibidos
  const handleMessage = (data) => {
    // Adaptar según el formato real de la API de Primary
    // Este es un ejemplo que deberás ajustar
    if (data.type === 'quote' || data.type === 'trade') {
      const symbol = data.symbol || data.ticker;
      
      setStockData(prev => ({
        ...prev,
        [symbol]: {
          name: data.name || data.description || symbol,
          price: data.last || data.price || data.close,
          bid: data.bid,
          ask: data.ask,
          volume: data.volume || data.volumeAmount,
          change: data.change || data.changePercent,
          high: data.high,
          low: data.low,
          open: data.open,
          timestamp: data.timestamp || new Date().toISOString(),
          currency: 'ARS'
        }
      }));
      
      setLastUpdate(new Date());
    }
  };

  // Efecto de conexión inicial
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Efecto para manejar cambios en símbolos
  useEffect(() => {
    if (!connected) return;

    // Suscribirse a nuevos símbolos
    symbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      if (!subscribedSymbolsRef.current.has(upperSymbol)) {
        subscribe(symbol);
      }
    });

    // Desuscribirse de símbolos removidos
    subscribedSymbolsRef.current.forEach(subscribedSymbol => {
      if (!symbols.some(s => s.toUpperCase() === subscribedSymbol)) {
        unsubscribe(subscribedSymbol);
      }
    });
  }, [symbols, connected, subscribe, unsubscribe]);

  return {
    stockData,
    connected,
    error,
    lastUpdate,
    connect,
    disconnect,
    subscribe,
    unsubscribe
  };
};

export default usePrimaryWebSocket;
