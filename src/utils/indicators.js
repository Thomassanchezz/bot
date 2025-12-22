/**
 * Utilidades para calcular indicadores técnicos
 * Usados en conjunto con los datos de Primary WebSocket
 */

/**
 * Calcula el RSI (Relative Strength Index)
 * @param {number[]} prices - Array de precios históricos
 * @param {number} period - Período para el cálculo (default: 14)
 * @returns {number} Valor del RSI (0-100)
 */
export const calculateRSI = (prices, period = 14) => {
  if (prices.length < period + 1) {
    return 50; // Valor neutral si no hay suficientes datos
  }

  let gains = 0;
  let losses = 0;

  // Primera pasada: calcular ganancias y pérdidas promedio
  for (let i = 1; i <= period; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) {
      gains += difference;
    } else {
      losses -= difference;
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Segunda pasada: usar EMA
  for (let i = period + 1; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    
    if (difference >= 0) {
      avgGain = (avgGain * (period - 1) + difference) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - difference) / period;
    }
  }

  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return rsi;
};

/**
 * Calcula el cambio porcentual
 * @param {number} current - Precio actual
 * @param {number} previous - Precio anterior
 * @returns {number} Cambio porcentual
 */
export const calculateChangePercent = (current, previous) => {
  if (!previous || previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Calcula medias móviles
 * @param {number[]} prices - Array de precios
 * @param {number} period - Período
 * @returns {number} Media móvil
 */
export const calculateSMA = (prices, period) => {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  
  const slice = prices.slice(-period);
  const sum = slice.reduce((acc, price) => acc + price, 0);
  return sum / period;
};

/**
 * Calcula media móvil exponencial
 * @param {number[]} prices - Array de precios
 * @param {number} period - Período
 * @returns {number} EMA
 */
export const calculateEMA = (prices, period) => {
  if (prices.length < period) return calculateSMA(prices, prices.length);
  
  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
};

/**
 * Calcula las Bandas de Bollinger
 * @param {number[]} prices - Array de precios
 * @param {number} period - Período (default: 20)
 * @param {number} stdDev - Desviaciones estándar (default: 2)
 * @returns {Object} {upper, middle, lower}
 */
export const calculateBollingerBands = (prices, period = 20, stdDev = 2) => {
  const middle = calculateSMA(prices, period);
  
  if (prices.length < period) {
    return { upper: middle, middle, lower: middle };
  }
  
  const slice = prices.slice(-period);
  const variance = slice.reduce((acc, price) => {
    return acc + Math.pow(price - middle, 2);
  }, 0) / period;
  
  const standardDeviation = Math.sqrt(variance);
  
  return {
    upper: middle + (standardDeviation * stdDev),
    middle: middle,
    lower: middle - (standardDeviation * stdDev)
  };
};

/**
 * Calcula el MACD (Moving Average Convergence Divergence)
 * @param {number[]} prices - Array de precios
 * @returns {Object} {macd, signal, histogram}
 */
export const calculateMACD = (prices) => {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12 - ema26;
  
  // Calcular señal (EMA de 9 períodos del MACD)
  // Nota: necesitarías un historial de valores MACD para calcular esto correctamente
  const signal = macd * 0.9; // Simplificado
  
  return {
    macd,
    signal,
    histogram: macd - signal
  };
};

/**
 * Detecta patrones de velas
 * @param {Object} candle - {open, high, low, close}
 * @returns {string[]} Array de patrones detectados
 */
export const detectCandlePatterns = (candle) => {
  const patterns = [];
  const { open, high, low, close } = candle;
  
  const body = Math.abs(close - open);
  const range = high - low;
  const upperShadow = high - Math.max(open, close);
  const lowerShadow = Math.min(open, close) - low;
  
  // Doji
  if (body < range * 0.1) {
    patterns.push('DOJI');
  }
  
  // Hammer
  if (lowerShadow > body * 2 && upperShadow < body * 0.5 && close > open) {
    patterns.push('HAMMER');
  }
  
  // Shooting Star
  if (upperShadow > body * 2 && lowerShadow < body * 0.5 && close < open) {
    patterns.push('SHOOTING_STAR');
  }
  
  // Engulfing
  if (body > range * 0.7) {
    patterns.push(close > open ? 'BULLISH_ENGULFING' : 'BEARISH_ENGULFING');
  }
  
  return patterns;
};

/**
 * Enriquece los datos de Primary con indicadores técnicos
 * @param {Object} rawData - Datos crudos del WebSocket
 * @param {Object} historicalData - Datos históricos para cálculos
 * @returns {Object} Datos enriquecidos con indicadores
 */
export const enrichWithIndicators = (rawData, historicalData = {}) => {
  const enriched = {};
  
  Object.entries(rawData).forEach(([symbol, data]) => {
    const history = historicalData[symbol] || [];
    const prices = [...history, data.price];
    
    enriched[symbol] = {
      ...data,
      rsi: calculateRSI(prices),
      sma20: calculateSMA(prices, 20),
      sma50: calculateSMA(prices, 50),
      ema12: calculateEMA(prices, 12),
      ema26: calculateEMA(prices, 26),
      macd: calculateMACD(prices),
      bollingerBands: calculateBollingerBands(prices),
      change: calculateChangePercent(data.price, history[history.length - 1] || data.price)
    };
  });
  
  return enriched;
};

/**
 * Mantiene un buffer circular de precios históricos
 */
export class PriceHistory {
  constructor(maxSize = 200) {
    this.maxSize = maxSize;
    this.data = {};
  }
  
  add(symbol, price, timestamp = Date.now()) {
    if (!this.data[symbol]) {
      this.data[symbol] = [];
    }
    
    this.data[symbol].push({ price, timestamp });
    
    // Mantener solo los últimos maxSize elementos
    if (this.data[symbol].length > this.maxSize) {
      this.data[symbol].shift();
    }
  }
  
  get(symbol) {
    return this.data[symbol] || [];
  }
  
  getPrices(symbol) {
    const history = this.get(symbol);
    return history.map(item => item.price);
  }
  
  clear(symbol) {
    if (symbol) {
      delete this.data[symbol];
    } else {
      this.data = {};
    }
  }
}

export default {
  calculateRSI,
  calculateChangePercent,
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateMACD,
  detectCandlePatterns,
  enrichWithIndicators,
  PriceHistory
};
