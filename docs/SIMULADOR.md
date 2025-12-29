# Simulador & Backtester

Una guía rápida para usar el Simulador integrado en la app.

## Cómo abrirlo
- En la aplicación, clic en la pestaña **Simulador**.
- El panel principal contiene el **BacktestPanel** y, a la derecha, las **Oportunidades Destacadas**.

## Controles principales
- **Símbolos**: lista de símbolos (coma separados) que se usarán para el backtest.
- **Timeframe**: define cuántos días históricos usar (90 / 180 / 365).
- **Hold days**: días máximos que se mantiene la operación.
- **Pesos**: pesos de indicadores (RSI, MA, MACD) que afectan el scoring.
- **Guardar Preset**: guarda la configuración actual para reutilizarla.
- **Run Batch**: ejecuta backtests para todos los presets guardados y guarda un reporte combinado en el historial.

## Historial
- Los resultados se guardan localmente (localStorage) y se muestran en el panel "Historial de Reportes".
- Se pueden ver, descargar individualmente (JSON) o exportar todo como un archivo JSON.
- Se mantienen hasta 50 reportes locales.

## Grid Search
- El script `scripts/grid_search.mjs` permite correr una búsqueda de parámetros desde la CLI.
- Ejemplos:
  - `npm run grid:search` — grilla por defecto
  - `npm run grid:search-extended` — grilla extendida (más combinaciones)
  - `node scripts/grid_search.mjs --extended --sample=20 --top=10` — ejecutar una muestra de 20 configuraciones y guardar top 10

## Archivos generados
- `reports/grid_search_full_<timestamp>.json` — resultados completos del grid-search
- `reports/grid_search_summary_<timestamp>.json` — resumen con el top-N
- `reports/grid_search_top_<timestamp>.csv` — CSV con las configuraciones top

## Tests
- Test unitarios con Vitest: `npm run test:unit`
- Test legacy basados en scripts: `npm test`

---

> ⚠️ Advertencia: los resultados dependen de datos históricos y supuestos. Usá esto como herramienta de investigación, no como recomendación de inversión.