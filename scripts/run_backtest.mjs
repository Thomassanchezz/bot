import { evaluateStock } from '../src/utils/opportunities.js';
import { runBacktest } from '../src/services/backtest.js';
import axios from 'axios';

const fetchCloses = async (symbol, days=180) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.BA?interval=1d&range=${days}d`;
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const result = res.data.chart.result[0];
    const closes = result.indicators.quote[0].close;
    return closes.filter(p => p !== null);
  } catch (err) {
    console.error('fetchCloses error', symbol, err.message || err);
    return [];
  }
};

const symbols = ['GGAL','YPFD','PAMP','BBAR','TXAR','ALUA'];

const buildSyntheticOHLC = (closes) => {
  const hist = [];
  for (let i = 0; i < closes.length; i++) {
    const close = closes[i];
    const prevClose = i > 0 ? closes[i-1] : close;
    const open = prevClose;
    const high = Math.max(open, close) * (1 + (Math.random() * 0.01));
    const low = Math.min(open, close) * (1 - (Math.random() * 0.01));
    hist.push({ date: i, open, high, low, close, volume: 0 });
  }
  return hist;
};

(async () => {
  console.log('Iniciando backtest sobre símbolos:', symbols.join(', '));
  const evaluations = [];
  const histories = {};

  for (const s of symbols) {
    console.log(`Evaluando ${s}...`);

    // intentar obtener closes para backtest
    const closes = await fetchCloses(s).catch(() => []);
    let usedCloses = closes;
    if (!usedCloses || usedCloses.length === 0) {
      console.warn(`No se obtuvo historial para ${s}, usando histórico sintético (a partir de precio estimado)`);
      // crear pequeño histórico sintético alrededor de un precio estimado (random cerca de 100)
      const p = 100 + Math.round(Math.random() * 200);
      usedCloses = Array.from({length:60}).map((_,i)=> +(p * (1 + ((i-30)/1000))).toFixed(2));
    }

    // Pasar el histórico como override a evaluateStock para evitar llamadas a la API desde el módulo
    const ev = await evaluateStock(s, {}, usedCloses);
    if (!ev) {
      console.warn(`No se pudo evaluar ${s}`);
      continue;
    }

    evaluations.push(ev);
    histories[s] = buildSyntheticOHLC(usedCloses);
    console.log(`Historial usado para ${s}: ${usedCloses.length} días`);
  }

  const signals = evaluations.map(e => ({ symbol: e.symbol, price: e.price, targetPrice: e.targetPrice, stopLoss: e.stopLoss, holdDays: 30 }));
  console.log('\nSeñales generadas:');
  console.table(signals.map(s => ({ symbol: s.symbol, price: s.price, target: s.targetPrice, stop: s.stopLoss })));

  const report = runBacktest(signals, histories);
  console.log('\nReporte resumido de backtest:');
  console.log(`Total: ${report.total}, Wins: ${report.wins}, Losses: ${report.losses}, WinRate: ${report.winRate}%`);
  console.log('\nDetalle (primeros 10):');
  console.log(JSON.stringify(report.results.slice(0, 10), null, 2));
})();