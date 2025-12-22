# 🔍 Instrucciones de Debugging

## ✅ Problema de CORS SOLUCIONADO

### Lo que se hizo:

1. **Configurado Proxy en Vite**: El archivo [vite.config.js](vite.config.js) ahora incluye un proxy que redirige las peticiones a Yahoo Finance
2. **Actualizado el servicio**: [yahooFinance.js](src/services/yahooFinance.js) ahora usa `/api/yahoo` en desarrollo (que pasa por el proxy)
3. **Reiniciado el servidor**: Los cambios están activos en http://localhost:5174/

### Cómo funciona:

```
Tu App (localhost:5174) → Proxy de Vite → Yahoo Finance API
     ✅ Sin CORS              ✅ Sin CORS        ✅ Datos reales
```

## 🎯 Verifica que Funcione

Abre la consola del navegador (F12) y deberías ver:

```
🔄 Obteniendo datos de Yahoo Finance para: ['GGAL', 'YPFD', 'PAMP', 'BBAR', 'TXAR', 'ALUA']
✅ Datos recibidos: {GGAL: {...}, YPFD: {...}, ...}
📊 Datos enriquecidos: {...}
```

**Sin errores de CORS** ❌ ~~"Access-Control-Allow-Origin faltante"~~

## 📊 Estados de la Aplicación

- **Loading**: Spinner azul con mensaje "Cargando datos del mercado..."
- **Error**: Banner rojo con botón "Reintentar"
- **Success**: Tarjetas de acciones con datos reales y recomendaciones

## 🚀 Acciones Disponibles

### Acciones Argentinas (Mercado Local):
- **GGAL** - Grupo Financiero Galicia
- **YPFD** - YPF
- **PAMP** - Pampa Energía
- **BBAR** - Banco BBVA Argentina
- **TXAR** - Ternium Argentina
- **ALUA** - Aluar

### Acciones Internacionales (USA):
- **AAPL** - Apple
- **GOOGL** - Google
- **MSFT** - Microsoft
- **TSLA** - Tesla
- **KO** - Coca-Cola
- **WMT** - Walmart

## 🎓 Cómo Usar el Bot

1. **Ver Recomendaciones**: Las tarjetas muestran si es momento de COMPRAR, VENDER o MANTENER
2. **Agregar Alertas**: Configura alertas de precio o RSI para recibir notificaciones
3. **Portfolio**: Agrega acciones que posees para hacer seguimiento de ganancias/pérdidas
4. **Análisis Técnico**: El bot usa 4 factores:
   - RSI (Índice de Fuerza Relativa)
   - Cambio de precio
   - Volumen de operaciones
   - Momentum

## 🔧 Si Aún Hay Problemas

### 1. Reiniciar el servidor:
```bash
npm run dev
```

### 2. Limpiar caché del navegador:
- Presiona `Ctrl + Shift + R` para forzar recarga

### 3. Verificar el proxy:
```bash
# El archivo vite.config.js debe tener:
server: {
  proxy: {
    '/api/yahoo': {
      target: 'https://query1.finance.yahoo.com',
      changeOrigin: true
    }
  }
}
```

## ⚠️ Notas Importantes

- Los datos se actualizan cada **30 segundos**
- Yahoo Finance tiene límites de peticiones (generoso para desarrollo)
- En producción, considera usar tu propio backend
- El RSI se calcula con los últimos 14 días de datos históricos

## 📞 Soporte

Si ves algún error en la consola, copia el mensaje completo para diagnóstico.
