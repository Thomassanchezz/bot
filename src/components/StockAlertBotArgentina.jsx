import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, Activity, AlertCircle, Target, Clock, ShoppingCart, DollarSign, BarChart3, Wallet, ArrowUpCircle, ArrowDownCircle, Wifi } from 'lucide-react';
import { getMultipleQuotes, getHistoricalPrices } from '../services/yahooFinance';
import { calculateRSI } from '../utils/indicators';

const StockAlertBotArgentina = () => {
  // Cargar datos guardados de localStorage
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('stockAlerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [portfolio, setPortfolio] = useState(() => {
    const saved = localStorage.getItem('stockPortfolio');
    return saved ? JSON.parse(saved) : [];
  });
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    symbol: '',
    quantity: '',
    buyPrice: '',
    buyDate: new Date().toISOString().split('T')[0]
  });
  const [newAlert, setNewAlert] = useState({
    symbol: '',
    condition: 'above',
    price: '',
    indicator: 'price'
  });
  const [stockData, setStockData] = useState({});
  const [stockAnalysis, setStockAnalysis] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [marketType, setMarketType] = useState('local');
  const [selectedStock, setSelectedStock] = useState(null);
  const [topOpportunities, setTopOpportunities] = useState([]);
  const [activeTab, setActiveTab] = useState('portfolio'); // 'portfolio' o 'alerts'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rsiCache, setRsiCache] = useState({}); // Cache de RSI por símbolo
  const [lastRsiUpdate, setLastRsiUpdate] = useState(0); // Timestamp de última actualización de RSI
  const [updateCount, setUpdateCount] = useState(0); // Contador de actualizaciones

  // Guardar portfolio en localStorage cada vez que cambia
  useEffect(() => {
    localStorage.setItem('stockPortfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  // Guardar alerts en localStorage cada vez que cambian
  useEffect(() => {
    localStorage.setItem('stockAlerts', JSON.stringify(alerts));
  }, [alerts]);

  // Función para calcular mejores horarios de trading
  const getBestTradingHours = (recommendation, volatility, isLocal) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    if (isLocal) {
      // Mercado argentino: 11:00 - 17:00 ART
      const marketOpen = { hour: 11, minute: 0 };
      const marketClose = { hour: 17, minute: 0 };
      
      // Mejores horarios según la estrategia
      let buyWindow, sellWindow;
      
      if (recommendation === 'COMPRAR') {
        // Para compras: mejores momentos son apertura (11:00-12:00) o después de almuerzo (14:30-15:30)
        // cuando hay menos volatilidad
        if (volatility === 'ALTA') {
          buyWindow = '14:30-15:30 (Después de almuerzo, mercado más estable)';
        } else {
          buyWindow = '11:15-11:45 o 14:30-15:30 (Apertura o post-almuerzo)';
        }
        sellWindow = '16:00-16:45 (Cerca del cierre para capturar movimientos del día)';
      } else if (recommendation === 'VENDER') {
        // Para ventas: mejores momentos son media mañana (11:30-12:30) o antes del cierre (16:00-16:45)
        buyWindow = '11:15-12:00 (Apertura con momentum)';
        sellWindow = '11:30-12:30 o 16:00-16:45 (Media mañana o cierre)';
      } else {
        buyWindow = '11:15-12:00 o 14:30-15:30';
        sellWindow = '11:30-12:30 o 16:00-16:45';
      }
      
      // Determinar si estamos en horario de mercado
      const isMarketOpen = (currentHour > marketOpen.hour || (currentHour === marketOpen.hour && currentMinute >= marketOpen.minute)) &&
                          (currentHour < marketClose.hour || (currentHour === marketClose.hour && currentMinute < marketClose.minute));
      
      return {
        marketType: 'Argentina',
        marketHours: '11:00 - 17:00 ART',
        isMarketOpen,
        currentTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`,
        bestBuyTime: buyWindow,
        bestSellTime: sellWindow,
        recommendation: isMarketOpen 
          ? (recommendation === 'COMPRAR' 
              ? (currentHour === 11 || (currentHour >= 14 && currentHour < 16) ? '🟢 Buen momento para comprar' : '🟡 Esperá a 14:30-15:30')
              : recommendation === 'VENDER'
              ? ((currentHour >= 11 && currentHour < 13) || (currentHour >= 16) ? '🟢 Buen momento para vender' : '🟡 Esperá a 16:00-16:45')
              : '🟡 Monitoreá el mercado')
          : '🔴 Mercado cerrado - Opera mañana'
      };
    } else {
      // Mercado USA: 9:30 - 16:00 EST (14:30 - 21:00 ART aprox)
      const marketOpen = { hour: 14, minute: 30 }; // En hora argentina
      const marketClose = { hour: 21, minute: 0 };
      
      let buyWindow, sellWindow;
      
      if (recommendation === 'COMPRAR') {
        // Primera hora (14:30-15:30 ART) o última hora (19:30-20:30 ART)
        buyWindow = '14:45-15:30 o 19:30-20:30 ART (Apertura USA o cierre)';
        sellWindow = '19:30-20:45 ART (Última hora de trading)';
      } else if (recommendation === 'VENDER') {
        buyWindow = '14:45-15:30 ART (Apertura USA con volumen)';
        sellWindow = '14:45-15:30 o 19:30-20:45 ART (Apertura o cierre)';
      } else {
        buyWindow = '14:45-15:30 o 18:00-19:00 ART';
        sellWindow = '15:00-16:00 o 19:30-20:45 ART';
      }
      
      const isMarketOpen = (currentHour > marketOpen.hour || (currentHour === marketOpen.hour && currentMinute >= marketOpen.minute)) &&
                          (currentHour < marketClose.hour || (currentHour === marketClose.hour && currentMinute < marketClose.minute));
      
      return {
        marketType: 'USA',
        marketHours: '14:30 - 21:00 ART (9:30-16:00 EST)',
        isMarketOpen,
        currentTime: `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} ART`,
        bestBuyTime: buyWindow,
        bestSellTime: sellWindow,
        recommendation: isMarketOpen 
          ? (recommendation === 'COMPRAR' 
              ? ((currentHour === 14 && currentMinute >= 45) || currentHour === 15 || (currentHour >= 19 && currentHour < 21) ? '🟢 Buen momento para comprar' : '🟡 Esperá a 14:45 o 19:30')
              : recommendation === 'VENDER'
              ? ((currentHour === 14 && currentMinute >= 45) || currentHour === 15 || (currentHour >= 19) ? '🟢 Buen momento para vender' : '🟡 Esperá horarios pico')
              : '🟡 Monitoreá el mercado')
          : '🔴 Mercado cerrado - Opera mañana 14:30 ART'
      };
    }
  };

  // Sistema de análisis técnico avanzado
  const analyzeStock = (symbol, data, historicalData) => {
    const { price, rsi, volume, change } = data;
    
    // Calcular señales
    const signals = {
      rsi: rsi < 30 ? 'COMPRAR' : rsi > 70 ? 'VENDER' : 'MANTENER',
      price: parseFloat(change) > 2 ? 'FUERTE_ALZA' : parseFloat(change) < -2 ? 'FUERTE_BAJA' : 'NEUTRAL',
      volume: volume > 3000000 ? 'ALTO' : 'MEDIO'
    };

    // Sistema de scoring (0-100)
    let buyScore = 0;
    let sellScore = 0;

    // Análisis RSI (30 puntos)
    if (rsi < 30) buyScore += 30;
    else if (rsi < 40) buyScore += 20;
    else if (rsi > 70) sellScore += 30;
    else if (rsi > 60) sellScore += 20;

    // Análisis de cambio de precio (30 puntos)
    const changeVal = parseFloat(change);
    if (changeVal < -3) buyScore += 30;
    else if (changeVal < -1.5) buyScore += 20;
    else if (changeVal > 3) sellScore += 30;
    else if (changeVal > 1.5) sellScore += 20;

    // Análisis de volumen (20 puntos)
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

    // Determinar recomendación principal
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
    } else {
      recommendation = 'MANTENER';
      confidence = 'MEDIA';
      holdDays = 15;
    }

    // Calcular precio objetivo
    const targetPrice = recommendation === 'COMPRAR' 
      ? price * 1.15 
      : recommendation === 'VENDER' 
        ? price * 0.85 
        : price * 1.05;

    // Generar razones
    const reasons = [];
    if (rsi < 30) reasons.push('RSI en zona de sobreventa (oportunidad de compra)');
    else if (rsi > 70) reasons.push('RSI en zona de sobrecompra (riesgo de corrección)');
    else if (rsi > 40 && rsi < 60) reasons.push('RSI en zona neutral');

    if (changeVal < -2) reasons.push('Caída significativa del precio (posible rebote)');
    else if (changeVal > 2) reasons.push('Fuerte subida (tomar ganancias o esperar consolidación)');

    if (volume > 4000000) reasons.push('Volumen alto (fuerte interés del mercado)');
    else if (volume < 2000000) reasons.push('Volumen bajo (poca convicción)');

    // Calcular volatilidad para mejores horarios
    const volatility = Math.abs(changeVal) > 3 ? 'ALTA' : Math.abs(changeVal) > 1.5 ? 'MEDIA' : 'BAJA';
    const isLocal = marketType === 'local';
    const tradingHours = getBestTradingHours(recommendation, volatility, isLocal);

    return {
      recommendation,
      confidence,
      buyScore,
      sellScore,
      holdDays,
      targetPrice,
      signals,
      reasons,
      risk: sellScore > 60 ? 'ALTO' : buyScore > 60 ? 'BAJO' : 'MEDIO',
      tradingHours
    };
  };

  // Función auxiliar para obtener sector
  const getSector = (symbol) => {
    const sectors = {
      // Argentinas
      'GGAL': 'Financiero',
      'BBAR': 'Financiero',
      'BMA': 'Financiero',
      'SUPV': 'Financiero',
      'YPFD': 'Energía',
      'PAMP': 'Energía',
      'TGSU2': 'Energía',
      'TXAR': 'Industrial',
      'ALUA': 'Industrial',
      'TECO2': 'Telecomunicaciones',
      'EDN': 'Energía',
      'LOMA': 'Energía',
      'MIRG': 'Industrial',
      'BYMA': 'Financiero',
      'TRAN': 'Energía',
      'COME': 'Consumo',
      'CEPU': 'Telecomunicaciones',
      'CRES': 'Consumo',
      'VALO': 'Energía',
      'AGRO': 'Agroindustrial',
      // USA
      'AAPL': 'Tecnología',
      'GOOGL': 'Tecnología',
      'MSFT': 'Tecnología',
      'AMZN': 'Tecnología',
      'META': 'Tecnología',
      'NVDA': 'Tecnología',
      'NFLX': 'Tecnología',
      'AMD': 'Tecnología',
      'INTC': 'Tecnología',
      'TSLA': 'Automotriz',
      'KO': 'Consumo',
      'WMT': 'Retail',
      'BABA': 'Tecnología',
      'DIS': 'Entretenimiento',
      'BA': 'Industrial',
      'JPM': 'Financiero',
      'V': 'Financiero',
      'MA': 'Financiero',
      'PFE': 'Salud',
      'JNJ': 'Salud'
    };
    return sectors[symbol] || 'Otro';
  };

  // Obtener datos REALES de Yahoo Finance con OPTIMIZACIÓN
  useEffect(() => {
    const fetchRealData = async (forceRsiUpdate = false) => {
      const isFirstLoad = updateCount === 0;
      if (isFirstLoad) setLoading(true);
      setError(null);
      
      // REDUCIDO A 6 ACCIONES para máxima optimización
      const symbols = marketType === 'local' 
        ? ['GGAL', 'YPFD', 'PAMP', 'BBAR', 'TXAR', 'ALUA']
        : ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA'];
      
      try {
        const now = Date.now();
        console.log(`🔄 Act. #${updateCount + 1}: ${isFirstLoad ? 'COMPLETA' : 'SOLO PRECIOS'}`);
        
        // SIEMPRE obtener cotizaciones actuales (rápido)
        const realData = await getMultipleQuotes(symbols, marketType === 'local');
        
        if (Object.keys(realData).length === 0) {
          throw new Error('No se pudieron obtener datos');
        }
        
        const enrichedData = {};
        
        if (isFirstLoad) {
          // Solo calcular RSI en la primera carga
          console.log('📈 Calculando RSI inicial (solo primera vez)...');
          const newRsiCache = {};
          
          for (const symbol of symbols) {
            const data = realData[symbol];
            if (!data) continue;
            
            try {
              const symbolForHistory = marketType === 'local' ? `${symbol}.BA` : symbol;
              const history = await getHistoricalPrices(symbolForHistory, 14);
              const rsi = calculateRSI(history, 14);
              newRsiCache[symbol] = rsi || 50;
            } catch (err) {
              console.warn(`⚠️ Error RSI ${symbol}:`, err.message);
              newRsiCache[symbol] = 50;
            }
            
            // Pequeña pausa entre peticiones
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          setRsiCache(newRsiCache);
          setLastRsiUpdate(now);
          
          // Construir datos enriquecidos con nuevo RSI
          Object.entries(realData).forEach(([symbol, data]) => {
            enrichedData[symbol] = {
              ...data,
              rsi: newRsiCache[symbol] || 50,
              sector: getSector(symbol)
            };
          });
        } else {
          console.log('⚡ Usando RSI del cache');
          // Usar RSI del cache (estimado basado en cambio de precio)
          Object.entries(realData).forEach(([symbol, data]) => {
            // Estimar cambio de RSI basado en cambio de precio
            let estimatedRsi = rsiCache[symbol] || 50;
            if (rsiCache[symbol]) {
              const priceChange = parseFloat(data.change);
              // Ajuste simple: si sube mucho, RSI sube; si baja mucho, RSI baja
              if (priceChange > 3) estimatedRsi = Math.min(estimatedRsi + 5, 100);
              else if (priceChange > 1.5) estimatedRsi = Math.min(estimatedRsi + 2, 100);
              else if (priceChange < -3) estimatedRsi = Math.max(estimatedRsi - 5, 0);
              else if (priceChange < -1.5) estimatedRsi = Math.max(estimatedRsi - 2, 0);
            }
            
            enrichedData[symbol] = {
              ...data,
              rsi: estimatedRsi,
              sector: getSector(symbol)
            };
          });
        }
        
        setStockData(enrichedData);
        
        // Generar análisis para cada acción
        const analysis = {};
        Object.entries(enrichedData).forEach(([symbol, data]) => {
          analysis[symbol] = analyzeStock(symbol, data, []);
        });
        setStockAnalysis(analysis);
        
        checkAlerts(enrichedData);
        setUpdateCount(prev => prev + 1);
        if (isFirstLoad) setLoading(false);
        
      } catch (error) {
        console.error('❌ Error fetching data:', error);
        setError(error.message);
        if (isFirstLoad) setLoading(false);
      }
    };
    
    // Reset cuando cambia el mercado
    setUpdateCount(0);
    setRsiCache({});
    setLastRsiUpdate(0);
    
    // Cargar datos inmediatamente con RSI
    fetchRealData(true);
    
    // Actualizar cada 90 segundos (solo precios, RSI estimado)
    const interval = setInterval(() => fetchRealData(false), 90000);

    return () => clearInterval(interval);
  }, [marketType]);


  const checkAlerts = (data) => {
    alerts.forEach(alert => {
      const stock = data[alert.symbol];
      if (!stock) return;

      let triggered = false;
      let message = '';

      if (alert.indicator === 'price') {
        if (alert.condition === 'above' && stock.price > parseFloat(alert.price)) {
          triggered = true;
          message = `${alert.symbol} superó $${parseFloat(alert.price).toLocaleString('es-AR')} (Actual: $${stock.price.toLocaleString('es-AR', {maximumFractionDigits: 2})})`;
        } else if (alert.condition === 'below' && stock.price < parseFloat(alert.price)) {
          triggered = true;
          message = `${alert.symbol} cayó bajo $${parseFloat(alert.price).toLocaleString('es-AR')} (Actual: $${stock.price.toLocaleString('es-AR', {maximumFractionDigits: 2})})`;
        }
      } else if (alert.indicator === 'rsi') {
        if (alert.condition === 'above' && stock.rsi > parseFloat(alert.price)) {
          triggered = true;
          message = `${alert.symbol} RSI sobre ${alert.price} (Actual: ${stock.rsi.toFixed(1)}) - Sobrecompra`;
        } else if (alert.condition === 'below' && stock.rsi < parseFloat(alert.price)) {
          triggered = true;
          message = `${alert.symbol} RSI bajo ${alert.price} (Actual: ${stock.rsi.toFixed(1)}) - Sobreventa`;
        }
      }

      if (triggered && !alert.triggered) {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          message,
          time: new Date().toLocaleTimeString('es-AR')
        }]);
        setAlerts(prev => prev.map(a => 
          a.id === alert.id ? {...a, triggered: true} : a
        ));
      }
    });
  };

  const addAlert = () => {
    if (!newAlert.symbol || !newAlert.price) return;

    const stockExists = stockData[newAlert.symbol.toUpperCase()];
    if (!stockExists) {
      alert('Este símbolo no está disponible. Verificá que esté en la lista de acciones disponibles.');
      return;
    }

    setAlerts([...alerts, {
      id: Date.now(),
      ...newAlert,
      symbol: newAlert.symbol.toUpperCase(),
      triggered: false
    }]);

    setNewAlert({
      symbol: '',
      condition: 'above',
      price: '',
      indicator: 'price'
    });
  };

  const deleteAlert = (id) => {
    setAlerts(alerts.filter(a => a.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
    setAlerts(alerts.map(a => ({...a, triggered: false})));
  };

  // Funciones del portafolio
  const addToPortfolio = () => {
    if (!newPortfolioItem.symbol || !newPortfolioItem.quantity || !newPortfolioItem.buyPrice) {
      alert('Por favor completá todos los campos');
      return;
    }

    const stockExists = stockData[newPortfolioItem.symbol.toUpperCase()];
    if (!stockExists) {
      alert('Este símbolo no está disponible. Verificá que esté en la lista de acciones disponibles.');
      return;
    }

    const newItem = {
      id: Date.now(),
      symbol: newPortfolioItem.symbol.toUpperCase(),
      quantity: parseFloat(newPortfolioItem.quantity),
      buyPrice: parseFloat(newPortfolioItem.buyPrice),
      buyDate: newPortfolioItem.buyDate,
      addedDate: new Date().toISOString()
    };

    setPortfolio([...portfolio, newItem]);
    
    setNewPortfolioItem({
      symbol: '',
      quantity: '',
      buyPrice: '',
      buyDate: new Date().toISOString().split('T')[0]
    });
  };

  const deleteFromPortfolio = (id) => {
    setPortfolio(portfolio.filter(p => p.id !== id));
  };

  const calculatePortfolioMetrics = (item) => {
    const stock = stockData[item.symbol];
    if (!stock) return null;

    const currentValue = stock.price * item.quantity;
    const invested = item.buyPrice * item.quantity;
    const profit = currentValue - invested;
    const profitPercent = ((profit / invested) * 100).toFixed(2);
    
    const analysis = stockAnalysis[item.symbol];
    const priceChange = ((stock.price - item.buyPrice) / item.buyPrice * 100).toFixed(2);
    
    // Días que lleva la inversión
    const daysHeld = Math.floor((new Date() - new Date(item.buyDate)) / (1000 * 60 * 60 * 24));
    
    // Calcular tiempo recomendado de mantención
    let holdDays = 30; // default
    if (stock.rsi < 40) {
      holdDays = 14; // RSI bajo, puede recuperar pronto
    } else if (stock.rsi > 60) {
      holdDays = 7; // RSI alto, revisar pronto
    } else if (Math.abs(profitPercent) < 2) {
      holdDays = 21; // Posición muy estable, dar tiempo
    }
    
    // Recomendación personalizada basada en tu posición
    let personalizedRecommendation = 'MANTENER';
    let reasonText = '';
    
    if (profitPercent > 25) {
      personalizedRecommendation = 'VENDER';
      reasonText = `Ganancia excelente (+${profitPercent}%). Considera asegurar beneficios.`;
    } else if (profitPercent < -15) {
      if (analysis?.recommendation === 'COMPRAR') {
        personalizedRecommendation = 'MANTENER';
        reasonText = `Pérdida actual (${profitPercent}%), pero análisis técnico indica recuperación. Mantén por ${holdDays} días más y reevalúa.`;
      } else {
        personalizedRecommendation = 'VENDER';
        reasonText = `Pérdida significativa (${profitPercent}%) y análisis técnico no favorece. Considera cortar pérdidas.`;
      }
    } else if (profitPercent > 10 && profitPercent <= 25) {
      if (analysis?.recommendation === 'VENDER' || stock.rsi > 70) {
        personalizedRecommendation = 'VENDER';
        reasonText = `Buena ganancia (+${profitPercent}%). RSI indica sobrecompra. Buen momento para vender.`;
      } else {
        personalizedRecommendation = 'MANTENER';
        reasonText = `Ganancia sólida (+${profitPercent}%). Análisis técnico aún favorable. Mantén por ${holdDays} días más para maximizar ganancias.`;
      }
    } else if (profitPercent >= -10 && profitPercent <= 10) {
      personalizedRecommendation = analysis?.recommendation || 'MANTENER';
      if (analysis?.recommendation === 'COMPRAR') {
        reasonText = `Posición estable. Análisis técnico sugiere potencial alcista. Mantén ${holdDays} días y considera comprar más si baja.`;
      } else if (analysis?.recommendation === 'VENDER') {
        reasonText = `Posición estable pero análisis técnico sugiere debilidad. Monitorea de cerca los próximos ${holdDays} días.`;
      } else {
        reasonText = `Posición estable (${profitPercent}%). Sin señales claras, mantén ${holdDays} días y observa el movimiento del mercado.`;
      }
    }
    
    return {
      currentValue,
      invested,
      profit,
      profitPercent,
      currentPrice: stock.price,
      priceChange,
      daysHeld,
      holdDays,
      recommendation: personalizedRecommendation,
      reasonText,
      shouldSell: personalizedRecommendation === 'VENDER',
      shouldHold: personalizedRecommendation === 'MANTENER',
      analysis,
      rsi: stock.rsi
    };
  };

  const getTotalPortfolioValue = () => {
    let totalInvested = 0;
    let totalCurrent = 0;

    portfolio.forEach(item => {
      const stock = stockData[item.symbol];
      if (stock) {
        totalInvested += item.buyPrice * item.quantity;
        totalCurrent += stock.price * item.quantity;
      }
    });

    return {
      invested: totalInvested,
      current: totalCurrent,
      profit: totalCurrent - totalInvested,
      profitPercent: totalInvested > 0 ? (((totalCurrent - totalInvested) / totalInvested) * 100).toFixed(2) : 0
    };
  };

  const formatPrice = (price) => {
    if (typeof price !== 'number' || isNaN(price)) return '0,00';
    
    // Para Argentina: punto = miles, coma = decimales
    // Ejemplo: 55.100,25 (cincuenta y cinco mil cien con veinticinco centavos)
    return price.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatVolume = (volume) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    }
    return (volume / 1000).toFixed(0) + 'K';
  };

  const getRecommendationColor = (rec) => {
    switch(rec) {
      case 'COMPRAR': return 'text-green-400 bg-green-500/20 border-green-400';
      case 'VENDER': return 'text-red-400 bg-red-500/20 border-red-400';
      default: return 'text-yellow-400 bg-yellow-500/20 border-yellow-400';
    }
  };

  const getConfidenceColor = (conf) => {
    switch(conf) {
      case 'ALTA': return 'text-green-400';
      case 'MEDIA': return 'text-yellow-400';
      default: return 'text-orange-400';
    }
  };

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'BAJO': return 'text-green-400';
      case 'MEDIO': return 'text-yellow-400';
      default: return 'text-red-400';
    }
  };

  // Actualizar mejores oportunidades de compra (mantener estabilidad)
  useEffect(() => {
    if (Object.keys(stockAnalysis).length === 0) return;

    // Obtener todas las acciones ordenadas por buyScore
    const allStocks = Object.entries(stockAnalysis)
      .sort((a, b) => b[1].buyScore - a[1].buyScore);

    // Priorizar acciones con recomendación de COMPRAR
    const buyRecommendations = allStocks.filter(([_, analysis]) => 
      analysis.recommendation === 'COMPRAR'
    );

    // Si hay menos de 3 con COMPRAR, completar con las mejores puntuadas
    let newOpportunities = [...buyRecommendations];
    
    if (newOpportunities.length < 3) {
      const additionalStocks = allStocks.filter(([symbol, _]) => 
        !newOpportunities.some(([s, _]) => s === symbol)
      );
      newOpportunities = [...newOpportunities, ...additionalStocks].slice(0, 3);
    } else {
      newOpportunities = newOpportunities.slice(0, 3);
    }

    // Solo actualizar si hay cambios significativos en el orden o score
    const shouldUpdate = topOpportunities.length === 0 || 
      JSON.stringify(newOpportunities.map(([s]) => s)) !== 
      JSON.stringify(topOpportunities.map(([s]) => s));

    if (shouldUpdate) {
      setTopOpportunities(newOpportunities);
    }
  }, [stockAnalysis]);

  // Obtener mejores oportunidades (ahora desde el estado)
  const getTopBuyOpportunities = () => {
    return topOpportunities;
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
              <Activity className="text-blue-400" size={36} />
              Bot de Trading Inteligente - Argentina
            </h1>
            <p className="text-blue-200 text-sm md:text-base">Análisis avanzado con recomendaciones de compra/venta y tiempo de mantención</p>
          </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-red-400 font-bold mb-1">Error al cargar datos</h3>
              <p className="text-red-200 text-sm">{error}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-2 px-4 py-1 bg-red-500/30 hover:bg-red-500/50 rounded text-white text-sm transition-all"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="mb-6 bg-blue-500/20 border border-blue-500 rounded-lg p-6 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
              <p className="text-blue-200">Cargando datos del mercado...</p>
            </div>
          </div>
        )}

        {/* Indicador de estado de conexión y actualizaciones OPTIMIZADO */}
        {!loading && updateCount > 0 && (
          <div className="mb-4 flex justify-center">
            <div className="bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2 border border-white/20 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-300">⚡ Ultra Rápido</span>
              </div>
              <div className="h-4 w-px bg-white/20"></div>
              <span className="text-xs text-gray-400">
                Actualiza: <span className="text-white font-semibold">cada 90s</span>
              </span>
              <div className="h-4 w-px bg-white/20"></div>
              <span className="text-xs text-gray-400">
                6 acciones: <span className="text-green-300 font-semibold">6 req/90s</span>
              </span>
              <div className="h-4 w-px bg-white/20"></div>
              <span className="text-xs text-gray-400">
                RSI: <span className="text-purple-300 font-semibold">🧠 IA</span>
              </span>
            </div>
          </div>
        )}

        {/* Selector de mercado */}
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={() => setMarketType('local')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              marketType === 'local' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            Acciones Argentinas
          </button>
          <button
            onClick={() => setMarketType('cedears')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              marketType === 'cedears' 
                ? 'bg-blue-500 text-white' 
                : 'bg-white/10 text-blue-200 hover:bg-white/20'
            }`}
          >
            CEDEARs
          </button>
        </div>

        {/* Panel de mejores oportunidades */}
        <div className="mb-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-xl p-4 md:p-6 border-2 border-green-400">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <ShoppingCart className="text-green-400" size={24} />
            Mejores Oportunidades de Compra
          </h2>
          
          {getTopBuyOpportunities().length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">Cargando análisis de oportunidades...</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {getTopBuyOpportunities().map(([symbol, analysis]) => {
                const stock = stockData[symbol];
                if (!stock) return null;
                
                return (
                  <div key={symbol} className="bg-white/10 rounded-lg p-4 border border-green-400/30 hover:bg-white/15 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">{symbol}</h3>
                        <p className="text-xs text-gray-400">{stock.name}</p>
                      </div>
                      <div className="bg-green-500/30 px-3 py-1 rounded-full">
                        <p className="text-green-400 font-bold text-sm">{analysis.buyScore}%</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-green-300 mb-2">${formatPrice(stock.price)}</p>
                    <div className="space-y-1 text-xs text-gray-300">
                      <p>• Recomendación: <span className={`font-semibold ${getRecommendationColor(analysis.recommendation)}`}>{analysis.recommendation}</span></p>
                      <p>• Confianza: <span className={`font-semibold ${getConfidenceColor(analysis.confidence)}`}>{analysis.confidence}</span></p>
                      <p>• Mantener: <span className="text-white font-semibold">{analysis.holdDays} días</span></p>
                      <p>• Objetivo: <span className="text-green-400 font-semibold">${formatPrice(analysis.targetPrice)}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Info box - Datos Reales */}
        <div className="mb-6 bg-green-500/20 border-2 border-green-400 rounded-xl p-4">
          <div className="flex gap-3">
            <Wifi className="text-green-400 flex-shrink-0" size={24} />
            <div className="text-sm text-white">
              <p className="font-bold mb-2 text-lg text-green-300">✅ Datos Reales de Yahoo Finance</p>
              <p className="mb-1">Cotizaciones reales del mercado argentino actualizadas cada 30 segundos.</p>
              <p className="text-xs text-gray-300">Fuente: Yahoo Finance API • Los precios pueden tener un delay de ~15 minutos según el horario de mercado</p>
            </div>
          </div>
        </div>

        {/* Panel de Portafolio */}
        {portfolio.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-xl p-4 md:p-6 border-2 border-purple-400">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="text-purple-400" size={24} />
                Mi Portafolio ({portfolio.length} acciones)
              </h2>
              <div className="text-right">
                {(() => {
                  const totals = getTotalPortfolioValue();
                  return (
                    <div>
                      <p className="text-sm text-gray-300">Valor Total</p>
                      <p className="text-2xl font-bold text-white">${formatPrice(totals.current)}</p>
                      <p className={`text-sm font-semibold ${totals.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {totals.profit >= 0 ? '+' : ''}{totals.profitPercent}% (${formatPrice(Math.abs(totals.profit))})
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="space-y-3">
              {portfolio.map(item => {
                const metrics = calculatePortfolioMetrics(item);
                if (!metrics) return null;

                return (
                  <div key={item.id} className="bg-white/10 rounded-lg p-4 border border-purple-400/30">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white">{item.symbol}</h3>
                        <p className="text-xs text-gray-400">{item.quantity} acciones</p>
                      </div>
                      <button
                        onClick={() => deleteFromPortfolio(item.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Precio de compra:</span>
                          <span className="text-white font-semibold">${formatPrice(item.buyPrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Precio actual:</span>
                          <span className="text-white font-semibold">${formatPrice(metrics.currentPrice)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Invertido:</span>
                          <span className="text-white font-semibold">${formatPrice(metrics.invested)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Valor actual:</span>
                          <span className="text-white font-semibold">${formatPrice(metrics.currentValue)}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className={`p-3 rounded-lg border-2 ${metrics.profit >= 0 ? 'bg-green-500/20 border-green-400' : 'bg-red-500/20 border-red-400'}`}>
                          <p className="text-xs text-gray-300 mb-1">Ganancia/Pérdida</p>
                          <p className={`text-2xl font-bold ${metrics.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {metrics.profit >= 0 ? '+' : ''}${formatPrice(Math.abs(metrics.profit))}
                          </p>
                          <p className={`text-sm font-semibold ${metrics.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {metrics.profit >= 0 ? '+' : ''}{metrics.profitPercent}%
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recomendación Personalizada */}
                    <div className={`p-4 rounded-lg border-2 ${
                      metrics.recommendation === 'VENDER' ? 'bg-red-500/20 border-red-400' :
                      metrics.recommendation === 'COMPRAR' ? 'bg-green-500/20 border-green-400' :
                      'bg-yellow-500/20 border-yellow-400'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {metrics.recommendation === 'VENDER' ? (
                            <ArrowDownCircle className="text-red-400" size={28} />
                          ) : metrics.recommendation === 'COMPRAR' ? (
                            <ArrowUpCircle className="text-green-400" size={28} />
                          ) : (
                            <Target className="text-yellow-400" size={28} />
                          )}
                          <div>
                            <p className="text-xs text-gray-400">Tu Recomendación</p>
                            <p className={`text-2xl font-bold ${
                              metrics.recommendation === 'VENDER' ? 'text-red-400' :
                              metrics.recommendation === 'COMPRAR' ? 'text-green-400' :
                              'text-yellow-400'
                            }`}>
                              {metrics.recommendation}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Días en portfolio</p>
                          <p className="text-lg font-bold text-white">{metrics.daysHeld}</p>
                        </div>
                      </div>

                      {/* Razón personalizada */}
                      <div className="bg-black/20 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-200 leading-relaxed">
                          <span className="font-semibold">💡 Análisis: </span>
                          {metrics.reasonText}
                        </p>
                      </div>

                      {/* Métricas adicionales */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-black/20 rounded p-2">
                          <p className="text-gray-400 mb-1">Cambio desde compra</p>
                          <p className={`font-bold text-lg ${metrics.priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {metrics.priceChange >= 0 ? '+' : ''}{metrics.priceChange}%
                          </p>
                        </div>
                        <div className="bg-black/20 rounded p-2">
                          <p className="text-gray-400 mb-1">RSI Actual</p>
                          <p className={`font-bold text-lg ${
                            metrics.rsi < 30 ? 'text-green-400' :
                            metrics.rsi > 70 ? 'text-red-400' :
                            'text-yellow-400'
                          }`}>
                            {metrics.rsi.toFixed(1)}
                          </p>
                        </div>
                      </div>

                      {/* Consejos específicos */}
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-gray-400 mb-2">Recomendaciones:</p>
                        <div className="space-y-1 text-xs text-gray-300">
                          {metrics.recommendation === 'VENDER' && (
                            <>
                              <p>• 🎯 Considerá vender en el próximo rebote alcista</p>
                              {metrics.profitPercent > 0 && <p>• 💰 Asegurá tu ganancia de ${formatPrice(Math.abs(metrics.profit))}</p>}
                              <p>• 📉 Si cae más del 5%, vende inmediatamente</p>
                            </>
                          )}
                          {metrics.recommendation === 'MANTENER' && (
                            <>
                              <p>• ⏳ Mantené la posición por {metrics.holdDays} días más ({Math.ceil(metrics.holdDays / 7)} semanas)</p>
                              <p>• 📊 Configurá alerta si RSI baja de 30 (oportunidad de compra)</p>
                              {metrics.profitPercent > 0 && <p>• 🎯 Considerá vender si llega a +25%</p>}
                              {metrics.profitPercent < 0 && <p>• 🔄 Si recupera a +5%, evaluá vender</p>}
                            </>
                          )}
                          {metrics.recommendation === 'COMPRAR' && (
                            <>
                              <p>• 💚 Excelente momento para promediar a la baja</p>
                              <p>• 📈 El análisis técnico indica recuperación en {metrics.holdDays} días</p>
                              <p>• ⚡ Considerá aumentar tu posición en {item.symbol}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

          {/* Resumen Total del Portfolio */}
          {portfolio.length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-lg p-6 border-2 border-purple-400/40">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Wallet size={24} className="text-purple-400" />
                Resumen Total del Portfolio
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Total Invertido</p>
                  <p className="text-2xl font-bold text-white">${formatPrice(getTotalPortfolioValue().invested)}</p>
                </div>
                <div className="bg-black/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">Valor Actual</p>
                  <p className="text-2xl font-bold text-white">${formatPrice(getTotalPortfolioValue().current)}</p>
                </div>
                <div className={`bg-black/30 rounded-lg p-4 border-2 ${
                  getTotalPortfolioValue().profit >= 0 ? 'border-green-400/50' : 'border-red-400/50'
                }`}>
                  <p className="text-sm text-gray-400 mb-1">Ganancia/Pérdida</p>
                  <p className={`text-2xl font-bold ${
                    getTotalPortfolioValue().profit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {getTotalPortfolioValue().profit >= 0 ? '+' : ''}${formatPrice(Math.abs(getTotalPortfolioValue().profit))}
                  </p>
                </div>
                <div className={`bg-black/30 rounded-lg p-4 border-2 ${
                  getTotalPortfolioValue().profitPercent >= 0 ? 'border-green-400/50' : 'border-red-400/50'
                }`}>
                  <p className="text-sm text-gray-400 mb-1">Rendimiento</p>
                  <p className={`text-2xl font-bold ${
                    getTotalPortfolioValue().profitPercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {getTotalPortfolioValue().profitPercent >= 0 ? '+' : ''}{getTotalPortfolioValue().profitPercent}%
                  </p>
                </div>
              </div>
            </div>
          )}

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Panel de agregar a portafolio o alertas */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'portfolio' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Wallet className="inline mr-2" size={18} />
                Mi Portafolio
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeTab === 'alerts' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Bell className="inline mr-2" size={18} />
                Alertas
              </button>
            </div>

            {activeTab === 'portfolio' ? (
              <>
                <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Plus size={24} className="text-purple-400" />
                  Agregar Acción al Portafolio
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-blue-200 mb-1 block">Símbolo (Ticker)</label>
                    <input
                      type="text"
                      placeholder={marketType === 'local' ? 'GGAL, YPF, PAMP...' : 'AAPL, GOOGL, MSFT...'}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                      value={newPortfolioItem.symbol}
                      onChange={(e) => setNewPortfolioItem({...newPortfolioItem, symbol: e.target.value.toUpperCase()})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-blue-200 mb-1 block">Cantidad</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        placeholder="10"
                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                        value={newPortfolioItem.quantity}
                        onChange={(e) => setNewPortfolioItem({...newPortfolioItem, quantity: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="text-sm text-blue-200 mb-1 block">
                        Precio de Compra
                        <span className="text-xs text-gray-400 ml-2">(sin puntos ni comas)</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="55100 (no 55.100)"
                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                        value={newPortfolioItem.buyPrice}
                        onChange={(e) => setNewPortfolioItem({...newPortfolioItem, buyPrice: e.target.value})}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        💡 Ejemplo: Si compraste a $55.100, ingresá: <span className="text-green-400 font-mono">55100</span>
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-blue-200 mb-1 block">Fecha de Compra</label>
                    <input
                      type="date"
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
                      value={newPortfolioItem.buyDate}
                      onChange={(e) => setNewPortfolioItem({...newPortfolioItem, buyDate: e.target.value})}
                    />
                  </div>

                  <button
                    onClick={addToPortfolio}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-700 transition-all"
                  >
                    Agregar a Mi Portafolio
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Plus size={24} className="text-green-400" />
                  Crear Nueva Alerta
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-blue-200 mb-1 block">Símbolo (Ticker)</label>
                    <input
                      type="text"
                      placeholder={marketType === 'local' ? 'GGAL, YPF, PAMP...' : 'AAPL, GOOGL, MSFT...'}
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                      value={newAlert.symbol}
                      onChange={(e) => setNewAlert({...newAlert, symbol: e.target.value.toUpperCase()})}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-blue-200 mb-1 block">Indicador</label>
                    <select
                      className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                      value={newAlert.indicator}
                      onChange={(e) => setNewAlert({...newAlert, indicator: e.target.value})}
                    >
                      <option value="price">Precio (ARS)</option>
                      <option value="rsi">RSI (Índice de Fuerza Relativa)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-blue-200 mb-1 block">Condición</label>
                      <select
                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        value={newAlert.condition}
                        onChange={(e) => setNewAlert({...newAlert, condition: e.target.value})}
                      >
                        <option value="above">Por encima de</option>
                        <option value="below">Por debajo de</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-sm text-blue-200 mb-1 block">Valor</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0"
                        className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
                        value={newAlert.price}
                        onChange={(e) => setNewAlert({...newAlert, price: e.target.value})}
                      />
                    </div>
                  </div>

                  <button
                    onClick={addAlert}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 transition-all"
                  >
                    Agregar Alerta
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Panel de cotizaciones con análisis */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20">
            <h2 className="text-lg md:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 size={24} className="text-blue-400" />
              Análisis y Cotizaciones
            </h2>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {Object.entries(stockData).map(([symbol, data]) => {
                const analysis = stockAnalysis[symbol];
                if (!analysis) return null;

                return (
                  <div 
                    key={symbol} 
                    className="bg-white/5 rounded-lg p-4 border border-white/10 cursor-pointer hover:bg-white/10 transition-all"
                    onClick={() => setSelectedStock(selectedStock === symbol ? null : symbol)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-base md:text-lg font-bold text-white">{symbol}</h3>
                        <p className="text-xs text-gray-400">{data.name}</p>
                        <p className="text-xl md:text-2xl font-bold text-blue-300 mt-1">
                          ${formatPrice(data.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`flex items-center gap-1 mb-1 ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {data.change >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                          <span className="font-semibold text-sm">{data.change}%</span>
                        </div>
                        <div className={`px-3 py-1 rounded-full border text-xs font-bold ${getRecommendationColor(analysis.recommendation)}`}>
                          {analysis.recommendation}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-300 mb-2">
                      <div>RSI: <span className="text-white font-semibold">{data.rsi.toFixed(1)}</span></div>
                      <div>Vol: <span className="text-white font-semibold">{formatVolume(data.volume)}</span></div>
                      <div>Riesgo: <span className={`font-semibold ${getRiskColor(analysis.risk)}`}>{analysis.risk}</span></div>
                      <div>Conf: <span className={`font-semibold ${getConfidenceColor(analysis.confidence)}`}>{analysis.confidence}</span></div>
                    </div>

                    {selectedStock === symbol && (
                      <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="text-blue-400" size={16} />
                          <span className="text-gray-300">Precio Objetivo:</span>
                          <span className="text-white font-bold">${formatPrice(analysis.targetPrice)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="text-blue-400" size={16} />
                          <span className="text-gray-300">Tiempo sugerido:</span>
                          <span className="text-white font-bold">{analysis.holdDays} días</span>
                        </div>

                        <div className="bg-white/5 rounded p-3 mt-2">
                          <p className="text-xs font-semibold text-blue-300 mb-2">Razones del análisis:</p>
                          <ul className="space-y-1">
                            {analysis.reasons.map((reason, idx) => (
                              <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                                <span className="text-blue-400">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Mejores horarios de trading */}
                        {analysis.tradingHours && (
                          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-3 mt-3 border border-purple-400/30">
                            <p className="text-xs font-semibold text-purple-300 mb-2 flex items-center gap-2">
                              <Clock size={14} />
                              ⏰ Mejores Horarios para Operar
                            </p>
                            
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-300">Mercado:</span>
                                <span className="text-white font-semibold">{analysis.tradingHours.marketType}</span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-gray-300">Horario:</span>
                                <span className="text-white font-semibold">{analysis.tradingHours.marketHours}</span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-gray-300">Hora actual:</span>
                                <span className={`font-semibold ${analysis.tradingHours.isMarketOpen ? 'text-green-400' : 'text-red-400'}`}>
                                  {analysis.tradingHours.currentTime}
                                </span>
                              </div>
                              
                              <div className="pt-2 border-t border-white/10">
                                <div className="mb-2">
                                  <p className="text-gray-400 mb-1">🛒 Mejor hora para COMPRAR:</p>
                                  <p className="text-green-300 font-semibold">{analysis.tradingHours.bestBuyTime}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 mb-1">💰 Mejor hora para VENDER:</p>
                                  <p className="text-red-300 font-semibold">{analysis.tradingHours.bestSellTime}</p>
                                </div>
                              </div>
                              
                              <div className="pt-2 border-t border-white/10">
                                <p className="text-center font-bold text-white">
                                  {analysis.tradingHours.recommendation}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div className="bg-green-500/10 rounded p-2 text-center">
                            <p className="text-xs text-gray-400">Score Compra</p>
                            <p className="text-lg font-bold text-green-400">{analysis.buyScore}</p>
                          </div>
                          <div className="bg-red-500/10 rounded p-2 text-center">
                            <p className="text-xs text-gray-400">Score Venta</p>
                            <p className="text-lg font-bold text-red-400">{analysis.sellScore}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel de alertas activas */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 md:p-6 border border-white/20 mb-6">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4">
            Alertas Activas ({alerts.length})
          </h2>
          
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No hay alertas configuradas</p>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className={`flex justify-between items-center p-4 rounded-lg ${alert.triggered ? 'bg-green-500/20 border-2 border-green-400' : 'bg-white/5 border border-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <Bell className={alert.triggered ? 'text-green-400' : 'text-blue-400'} size={20} />
                    <div>
                      <p className="text-white font-semibold text-sm md:text-base">
                        {alert.symbol} - {alert.indicator === 'price' ? 'Precio' : 'RSI'} {alert.condition === 'above' ? '>' : '<'} {alert.indicator === 'price' ? `$${parseFloat(alert.price).toLocaleString('es-AR')}` : alert.price}
                      </p>
                      {alert.triggered && <p className="text-green-400 text-xs md:text-sm">¡Alerta activada!</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel de notificaciones */}
        {notifications.length > 0 && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-xl p-4 md:p-6 border-2 border-green-400">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Bell className="text-green-400" size={24} />
                Notificaciones ({notifications.length})
              </h2>
              <button
                onClick={clearNotifications}
                className="text-xs md:text-sm bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Limpiar
              </button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.map(notif => (
                <div key={notif.id} className="bg-white/10 rounded-lg p-4 border border-green-400/30">
                  <p className="text-white font-semibold text-sm md:text-base">{notif.message}</p>
                  <p className="text-green-300 text-xs md:text-sm mt-1">{notif.time}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default StockAlertBotArgentina;
