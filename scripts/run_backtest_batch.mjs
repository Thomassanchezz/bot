import { evaluateStock } from '../src/utils/opportunities.js';
import { runBacktest } from '../src/services/backtest.js';
import axios from 'axios';
import fs from 'fs';

const fetchCloses = async (symbol, days=365) => {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.BA?interval=1d&range=${days}d`;
    const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const result = res.data.chart.result[0];
    const closes = result.indicators.quote[0].close;
    return closes.filter(p => p !== null);
  } catch (err) {
    console.warn('fetchCloses error', symbol, err.message || err);
    return [];
  }
};

const symbols = ['GGAL','YPFD','PAMP','BBAR','TXAR','ALUA','BMA','BYMA','EDN','COME','ALUA','PGR','CEPU','LOMA','AGRO'];

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
  const results = [];
  for (const s of symbols) {
    console.log(`Running batch eval for ${s}...`);
    const closes = await fetchCloses(s, 365);
    let usedCloses = closes;
    if (!usedCloses || usedCloses.length === 0) {
      const p = 100 + Math.round(Math.random() * 200);
      usedCloses = Array.from({length:365}).map((_,i)=> +(p * (1 + ((i-180)/1000))).toFixed(2));
    }
    const syntheticHistory = buildSyntheticOHLC(usedCloses);
    const ev = await evaluateStock(s, {}, usedCloses);
    if (!ev) continue;
    const signal = { symbol: ev.symbol, price: ev.price, targetPrice: ev.targetPrice, stopLoss: ev.stopLoss, holdDays: 30 };
    const report = runBacktest([signal], { [s]: syntheticHistory });
    results.push({ symbol: s, eval: ev, backtest: report });
  }

  // Save to reports
  const out = { date: new Date().toISOString(), results };
  const fileName = `reports/backtest_${Date.now()}.json`;
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync(fileName, JSON.stringify(out, null, 2));
  console.log(`Batch backtest finished. Results saved to ${fileName}`);
})();