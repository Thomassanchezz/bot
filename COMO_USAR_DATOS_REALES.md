# 🔴 IMPORTANTE: Datos Simulados vs Datos Reales

## ⚠️ Situación Actual

**Los precios que ves AHORA son FALSOS (simulados) para demostración.**

Ejemplo en el código (línea 118 de `StockAlertBotArgentina.jsx`):
```javascript
'GGAL': {
  price: 3500 + Math.random() * 200 - 100,  // ❌ PRECIO FALSO
  rsi: 45 + Math.random() * 20,             // ❌ RSI FALSO
  // ... etc
}
```

Estos precios NO coinciden con la realidad porque son generados con `Math.random()`.

---

## ✅ Cómo Usar Datos REALES

### Opción 1: API WebSocket de Primary (Recomendada) ⚡

**URL**: `wss://api.remarkets.primary.com.ar/`

#### Paso 1: Reemplazar el código simulado

Abrí `src/components/StockAlertBotArgentina.jsx` y buscá esta línea (aprox. línea 118):

```javascript
// Datos simulados del mercado argentino con historia
useEffect(() => {
  const interval = setInterval(() => {
    const mockData = marketType === 'local' ? {
      'GGAL': {
        name: 'Grupo Galicia',
        price: 3500 + Math.random() * 200 - 100,  // ❌ ELIMINAR TODO ESTO
```

#### Paso 2: Reemplazar con API real

```javascript
import usePrimaryWebSocket from '../hooks/usePrimaryWebSocket';
import { enrichWithIndicators, PriceHistory } from '../utils/indicators';

const StockAlertBotArgentina = () => {
  // ... otros estados ...
  
  const priceHistory = useRef(new PriceHistory(200));
  
  // ✅ USAR DATOS REALES
  const { stockData: realTimeData, connected, error } = usePrimaryWebSocket({
    symbols: marketType === 'local' 
      ? ['GGAL', 'YPF', 'PAMP', 'BBAR', 'TXAR', 'ALUA']
      : ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'KO', 'WMT'],
    market: marketType === 'local' ? 'BYMA' : 'CEDEAR',
    autoConnect: true
  });

  // Enriquecer con indicadores técnicos (RSI, etc.)
  useEffect(() => {
    if (Object.keys(realTimeData).length > 0) {
      // Guardar historial de precios
      Object.entries(realTimeData).forEach(([symbol, data]) => {
        priceHistory.current.add(symbol, data.price);
      });

      // Calcular RSI y otros indicadores
      const enrichedData = {};
      Object.entries(realTimeData).forEach(([symbol, data]) => {
        const prices = priceHistory.current.getPrices(symbol);
        enrichedData[symbol] = {
          ...data,
          rsi: calculateRSI(prices),
          volume: data.volume || 0,
          change: data.change || 0
        };
      });

      setStockData(enrichedData);

      // Generar análisis
      const analysis = {};
      Object.entries(enrichedData).forEach(([symbol, data]) => {
        analysis[symbol] = analyzeStock(symbol, data, []);
      });
      setStockAnalysis(analysis);
      checkAlerts(enrichedData);
    }
  }, [realTimeData]);

  // ELIMINAR el viejo useEffect con setInterval y mockData
```

---

### Opción 2: API REST de InvertirOnline (Más Simple)

Si no tenés acceso a Primary WebSocket, podés usar la API REST de InvertirOnline:

```javascript
const fetchRealPrices = async () => {
  const symbols = ['GGAL', 'YPF', 'PAMP', 'BBAR'];
  const promises = symbols.map(async (symbol) => {
    try {
      const response = await fetch(
        `https://api.invertironline.com/api/v2/Titulos/Cotizacion/paneles/MERVAL/Simbolos/${symbol}`
      );
      const data = await response.json();
      
      return {
        symbol,
        name: data.descripcion,
        price: data.ultimoPrecio,
        volume: data.volumen,
        change: data.variacionPorcentual,
        bid: data.puntas?.compraOfrecida,
        ask: data.puntas?.ventaOfrecida,
        currency: 'ARS'
      };
    } catch (error) {
      console.error(`Error fetching ${symbol}:`, error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
};

// Usar en un useEffect con intervalo
useEffect(() => {
  const loadRealData = async () => {
    const realData = await fetchRealPrices();
    // ... procesar y setear stockData
  };

  loadRealData();
  const interval = setInterval(loadRealData, 5000); // Actualizar cada 5 seg

  return () => clearInterval(interval);
}, []);
```

---

## 🔑 ¿Necesitás Autenticación?

### Primary
Algunas APIs requieren un token. Contactá a Primary para obtener acceso:
- Web: https://www.primary.com.ar
- Email: soporte@primary.com.ar

### InvertirOnline
Necesitás:
1. Crear cuenta en https://www.invertironline.com
2. Solicitar acceso a API
3. Obtener tu token de desarrollo

---

## 📊 Diferencias: Simulado vs Real

| Aspecto | Datos Simulados (Actual) | Datos Reales |
|---------|--------------------------|--------------|
| Precio | Aleatorio (Math.random) | Mercado real |
| RSI | Aleatorio | Calculado de histórico real |
| Volumen | Aleatorio | Volumen real del mercado |
| Actualización | Cada 3 segundos | Tiempo real (WebSocket) |
| Confiable | ❌ NO | ✅ SÍ |

---

## 🚨 ADVERTENCIA LEGAL

- Los datos simulados son solo para **testing y desarrollo**
- **NUNCA** tomes decisiones de inversión basadas en datos simulados
- Las inversiones tienen riesgo de pérdida de capital
- Consultá con un asesor financiero profesional

---

## 📝 Checklist de Implementación

- [ ] Obtener acceso a API (Primary o IOL)
- [ ] Guardar credenciales en `.env.local`
- [ ] Reemplazar código simulado por llamadas a API real
- [ ] Probar con 1-2 acciones primero
- [ ] Verificar que los precios coincidan con broker
- [ ] Implementar manejo de errores
- [ ] Agregar indicador visual de "Datos Reales"

---

## 💡 Archivo de Ejemplo: `.env.local`

Creá este archivo en la raíz del proyecto:

```env
# Primary API
REACT_APP_PRIMARY_WS_URL=wss://api.remarkets.primary.com.ar/
REACT_APP_PRIMARY_API_KEY=tu_token_aqui

# InvertirOnline
REACT_APP_IOL_API_URL=https://api.invertironline.com/api/v2
REACT_APP_IOL_TOKEN=tu_token_aqui

# Configuración
REACT_APP_USE_REAL_DATA=true
REACT_APP_UPDATE_INTERVAL=3000
```

---

## 🆘 Soporte

Si tenés problemas para conectar datos reales:

1. Verificá que tu API key sea válida
2. Revisá la consola del navegador (F12) para errores
3. Confirmá que estés en horario de mercado (11:00 - 17:00 ART)
4. Probá primero con Postman o curl

---

**Recuerda**: Los datos simulados son útiles para aprender y probar, pero para invertir necesitás datos reales. 📊💰
