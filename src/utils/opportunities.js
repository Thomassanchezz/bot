import { calculateRSI } from './indicators.js';

// Helpers
const sma = (values, period) => {
  if (!values || values.length < period) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
};

const pctChange = (a, b) => ((b - a) / a) * 100;

// Basic volatility measure (std dev)
const std = (values) => {
  if (!values || values.length === 0) return 0;
  const mean = values.reduce((a,b)=>a+b,0)/values.length;
  const variance = values.reduce((a,b)=>a + Math.pow(b-mean,2),0)/values.length;
  return Math.sqrt(variance);
};

// ATR approximation using closes (MVP): ATR ~ SMA of absolute close differences
const atrFromCloses = (closes, period = 14) => {
  if (!closes || closes.length < 2) return 0;
  const diffs = [];
  for (let i=1;i<closes.length;i++) {
    diffs.push(Math.abs(closes[i] - closes[i-1]));
  }
  return sma(diffs, Math.min(period, diffs.length)) || 0;
};

// EMA helper
const ema = (values, period) => {
  if (!values || values.length < period) return null;
  const k = 2 / (period + 1);
  let emaPrev = values.slice(0, period).reduce((a,b)=>a+b,0)/period;
  for (let i = period; i < values.length; i++) {
    emaPrev = values[i] * k + emaPrev * (1 - k);
  }
  return emaPrev;
};

// MACD: emaShort - emaLong and signal line
const macdLine = (values) => {
  const emaShort = ema(values, 12);
  const emaLong = ema(values, 26);
  if (emaShort === null || emaLong === null) return { macd: 0, signal: 0 };
  // build macd series for signal (simple approach)
  const macdSeries = [];
  for (let i = 26; i < values.length; i++) {
    const s = ema(values.slice(0, i+1), 12) - ema(values.slice(0, i+1), 26);
    macdSeries.push(s);
  }
  const macd = macdSeries[macdSeries.length - 1] || 0;
  const signal = ema(macdSeries, 9) || 0;
  return { macd, signal };
};

// Default config (tunable)
export const OPPORTUNITY_CONFIG = {
  weights: {
    rsi: 15,
    ma: 25,
    momentum: 15,
    macd: 20,
    volume: 10,
    volatility: 15
  },
  atrMultiplierForStop: 1.5,
  atrMultiplierForTarget: 4,
  rsiPeriods: 14,
  maShort: 20,
  maLong: 50
};

// Evaluate a single stock. Returns an object with signals and scoring.
export const evaluateStock = async (symbol, currentData, historicalOverride=null, config=null) => {
  try {
    // Get historical close prices (if not provided) - limit to 60 periods
    let history = historicalOverride;
    if (!history) {
      try {
        const mod = await import('../services/yahooFinance.js');
        const h = await mod.getHistoricalPrices(symbol, 180);
        history = h || [];
      } catch (e) {
        console.warn('No historical prices available for', symbol);
        history = [];
      }
    }

    const price = currentData?.price || (history && history.length ? history[history.length-1] : null);
    if (!price) return null;

    // indicators
    const cfg = config || OPPORTUNITY_CONFIG;
    const rsi = calculateRSI(history || [], cfg.rsiPeriods) ?? currentData?.rsi ?? 50;
    const smaShort = sma(history, cfg.maShort);
    const smaLong = sma(history, cfg.maLong);
    const recentChange = history && history.length >= 2 ? pctChange(history[history.length-2], history[history.length-1]) : 0;
    const vol = currentData?.volume || 0;

    // MACD
    const { macd, signal } = macdLine(history || []);

    // Basic signals
    const signals = [];
    if (rsi < 30) signals.push('RSI_OVERSOLD');
    if (rsi > 70) signals.push('RSI_OVERBOUGHT');
    if (smaShort && smaLong && smaShort > smaLong) signals.push('MA_BULLISH');
    if (smaShort && smaLong && smaShort < smaLong) signals.push('MA_BEARISH');
    if (recentChange > 2) signals.push('MOMENTUM_POS');
    if (recentChange < -2) signals.push('MOMENTUM_NEG');
    if (macd > signal) signals.push('MACD_BULLISH'); else if (macd < signal) signals.push('MACD_BEARISH');

    // score computation (weights configurable)
    let score = 50;

    // RSI contribution
    if (rsi < 30) score += cfg.weights.rsi; else if (rsi > 70) score -= cfg.weights.rsi;

    // MA contribution
    if (signals.includes('MA_BULLISH')) score += cfg.weights.ma;
    if (signals.includes('MA_BEARISH')) score -= cfg.weights.ma;

    // MACD contribution (normalized by price)
    const macdContribution = Math.max(-cfg.weights.macd, Math.min(cfg.weights.macd, (macd / Math.max(1, price)) * 100));
    score += macdContribution * (macd > signal ? 1 : -1);

    // momentum contribution (scale to +/- momentum weight)
    const momentumContribution = Math.max(-cfg.weights.momentum, Math.min(cfg.weights.momentum, recentChange));
    score += momentumContribution;

    // volume: if recent volume is available (not implemented in closes-only approach) we could add a bonus
    // volatility penalty: if volatility very high, reduce score slightly
    const recentStd = std(history.slice(-20));
    const volPenalty = Math.min(cfg.weights.volatility, Math.round((recentStd / (price || 1)) * 100));
    score -= volPenalty;

    // normalize score
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Recommendation mapping
    let recommendation = 'MANTENER';
    if (score >= 70) recommendation = 'COMPRAR';
    else if (score <= 30) recommendation = 'VENDER';

    // Confidence: simple mapping
    const confidence = score >= 80 ? 'ALTA' : score >= 60 ? 'MEDIA' : 'BAJA';

    // ATR-based stop and target
    const atr = atrFromCloses(history.slice(-30), 14);
    // dynamic adjustment: if volatility is high, increase stop distance proportionally
    const volRatio = atr / Math.max(1, price);
    const stopMultiplier = cfg.atrMultiplierForStop * (1 + Math.min(1, volRatio * 10));
    const targetMultiplier = cfg.atrMultiplierForTarget * (1 + Math.min(1, volRatio * 5));

    const stopLoss = +(price - (stopMultiplier * atr)).toFixed(2);
    const targetPrice = +(price + (targetMultiplier * atr)).toFixed(2);

    const riskReward = +( ((targetPrice - price) / Math.max(1, (price - stopLoss))) || 0 ).toFixed(2);

    const reasons = [];
    if (signals.includes('RSI_OVERSOLD')) reasons.push('RSI en zona de sobreventa');
    if (signals.includes('RSI_OVERBOUGHT')) reasons.push('RSI en zona de sobrecompra');
    if (signals.includes('MA_BULLISH')) reasons.push('SMA20 > SMA50 (tendencia alcista)');
    if (signals.includes('MA_BEARISH')) reasons.push('SMA20 < SMA50 (tendencia bajista)');
    if (signals.includes('MOMENTUM_POS')) reasons.push('Momentum positivo reciente');
    if (signals.includes('MOMENTUM_NEG')) reasons.push('Momentum negativo reciente');

    return {
      symbol,
      price,
      rsi: +rsi.toFixed(2),
      score,
      recommendation,
      confidence,
      targetPrice,
      stopLoss,
      riskReward,
      reasons,
      signals
    };
  } catch (err) {
    console.error('evaluateStock error', symbol, err);
    return null;
  }
};

export const rankOpportunities = (evaluations, topN=5) => {
  const filtered = evaluations.filter(Boolean);
  filtered.sort((a,b)=>b.score - a.score);
  return filtered.slice(0, topN);
};
