// analysis.js - Lógica de análisis extraída de la app React

const axios = require('axios');

// Función para obtener cotización de Yahoo Finance
const getYahooQuote = async (symbol) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const data = response.data;

    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      console.error('No data available for', symbol, data);
      throw new Error('No data available');
    }

    const result = data.chart.result[0];
    const quote = result.meta;
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0];

    if (!timestamps || !prices || timestamps.length === 0 || !prices.close) {
      console.error('Invalid data structure for', symbol, result);
      // For some symbols, use meta data directly
      if (quote.regularMarketPrice) {
        const previousClose = quote.previousClose || quote.chartPreviousClose;
        const change = quote.regularMarketPrice - previousClose;
        const changePercent = ((change / previousClose) * 100).toFixed(2);
        return {
          symbol: symbol.replace('.BA', ''),
          name: quote.longName || quote.shortName || symbol,
          price: quote.regularMarketPrice,
          previousClose: previousClose,
          change: parseFloat(changePercent),
          high: quote.regularMarketDayHigh,
          low: quote.regularMarketDayLow,
          open: quote.regularMarketOpen,
          volume: quote.regularMarketVolume,
          currency: 'ARS',
          timestamp: new Date(quote.regularMarketTime * 1000).toISOString()
        };
      }
      throw new Error('Invalid data structure');
    }

    const lastIndex = timestamps.length - 1;
    const currentPrice = prices.close[lastIndex] || quote.regularMarketPrice;
    const previousClose = quote.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = ((change / previousClose) * 100).toFixed(2);

    return {
      symbol: symbol.replace('.BA', ''),
      name: quote.longName || quote.shortName || symbol,
      price: currentPrice,
      previousClose: previousClose,
      change: parseFloat(changePercent),
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      open: quote.regularMarketOpen,
      volume: quote.regularMarketVolume,
      currency: 'ARS',
      timestamp: new Date(timestamps[lastIndex] * 1000).toISOString()
    };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    return null;
  }
};

// Obtener múltiples cotizaciones
const getMultipleQuotes = async (symbols, addBA = true) => {
  const promises = symbols.map(symbol => {
    const fullSymbol = addBA ? `${symbol}.BA` : symbol;
    return getYahooQuote(fullSymbol);
  });
  const results = await Promise.all(promises);

  const dataObject = {};
  results.forEach(result => {
    if (result) {
      dataObject[result.symbol] = result;
    }
  });

  return dataObject;
};

// Obtener historial de precios para RSI
const getHistoricalPrices = async (symbol, days = 30) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${days}d`;
    const response = await axios.get(url);
    const data = response.data;

    const result = data.chart.result[0];
    const prices = result.indicators.quote[0].close;

    return prices.filter(p => p !== null);
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    return [];
  }
};

// Calcular RSI
const calculateRSI = (prices, period = 14) => {
  if (prices.length < period + 1) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

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

  return Math.round(rsi);
};

// Análisis completo de una acción
const analyzeStock = async (symbol, isLocal = true) => {
  const fullSymbol = isLocal ? `${symbol}.BA` : symbol;
  const data = await getYahooQuote(fullSymbol);
  if (!data) return null;

  const historicalPrices = await getHistoricalPrices(fullSymbol, 30);
  const rsi = calculateRSI(historicalPrices);

  const { price, change, volume } = data;

  // Sistema de scoring
  let buyScore = 0;
  let sellScore = 0;

  // RSI (30 puntos)
  if (rsi < 30) buyScore += 30;
  else if (rsi < 40) buyScore += 20;
  else if (rsi > 70) sellScore += 30;
  else if (rsi > 60) sellScore += 20;

  // Cambio de precio (30 puntos)
  const changeVal = parseFloat(change);
  if (changeVal < -3) buyScore += 30;
  else if (changeVal < -1.5) buyScore += 20;
  else if (changeVal > 3) sellScore += 30;
  else if (changeVal > 1.5) sellScore += 20;

  // Volumen (20 puntos)
  if (volume > 4000000) {
    if (changeVal > 0) buyScore += 20;
    else sellScore += 20;
  } else if (volume > 2500000) {
    if (changeVal > 0) buyScore += 10;
    else sellScore += 10;
  }

  // Momentum (20 puntos)
  if (changeVal > 0 && rsi > 50) buyScore += 20;
  else if (changeVal < 0 && rsi < 50) sellScore += 20;

  // Recomendación
  let recommendation = 'MANTENER';
  let confidence = 'MEDIA';
  let holdDays = 15;

  if (buyScore > sellScore + 20) {
    recommendation = 'COMPRAR';
    confidence = buyScore > 70 ? 'ALTA' : buyScore > 50 ? 'MEDIA' : 'BAJA';
    holdDays = buyScore > 70 ? 30 : buyScore > 50 ? 20 : 10;
  } else if (sellScore > buyScore + 20) {
    recommendation = 'VENDER';
    confidence = sellScore > 70 ? 'ALTA' : sellScore > 50 ? 'MEDIA' : 'BAJA';
    holdDays = 0;
  }

  const targetPrice = recommendation === 'COMPRAR'
    ? price * 1.15
    : recommendation === 'VENDER'
      ? price * 0.85
      : price * 1.05;

  // Razones
  const reasons = [];
  if (rsi < 30) reasons.push('RSI en zona de sobreventa');
  else if (rsi > 70) reasons.push('RSI en zona de sobrecompra');
  if (changeVal < -2) reasons.push('Caída significativa del precio');
  else if (changeVal > 2) reasons.push('Fuerte subida');
  if (volume > 4000000) reasons.push('Volumen alto');

  return {
    symbol,
    name: data.name,
    price,
    change,
    rsi,
    volume,
    recommendation,
    confidence,
    targetPrice: Math.round(targetPrice),
    holdDays,
    reasons,
    buyScore,
    sellScore
  };
};

// Obtener mejores oportunidades
const getTopOpportunities = async (symbols) => {
  const analyses = await Promise.all(symbols.map(s => analyzeStock(s)));
  const validAnalyses = analyses.filter(a => a && a.recommendation === 'COMPRAR');
  return validAnalyses.sort((a, b) => b.buyScore - a.buyScore).slice(0, 5);
};

module.exports = {
  getYahooQuote,
  getMultipleQuotes,
  getHistoricalPrices,
  calculateRSI,
  analyzeStock,
  getTopOpportunities
};