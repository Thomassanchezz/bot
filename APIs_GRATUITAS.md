# 🆓 APIs GRATUITAS para Acciones Argentinas

## ⚡ Opción 1: Yahoo Finance (RECOMENDADA - GRATIS)

Yahoo Finance tiene datos de muchas acciones argentinas y es **100% GRATUITO**.

### Símbolos en Yahoo Finance:

```javascript
// Acciones Argentinas (agregar .BA al final)
'GGAL.BA'  // Grupo Galicia
'YPFD.BA'  // YPF
'PAMP.BA'  // Pampa Energía
'BBAR.BA'  // Banco BBVA
'TXAR.BA'  // Ternium
'ALUA.BA'  // Aluar
'EDN.BA'   // Edenor
'LOMA.BA'  // Loma Negra
'COME.BA'  // Banco Comafi
'TRAN.BA'  // Transener

// CEDEARs (agregar .BA al final)
'AAPL.BA'  // Apple CEDEAR
'GOOGL.BA' // Google CEDEAR
'MSFT.BA'  // Microsoft CEDEAR
'TSLA.BA'  // Tesla CEDEAR
'KO.BA'    // Coca Cola CEDEAR
'WMT.BA'   // Walmart CEDEAR
```

### Código Listo para Copiar y Pegar:

Creá un archivo: `src/services/yahooFinance.js`

```javascript
// src/services/yahooFinance.js

const YAHOO_API = 'https://query1.finance.yahoo.com/v8/finance/chart';

/**
 * Obtiene cotización en tiempo real de Yahoo Finance
 * @param {string} symbol - Símbolo con .BA al final (ej: 'GGAL.BA')
 */
export const getYahooQuote = async (symbol) => {
  try {
    const url = `${YAHOO_API}/${symbol}?interval=1m&range=1d`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.chart || !data.chart.result || !data.chart.result[0]) {
      throw new Error('No data available');
    }

    const result = data.chart.result[0];
    const quote = result.meta;
    const timestamps = result.timestamp;
    const prices = result.indicators.quote[0];
    
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
 */
export const getMultipleQuotes = async (symbols) => {
  const promises = symbols.map(symbol => getYahooQuote(symbol + '.BA'));
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
    const response = await fetch(url);
    const data = await response.json();
    
    const result = data.chart.result[0];
    const prices = result.indicators.quote[0].close;
    
    // Filtrar valores null
    return prices.filter(p => p !== null);
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    return [];
  }
};
```

---

## 🔧 Integración en tu Bot

Abrí `src/components/StockAlertBotArgentina.jsx` y REEMPLAZÁ el useEffect de datos simulados:

```javascript
import { getMultipleQuotes, getHistoricalPrices } from '../services/yahooFinance';
import { calculateRSI } from '../utils/indicators';

const StockAlertBotArgentina = () => {
  // ... estados existentes ...
  
  // ELIMINAR el useEffect con mockData y AGREGAR esto:
  
  useEffect(() => {
    const fetchRealData = async () => {
      const symbols = marketType === 'local' 
        ? ['GGAL', 'YPFD', 'PAMP', 'BBAR', 'TXAR', 'ALUA']
        : ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'KO', 'WMT'];
      
      try {
        // Obtener datos reales de Yahoo Finance
        const realData = await getMultipleQuotes(symbols);
        
        // Calcular RSI para cada acción
        const enrichedData = {};
        for (const [symbol, data] of Object.entries(realData)) {
          const history = await getHistoricalPrices(symbol + '.BA', 14);
          const rsi = calculateRSI(history, 14);
          
          enrichedData[symbol] = {
            ...data,
            rsi: rsi,
            sector: getSector(symbol) // función auxiliar
          };
        }
        
        setStockData(enrichedData);
        
        // Generar análisis
        const analysis = {};
        Object.entries(enrichedData).forEach(([symbol, data]) => {
          analysis[symbol] = analyzeStock(symbol, data, []);
        });
        setStockAnalysis(analysis);
        checkAlerts(enrichedData);
        
      } catch (error) {
        console.error('Error fetching real data:', error);
      }
    };
    
    // Cargar inmediatamente
    fetchRealData();
    
    // Actualizar cada 30 segundos (Yahoo limita requests)
    const interval = setInterval(fetchRealData, 30000);
    
    return () => clearInterval(interval);
  }, [marketType]);
  
  // Función auxiliar para sectores
  const getSector = (symbol) => {
    const sectors = {
      'GGAL': 'Financiero',
      'BBAR': 'Financiero',
      'YPFD': 'Energía',
      'PAMP': 'Energía',
      'TXAR': 'Industrial',
      'ALUA': 'Industrial',
      'AAPL': 'Tecnología',
      'GOOGL': 'Tecnología',
      'MSFT': 'Tecnología',
      'TSLA': 'Automotriz',
      'KO': 'Consumo',
      'WMT': 'Retail'
    };
    return sectors[symbol] || 'Otro';
  };
};
```

---

## 📊 Opción 2: Cocos Capital API (Argentina)

API argentina específica. Requiere registro pero es gratuito:

```javascript
const COCOS_API = 'https://api.cocos.capital/api';

export const getCocosQuote = async (ticker) => {
  try {
    const response = await fetch(`${COCOS_API}/getTicker/${ticker}`);
    const data = await response.json();
    
    return {
      symbol: ticker,
      price: data.last_price,
      change: data.change_percent,
      volume: data.volume,
      // ... etc
    };
  } catch (error) {
    console.error('Error Cocos:', error);
    return null;
  }
};
```

Web: https://cocos.capital/

---

## 🌐 Opción 3: Alpha Vantage (Gratis pero limitada)

1500 requests por día gratis:

```javascript
const ALPHA_VANTAGE_KEY = 'tu_api_key_gratis';

export const getAlphaVantageQuote = async (symbol) => {
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}.BA&apikey=${ALPHA_VANTAGE_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  const quote = data['Global Quote'];
  
  return {
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['10. change percent'].replace('%', '')),
    volume: parseInt(quote['06. volume'])
  };
};
```

Obtener API Key gratis: https://www.alphavantage.co/support/#api-key

---

## 🔥 Opción 4: Web Scraping (Último Recurso)

Si ninguna API funciona, podés scrapear sitios públicos:

```javascript
// Proxy CORS (necesario para evitar errores)
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export const scrapeIOL = async (symbol) => {
  try {
    const url = `${CORS_PROXY}https://www.invertironline.com/titulo/cotizacion/${symbol}`;
    const response = await fetch(url);
    const html = await response.text();
    
    // Parsear HTML (simplificado)
    const priceMatch = html.match(/precio-titulo">([0-9,.]+)</);
    const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '')) : null;
    
    return { symbol, price };
  } catch (error) {
    console.error('Scraping error:', error);
    return null;
  }
};
```

---

## ✅ Recomendación Final: Yahoo Finance

**Yahoo Finance es tu mejor opción porque:**

✅ Totalmente gratis  
✅ No requiere registro  
✅ Tiene datos de Argentina  
✅ Datos históricos incluidos  
✅ API confiable y rápida  
✅ Sin límite estricto  

---

## 📝 Pasos para Implementar YA:

1. Copiá el código de `yahooFinance.js`
2. Creá el archivo en `src/services/yahooFinance.js`
3. Reemplazá el useEffect en `StockAlertBotArgentina.jsx`
4. Guardá y refrescá el navegador

¡Listo! Tendrás datos REALES del mercado argentino 🇦🇷📈

---

## ⚠️ Limitaciones de Yahoo Finance

- Actualizaciones cada ~15 minutos (no es tiempo real exacto)
- En horario de mercado es más preciso
- Fuera de horario muestra último precio de cierre
- No requiere autenticación

Para uso personal y aprendizaje es PERFECTO. 👌
