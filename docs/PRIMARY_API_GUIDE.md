# 🔌 Integración con Primary Remarkets WebSocket

## URL de la API
```
wss://api.remarkets.primary.com.ar/
```

## 📋 Requisitos

1. **Cuenta en Primary**: Necesitás tener una cuenta activa
2. **Token de autenticación**: Algunos endpoints pueden requerir autenticación
3. **Símbolos válidos**: Los tickers deben estar listados en Primary

## 🚀 Uso Rápido

### 1. Importar el hook personalizado

```javascript
import usePrimaryWebSocket from './hooks/usePrimaryWebSocket';

function TradingComponent() {
  const { stockData, connected, error } = usePrimaryWebSocket({
    symbols: ['GGAL', 'YPF', 'PAMP', 'BBAR'],
    autoConnect: true,
    market: 'BYMA'
  });

  if (!connected) return <div>Conectando...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {Object.entries(stockData).map(([symbol, data]) => (
        <div key={symbol}>
          <h3>{symbol}</h3>
          <p>Precio: ${data.price}</p>
          <p>Volumen: {data.volume}</p>
        </div>
      ))}
    </div>
  );
}
```

### 2. Suscribirse dinámicamente

```javascript
const { subscribe, unsubscribe } = usePrimaryWebSocket({
  symbols: ['GGAL'],
  autoConnect: true
});

// Agregar nueva acción
subscribe('ALUA');

// Quitar acción
unsubscribe('GGAL');
```

## 📡 Formato de Mensajes

### Mensaje de Suscripción
```json
{
  "type": "subscribe",
  "symbol": "GGAL",
  "market": "BYMA"
}
```

### Mensaje de Desuscripción
```json
{
  "type": "unsubscribe",
  "symbol": "GGAL",
  "market": "BYMA"
}
```

### Respuesta de Cotización (Ejemplo)
```json
{
  "type": "quote",
  "symbol": "GGAL",
  "price": 3500.50,
  "bid": 3498.00,
  "ask": 3502.00,
  "volume": 5234567,
  "change": 2.35,
  "high": 3550.00,
  "low": 3400.00,
  "timestamp": "2025-12-22T15:30:00Z"
}
```

## ⚙️ Configuración Avanzada

### Con Autenticación
```javascript
const usePrimaryWebSocket = ({
  symbols = [],
  apiKey = process.env.REACT_APP_PRIMARY_API_KEY,
  autoConnect = true
}) => {
  // ... código del hook

  ws.onopen = () => {
    // Autenticar primero
    ws.send(JSON.stringify({
      type: 'auth',
      token: apiKey
    }));
    
    // Luego suscribir
    symbols.forEach(subscribe);
  };
};
```

### Con Manejo de Errores Robusto
```javascript
const [retryCount, setRetryCount] = useState(0);
const MAX_RETRIES = 5;

ws.onclose = () => {
  if (retryCount < MAX_RETRIES) {
    setTimeout(() => {
      setRetryCount(prev => prev + 1);
      connect();
    }, Math.min(1000 * Math.pow(2, retryCount), 30000)); // Exponential backoff
  } else {
    setError('Máximo de reintentos alcanzado');
  }
};
```

## 🏦 Mercados Disponibles

```javascript
const MARKETS = {
  BYMA: 'Bolsa de Buenos Aires',      // Acciones argentinas
  CEDEAR: 'CEDEARs',                   // Acciones internacionales
  ROFEX: 'Mercado de Futuros',        // Futuros
  MAE: 'Mercado Abierto Electrónico'  // Renta fija
};
```

## 📊 Integrando con el Bot Existente

Reemplazá los datos simulados en `StockAlertBotArgentina.jsx`:

```javascript
import usePrimaryWebSocket from '../hooks/usePrimaryWebSocket';

const StockAlertBotArgentina = () => {
  // Reemplazar el useEffect de datos simulados con:
  const { stockData: realData, connected } = usePrimaryWebSocket({
    symbols: marketType === 'local' 
      ? ['GGAL', 'YPF', 'PAMP', 'BBAR', 'TXAR', 'ALUA']
      : ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'KO', 'WMT'],
    market: marketType === 'local' ? 'BYMA' : 'CEDEAR',
    autoConnect: true
  });

  // Calcular RSI y otros indicadores
  useEffect(() => {
    if (Object.keys(realData).length > 0) {
      const enrichedData = enrichWithIndicators(realData);
      setStockData(enrichedData);
    }
  }, [realData]);
};
```

## 🔍 Debugging

```javascript
// Activar logs detallados
const { stockData, connected, error } = usePrimaryWebSocket({
  symbols: ['GGAL'],
  debug: true  // Agregar esta opción al hook
});

// En el hook:
if (config.debug) {
  console.log('📨 Mensaje enviado:', message);
  console.log('📬 Mensaje recibido:', data);
}
```

## ⚡ Optimizaciones

### 1. Throttling de Updates
```javascript
import { throttle } from 'lodash';

const handleMessageThrottled = throttle(handleMessage, 100); // Max 10 updates/seg
```

### 2. Batch Updates
```javascript
const batchTimeout = useRef();
const pendingUpdates = useRef({});

const handleMessage = (data) => {
  pendingUpdates.current[data.symbol] = data;
  
  clearTimeout(batchTimeout.current);
  batchTimeout.current = setTimeout(() => {
    setStockData(prev => ({
      ...prev,
      ...pendingUpdates.current
    }));
    pendingUpdates.current = {};
  }, 50);
};
```

## 🛡️ Manejo de Sesión

```javascript
// Detectar inactividad
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutos
const lastActivityRef = useRef(Date.now());

useEffect(() => {
  const interval = setInterval(() => {
    if (Date.now() - lastActivityRef.current > SESSION_TIMEOUT) {
      disconnect();
      console.log('Sesión cerrada por inactividad');
    }
  }, 60000);

  return () => clearInterval(interval);
}, []);
```

## 📝 Variables de Entorno

Creá un archivo `.env.local`:

```env
REACT_APP_PRIMARY_WS_URL=wss://api.remarkets.primary.com.ar/
REACT_APP_PRIMARY_API_KEY=tu_api_key_aqui
REACT_APP_MARKET_TYPE=BYMA
REACT_APP_DEBUG=false
```

## 🤝 Soporte

- **Documentación oficial**: [Primary API Docs](https://www.primary.com.ar)
- **Soporte técnico**: Contactar a Primary directamente
- **Foro**: Comunidad de desarrolladores de Primary

## ⚠️ Notas Importantes

1. **Rate Limiting**: Respetá los límites de la API
2. **Horarios**: La API solo funciona en horario de mercado (11:00 - 17:00 ART)
3. **Autenticación**: Algunos datos pueden requerir suscripción paga
4. **Testing**: Usá símbolos de prueba en desarrollo

---

**💡 Tip**: Para testing local sin conexión, mantené los datos simulados como fallback:

```javascript
const stockData = connected ? realData : simulatedData;
```
