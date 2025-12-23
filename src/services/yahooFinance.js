// src/services/yahooFinance.js
// API GRATUITA para obtener cotizaciones reales de acciones argentinas

import axios from 'axios';

// Usar proxy local de Vite para evitar problemas de CORS
const YAHOO_API = import.meta.env.DEV 
  ? '/api/yahoo/v8/finance/chart'  // En desarrollo usa el proxy de Vite
  : 'https://query1.finance.yahoo.com/v8/finance/chart';  // En producción usa la API directa

/**
 * Obtiene cotización en tiempo real de Yahoo Finance
 * @param {string} symbol - Símbolo con .BA al final (ej: 'GGAL.BA')
 */
export const getYahooQuote = async (symbol) => {
  try {
    const url = `${YAHOO_API}/${symbol}?interval=1m&range=1d`;
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
    
    // Último precio
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
    console.error(`Error fetching ${symbol}:`, error);
    return null;
  }
};

/**
 * Obtiene múltiples cotizaciones
 * @param {Array<string>} symbols - Símbolos sin sufijo (ej: ['GGAL', 'YPFD'])
 * @param {boolean} addBA - Si es true, agrega .BA a cada símbolo (para acciones argentinas)
 */
export const getMultipleQuotes = async (symbols, addBA = true) => {
  const promises = symbols.map(symbol => {
    const fullSymbol = addBA ? `${symbol}.BA` : symbol;
    return getYahooQuote(fullSymbol);
  });
  const results = await Promise.all(promises);
  
  // Convertir array a objeto {GGAL: {...}, YPF: {...}}
  const dataObject = {};
  results.forEach(result => {
    if (result) {
      dataObject[result.symbol] = result;
    }
  });
  
  return dataObject;
};

/**
 * Obtiene historial de precios para calcular RSI
 */
export const getHistoricalPrices = async (symbol, days = 30) => {
  try {
    const url = `${YAHOO_API}/${symbol}?interval=1d&range=${days}d`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    const data = response.data;
    
    const result = data.chart.result[0];
    const prices = result.indicators.quote[0].close;
    
    // Filtrar valores null
    return prices.filter(p => p !== null);
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    return [];
  }
};

export default {
  getYahooQuote,
  getMultipleQuotes,
  getHistoricalPrices
};
