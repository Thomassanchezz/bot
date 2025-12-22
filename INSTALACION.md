# 🚀 Guía de Instalación Local - Paso a Paso

## Requisitos Previos

- **Node.js**: Versión 16 o superior
- **npm** o **yarn**: Gestor de paquetes

### Verificar si tenés Node.js instalado:

```bash
node --version
npm --version
```

Si no tenés Node.js, descargalo de: https://nodejs.org/

---

## 📋 Pasos para Ejecutar

### 1. Abrir terminal en la carpeta del proyecto

```bash
cd "c:\Users\sanch\Downloads\acciones"
```

### 2. Instalar dependencias

```bash
npm install
```

Esto instalará:
- React
- Vite
- Tailwind CSS
- Lucide React (iconos)

⏱️ Puede tardar 1-2 minutos la primera vez.

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

### 4. Abrir en el navegador

Verás algo como esto en la terminal:

```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Abrí tu navegador en: **http://localhost:5173/**

---

## 🎯 ¿Qué vas a ver?

El bot funcionando con **datos simulados** que se actualizan cada 3 segundos:

✅ Panel de mejores oportunidades de compra
✅ Cotizaciones en tiempo real (simuladas)
✅ Sistema de alertas
✅ Recomendaciones de COMPRAR/VENDER/MANTENER
✅ Análisis técnico con RSI, volumen, etc.

---

## 🔄 Cambios en Tiempo Real

Vite tiene **Hot Module Replacement (HMR)**, lo que significa:

- Editás un archivo `.jsx` o `.js`
- **Guardás** (Ctrl + S)
- El navegador se actualiza **automáticamente** sin refrescar

---

## 🛠️ Comandos Útiles

```bash
# Iniciar servidor de desarrollo
npm run dev

# Compilar para producción
npm run build

# Vista previa de build de producción
npm run preview

# Detener el servidor
Ctrl + C (en la terminal)
```

---

## 🔌 Para Usar Datos Reales

### Opción 1: WebSocket de Primary (Requiere cuenta)

1. Editá `src/components/StockAlertBotArgentina.jsx`

2. Reemplazá el `useEffect` de datos simulados con:

```javascript
import usePrimaryWebSocket from '../hooks/usePrimaryWebSocket';

const { stockData: realData, connected } = usePrimaryWebSocket({
  symbols: ['GGAL', 'YPF', 'PAMP', 'BBAR'],
  autoConnect: true
});
```

### Opción 2: API REST (Más simple para empezar)

Creá un archivo `src/services/stockService.js`:

```javascript
export const fetchStockData = async (symbol) => {
  try {
    const response = await fetch(
      `https://api.invertironline.com/api/v2/Titulos/Cotizacion/paneles/MERVAL/Simbolos/${symbol}`
    );
    return await response.json();
  } catch (error) {
    console.error('Error fetching stock:', error);
    return null;
  }
};
```

---

## 🐛 Problemas Comunes

### Error: "Cannot find module"

```bash
# Borrá node_modules y reinstalá
rm -rf node_modules
npm install
```

### Error: "Port already in use"

El puerto 5173 está ocupado. Opciones:

```bash
# 1. Usar otro puerto
npm run dev -- --port 3000

# 2. O cerrar el proceso que usa el puerto
```

### Error: "npm not found"

Node.js no está instalado o no está en el PATH. Reinstalá Node.js.

### La página está en blanco

1. Abrí las DevTools del navegador (F12)
2. Mirá la consola para ver errores
3. Verificá que todos los archivos estén en su lugar

---

## 📂 Estructura del Proyecto

```
acciones/
├── src/
│   ├── components/
│   │   └── StockAlertBotArgentina.jsx  ← Componente principal
│   ├── hooks/
│   │   └── usePrimaryWebSocket.js      ← Hook para WebSocket
│   ├── utils/
│   │   └── indicators.js               ← Cálculos de indicadores
│   ├── App.jsx                         ← Componente raíz
│   ├── main.jsx                        ← Entry point
│   └── index.css                       ← Estilos globales
├── docs/
│   └── PRIMARY_API_GUIDE.md            ← Guía de API
├── index.html                          ← HTML base
├── package.json                        ← Dependencias
├── vite.config.js                      ← Config de Vite
└── tailwind.config.js                  ← Config de Tailwind
```

---

## 🎨 Personalización Rápida

### Cambiar acciones monitoreadas

En `StockAlertBotArgentina.jsx`, línea ~89:

```javascript
const mockData = marketType === 'local' ? {
  'GGAL': { ... },
  'YPF': { ... },
  'TUACCION': {  // ← Agregá tu acción acá
    name: 'Nombre de tu acción',
    price: 1000,
    rsi: 50,
    volume: 1000000,
    change: 0,
    currency: 'ARS',
    sector: 'Tu Sector'
  }
}
```

### Cambiar colores

En `src/index.css` o directamente en los componentes (clases de Tailwind):

```javascript
// Cambiar color del gradiente de fondo
className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
```

---

## 📱 Probar en Mobile

1. Asegurate de estar en la misma red WiFi
2. Ejecutá con:

```bash
npm run dev -- --host
```

3. Verás una IP de red, ejemplo:

```
➜  Network: http://192.168.1.100:5173/
```

4. Abrí esa URL en tu celular

---

## 🚀 Deploy a Producción

### Vercel (Gratis)

```bash
npm install -g vercel
vercel
```

### Netlify (Gratis)

1. `npm run build`
2. Arrastrá la carpeta `dist` a netlify.com

### GitHub Pages

```bash
# Agregá a vite.config.js:
base: '/acciones/'

# Luego:
npm run build
```

---

## 💡 Tips

- **Probá en modo incógnito** para evitar cache
- **Usá React DevTools** para debugging
- **Mirá la consola** siempre que algo no funcione
- **Los datos son simulados** hasta que conectes una API real

---

## 🆘 Necesitás Ayuda?

1. Revisá los logs en la terminal
2. Abrí DevTools (F12) y mirá la consola
3. Verificá que todos los archivos existan
4. Asegurate de estar en la carpeta correcta

---

**¡Listo para empezar! 🎉**

```bash
cd "c:\Users\sanch\Downloads\acciones"
npm install
npm run dev
```
