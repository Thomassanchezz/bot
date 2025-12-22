# 💼 Portfolio con Persistencia y Recomendaciones Personalizadas

## ✨ Nuevas Características Implementadas

### 🔒 Persistencia Automática

Tu portfolio ahora se **guarda automáticamente** en el navegador usando `localStorage`. Esto significa:

- ✅ **No pierdes tus datos** al cerrar la página
- ✅ **No pierdes tus datos** al recargar el navegador
- ✅ **Tus acciones persisten** entre sesiones
- ✅ **Las alertas también se guardan** automáticamente

### 🎯 Recomendaciones Personalizadas

Cada acción en tu portfolio recibe un análisis personalizado basado en:

1. **Tu ganancia/pérdida actual**
2. **Días que llevas con la acción**
3. **Precio de compra vs precio actual**
4. **Análisis técnico (RSI, volumen, momentum)**

## 📊 Lógica de Recomendaciones

### 🔴 VENDER

Se recomienda vender cuando:
- **Ganancia > 25%**: "Ganancia excelente, asegurá beneficios"
- **Pérdida > 15% + análisis negativo**: "Cortá pérdidas"
- **Ganancia 10-25% + RSI > 70**: "Sobrecompra, buen momento para vender"

### 🟡 MANTENER

Se recomienda mantener cuando:
- **Pérdida < 15% pero análisis positivo**: "Aguantá, puede recuperar"
- **Ganancia 10-25% + análisis favorable**: "Sigue favorable, mantené"
- **Posición estable (-10% a +10%)**: "Sin señales claras, observá"

### 🟢 COMPRAR

Se recomienda comprar más cuando:
- **Posición estable + análisis sugiere alza**: "Buen momento para aumentar posición"
- **Pérdida pero RSI < 30**: "Sobreventa, oportunidad de promediar a la baja"

## 📈 Nueva Información del Portfolio

Cada acción muestra:

### 💡 Análisis Personalizado
```
"Ganancia sólida (+15.3%). Análisis técnico aún favorable. 
Mantén la posición."
```

### 📊 Métricas Clave
- **Cambio desde compra**: Cuánto subió/bajó desde que la compraste
- **RSI Actual**: Indicador de sobrecompra/sobreventa
- **Días en portfolio**: Tiempo que llevas con la acción

### 🎯 Consejos Específicos

**Si deberías VENDER:**
- 🎯 Vende en el próximo rebote alcista
- 💰 Asegurá tu ganancia de $X
- 📉 Si cae más del 5%, vendé inmediatamente

**Si deberías MANTENER:**
- ⏳ Revisá en X semanas
- 📊 Configurá alerta si RSI baja de 30
- 🎯 Considerá vender si llega a +25%

**Si deberías COMPRAR más:**
- 💚 Momento para promediar a la baja
- 📈 El análisis indica recuperación
- ⚡ Aumentá tu posición

## 📍 Resumen Total del Portfolio

Nuevo panel que muestra:

```
┌─────────────────────────────────────────┐
│     Resumen Total del Portfolio         │
├─────────────┬─────────────┬─────────────┤
│  Invertido  │    Actual   │  Ganancia   │
│   $10,000   │   $11,500   │  +$1,500    │
│             │             │   +15.0%    │
└─────────────┴─────────────┴─────────────┘
```

## 🎨 Visualización Mejorada

### Colores Intuitivos:
- 🔴 **Rojo**: Vender / Pérdida
- 🟡 **Amarillo**: Mantener / Neutral
- 🟢 **Verde**: Comprar / Ganancia

### Badges de RSI:
- **RSI < 30**: 🟢 Verde (sobreventa, oportunidad)
- **RSI 30-70**: 🟡 Amarillo (neutral)
- **RSI > 70**: 🔴 Rojo (sobrecompra, precaución)

## 📝 Ejemplo de Uso

### 1. Agregar Acción al Portfolio

```
Símbolo: GGAL
Cantidad: 100
Precio de compra: $150
Fecha de compra: 01/12/2024
```

### 2. Ver Análisis

La app te mostrará:
```
💼 GGAL - 100 acciones
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Precio de compra: $150
Precio actual: $175
Invertido: $15,000
Valor actual: $17,500

Ganancia: +$2,500 (+16.67%)

🟡 MANTENER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Análisis:
Ganancia sólida (+16.67%). Análisis técnico 
aún favorable. Mantén la posición.

Cambio desde compra: +16.67%
RSI Actual: 55.3
Días en portfolio: 21

Recomendaciones:
• ⏳ Revisá en 3 semanas
• 📊 Configurá alerta si RSI baja de 30
• 🎯 Considerá vender si llega a +25%
```

## 🔧 Cómo Funciona el Guardado

### localStorage
```javascript
// Guardado automático
useEffect(() => {
  localStorage.setItem('stockPortfolio', JSON.stringify(portfolio));
}, [portfolio]);

// Carga al iniciar
const [portfolio, setPortfolio] = useState(() => {
  const saved = localStorage.getItem('stockPortfolio');
  return saved ? JSON.parse(saved) : [];
});
```

### Persistencia de Datos
- **Ubicación**: Navegador local (no servidor)
- **Duración**: Permanente hasta que borres datos del navegador
- **Privacidad**: Solo tú tienes acceso (local)
- **Sincronización**: No (solo en este dispositivo/navegador)

## 🗑️ Limpiar Portfolio

Si querés empezar de cero:

### Opción 1 - Borrar desde la app:
- Hacé clic en el icono 🗑️ de cada acción

### Opción 2 - Borrar todo desde la consola:
```javascript
// Abrir consola (F12) y ejecutar:
localStorage.removeItem('stockPortfolio');
localStorage.removeItem('stockAlerts');
location.reload();
```

## 💡 Consejos de Uso

1. **Revisá tu portfolio diariamente**: Los precios se actualizan cada 30 segundos
2. **Seguí las recomendaciones**: Basadas en análisis técnico profesional
3. **No ignores las pérdidas grandes**: Si ves -15% o más, evaluá cortar pérdidas
4. **Asegurá ganancias**: Si tenés +25% o más, considerá vender
5. **Usá alertas**: Configurá alertas de precio/RSI para cada acción

## ⚠️ Limitaciones

- **Solo local**: Los datos no se sincronizan entre dispositivos
- **Borrado de caché**: Si borrás datos del navegador, perdés el portfolio
- **Navegador privado**: En modo incógnito no se guardan datos
- **No es backup**: Recomendamos anotar tus inversiones importantes

## 📱 Backup Manual

Para hacer backup de tu portfolio:

1. Abrí la consola (F12)
2. Ejecutá:
```javascript
copy(localStorage.getItem('stockPortfolio'))
```
3. Pegá en un archivo de texto
4. Para restaurar:
```javascript
localStorage.setItem('stockPortfolio', '[PEGAR_AQUI]')
location.reload()
```

## 🎓 Entendiendo el Análisis

### Ejemplo Real:

**Compraste YPFD a $200, ahora está en $230 (21 días después)**

```
Cambio desde compra: +15%
RSI: 65
Análisis técnico: MANTENER

Recomendación: MANTENER
Razón: "Ganancia sólida (+15%). Análisis técnico 
aún favorable. Mantén la posición."

Consejo: Revisá en 3 semanas. Si llega a +25%, 
considerá vender.
```

**¿Por qué MANTENER y no VENDER?**
- Ganancia < 25% (aún tiene margen)
- RSI 65 (no sobrecompra)
- Solo 21 días (plazo corto)
- Análisis técnico favorable

---

## 🚀 ¡Empezá a Usar tu Portfolio!

1. Ve a la pestaña "Portfolio"
2. Agregá tus acciones actuales
3. Revisá las recomendaciones personalizadas
4. Configurá alertas para cada acción
5. Monitoreá tu rendimiento total

**¡Tu portfolio ahora se guarda automáticamente!** 🎉
