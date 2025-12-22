# 🤖 Bot de Trading Inteligente - Mercado Argentino

Bot avanzado de análisis y alertas para acciones argentinas y CEDEARs con recomendaciones inteligentes de compra/venta.

## 🚀 Características

### Análisis Inteligente
- **Sistema de scoring**: Cada acción recibe un puntaje de compra y venta (0-100)
- **Indicadores técnicos**: RSI, volumen, momentum y cambio de precio
- **Recomendaciones automatizadas**: COMPRAR, VENDER o MANTENER
- **Nivel de confianza**: ALTA, MEDIA o BAJA según el análisis
- **Precio objetivo**: Estimación basada en el análisis técnico
- **Tiempo de mantención**: Sugerencia de días para mantener la inversión

### Factores de Análisis

El bot analiza 4 factores principales:

1. **RSI (30 puntos)**: Índice de Fuerza Relativa
   - RSI < 30: Sobreventa (oportunidad de compra)
   - RSI > 70: Sobrecompra (considerar venta)

2. **Cambio de Precio (30 puntos)**: Momentum del precio
   - Caída > 3%: Posible rebote
   - Subida > 3%: Considerar tomar ganancias

3. **Volumen (20 puntos)**: Interés del mercado
   - Volumen alto + suba: Señal de compra
   - Volumen alto + baja: Señal de venta

4. **Momentum (20 puntos)**: Tendencia general
   - Cambio positivo + RSI > 50: Impulso alcista
   - Cambio negativo + RSI < 50: Impulso bajista

### Funcionalidades

- ✅ **Alertas personalizadas** de precio y RSI
- ✅ **Panel de mejores oportunidades** de compra
- ✅ **Cotizaciones en tiempo real** (simuladas)
- ✅ **Análisis expandible** por acción
- ✅ **Acciones argentinas**: GGAL, YPF, PAMP, BBAR, TXAR, ALUA
- ✅ **CEDEARs**: AAPL, GOOGL, MSFT, TSLA, KO, WMT
- ✅ **Notificaciones** cuando se activan alertas

## 📊 Ejemplo de Recomendación

```
🟢 COMPRAR - Confianza ALTA
Precio: $3,500
Precio Objetivo: $4,025 (+15%)
Tiempo sugerido: 30 días
Riesgo: BAJO

Razones:
• RSI en zona de sobreventa (oportunidad de compra)
• Caída significativa del precio (posible rebote)
• Volumen alto (fuerte interés del mercado)

Score Compra: 85
Score Venta: 20
```

## 🛠️ Instalación y Ejecución Local

### Inicio Rápido

```bash
# 1. Navegar a la carpeta del proyecto
cd "c:\Users\sanch\Downloads\acciones"

# 2. Instalar dependencias (primera vez solamente)
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Abrir en el navegador
# http://localhost:5173/
```

### Otros comandos

```bash
# Compilar para producción
npm run build

# Vista previa del build
npm run preview

# Detener el servidor
Ctrl + C
```

📖 **[Ver guía detallada de instalación](INSTALACION.md)** con troubleshooting y tips

## 🔌 Conectar API Real

### Primary Remarkets WebSocket (Recomendado) ⚡

Esta es la API real de Primary con datos en tiempo real:

```javascript
// WebSocket URL
const WS_URL = 'wss://api.remarkets.primary.com.ar/';

// Ejemplo de conexión (ver src/hooks/usePrimaryWebSocket.js)
import usePrimaryWebSocket from './hooks/usePrimaryWebSocket';

const { stockData, connected } = usePrimaryWebSocket({
  symbols: ['GGAL', 'YPF', 'PAMP'],
  autoConnect: true
});
```

**Archivo de ejemplo**: [src/hooks/usePrimaryWebSocket.js](src/hooks/usePrimaryWebSocket.js)

### InvertirOnline (IOL) - API REST
```javascript
const getStockPrice = async (symbol) => {
  const response = await fetch(
    `https://api.invertironline.com/api/v2/Titulos/Cotizacion/paneles/MERVAL/Simbolos/${symbol}`
  );
  const data = await response.json();
  return data;
};
```

### Mercado Abierto Electrónico (MAE)
```javascript
const getMAEData = async (symbol) => {
  // Implementar según documentación de MAE
};
```

## 📈 Sistema de Scoring

| Score | Recomendación | Tiempo Sugerido |
|-------|---------------|-----------------|
| 70-100 | COMPRAR (Confianza ALTA) | 30 días |
| 50-69 | COMPRAR (Confianza MEDIA) | 20 días |
| 30-49 | COMPRAR (Confianza BAJA) | 10 días |
| -20 a 20 | MANTENER | 15 días |
| 30-49 | VENDER (Confianza BAJA) | Inmediato |
| 50-69 | VENDER (Confianza MEDIA) | Inmediato |
| 70-100 | VENDER (Confianza ALTA) | Inmediato |

## 🎯 Uso Recomendado

1. **Monitoreo Diario**: Revisá las "Mejores Oportunidades de Compra"
2. **Configurá Alertas**: Para recibir notificaciones de tus acciones favoritas
3. **Análisis Detallado**: Click en cualquier acción para ver el análisis completo
4. **Diversificá**: No pongas todo en una sola acción
5. **Stop Loss**: Usá alertas de precio para proteger tu capital

## ⚠️ Advertencias

- ❌ Los datos actuales son **SIMULADOS** para demostración
- ❌ Las recomendaciones son **ORIENTATIVAS**, no constituyen asesoramiento financiero
- ❌ Siempre hacé tu propia investigación (DYOR - Do Your Own Research)
- ❌ Invertí solo lo que estés dispuesto a perder
- ❌ Considerá consultar a un asesor financiero profesional

## 🔮 Mejoras Futuras

- [ ] Integración con API real de brokers argentinos
- [ ] Análisis de noticias con IA
- [ ] Backtesting de estrategias
- [ ] Portfolio tracking
- [ ] Alertas por email/Telegram
- [ ] Análisis fundamental (P/E, ROE, etc.)
- [ ] Comparación con índices (Merval, S&P 500)
- [ ] Machine Learning para predicciones

## 📱 Responsive

El bot está optimizado para:
- 💻 Desktop
- 📱 Mobile
- 📊 Tablet

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una branch para tu feature
3. Commit tus cambios
4. Push a la branch
5. Abre un Pull Request

## 📄 Licencia

MIT License - Uso libre para proyectos personales y comerciales.

## 🙏 Créditos

- Desarrollado con React + Vite
- Icons por Lucide React
- Styling con Tailwind CSS

---

**⚡ ¡Happy Trading!** 📈

*Recordá: El mejor momento para invertir fue ayer. El segundo mejor momento es hoy. Pero siempre con conocimiento y responsabilidad.*
