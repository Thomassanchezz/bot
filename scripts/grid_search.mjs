import { evaluateStock } from '../src/utils/opportunities.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { runBacktest } from '../src/services/backtest.js';

const symbols = ['GGAL','YPFD','PAMP','BBAR','TXAR','ALUA'];

// Parse CLI args
const argv = process.argv.slice(2);
const hasFlag = (name) => argv.some(a => a === name || a.startsWith(name+"="));
const getArg = (name, fallback) => {
  const m = argv.find(a => a.startsWith(name+"="));
  if (!m) return fallback;
  return m.split('=')[1];
};

const topN = parseInt(getArg('--top', '20')) || 20;
const sampleLimit = parseInt(getArg('--sample', '0')) || 0; // 0 => no sample
const extended = hasFlag('--extended');

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

// Build param grid (bigger if --extended)
const paramGrid = [];
if (extended) {
  for (let rsi = 8; rsi <= 22; rsi += 2) {
    for (let ma = 10; ma <= 60; ma += 10) {
      for (let macd = 8; macd <= 26; macd += 2) {
        for (let atrStop = 0.5; atrStop <= 2; atrStop += 0.5) {
          for (let atrTarget = 2; atrTarget <= 6; atrTarget += 1) {
            paramGrid.push({ rsi, ma, macd, atrStop, atrTarget });
          }
        }
      }
    }
  }
} else {
  for (let rsi=10; rsi<=30; rsi+=10) {
    for (let ma=20; ma<=40; ma+=10) {
      for (let macd=10; macd<=30; macd+=10) {
        for (let atrStop=1; atrStop<=2; atrStop+=0.5) {
          for (let atrTarget=3; atrTarget<=5; atrTarget+=1) {
            paramGrid.push({ rsi, ma, macd, atrStop, atrTarget });
          }
        }
      }
    }
  }
}

console.log('Grid size before sampling:', paramGrid.length);
let workingGrid = paramGrid;
if (sampleLimit > 0 && sampleLimit < paramGrid.length) {
  // sample randomly
  workingGrid = [];
  const shuffled = paramGrid.sort(() => 0.5 - Math.random());
  for (let i = 0; i < sampleLimit; i++) workingGrid.push(shuffled[i]);
  console.log(`Sampled grid size: ${workingGrid.length}`);
}

const evaluateGrid = async () => {
  const results = [];
  for (const cfg of workingGrid) {
    const configOverride = {
      weights: { rsi: cfg.rsi, ma: cfg.ma, macd: cfg.macd, momentum: 15, volume: 10, volatility: 15 },
      atrMultiplierForStop: cfg.atrStop,
      atrMultiplierForTarget: cfg.atrTarget
    };

    // Evaluate all symbols
    const evaluations = [];
    const histories = {};
    for (const s of symbols) {
      const closes = await fetchCloses(s, 365);
      let used = closes.length ? closes : Array.from({length:365}).map(()=>100 + Math.random()*200);
      const ev = await evaluateStock(s, {}, used, configOverride);
      if (ev) {
        evaluations.push(ev);
        histories[s] = used.map((c,i)=>({date:i,open:c,high:c*1.01,low:c*0.99,close:c}));
      }
    }
    if (evaluations.length === 0) continue;
    const signals = evaluations.map(e => ({ symbol: e.symbol, price: e.price, targetPrice: e.targetPrice, stopLoss: e.stopLoss, holdDays: 30 }));
    const report = runBacktest(signals, histories);
    results.push({ config: configOverride, summary: report });
  }

  fs.mkdirSync('reports', { recursive: true });
  const out = { date: new Date().toISOString(), results };
  const fileName = path.join('reports', `grid_search_full_${Date.now()}.json`);
  fs.writeFileSync(fileName, JSON.stringify(out, null, 2));
  console.log('Grid search complete. Saved full results to', fileName);

  // Create summary and top N
  const summary = results.map(r => ({ config: r.config, winRate: r.summary.winRate, totalPnl: r.summary.totalPnl, avgPnl: r.summary.avgPnl, avgDaysHeld: r.summary.avgDaysHeld, total: r.summary.total, wins: r.summary.wins, losses: r.summary.losses }));
  summary.sort((a,b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return (b.totalPnl || 0) - (a.totalPnl || 0);
  });
  const top = summary.slice(0, topN);
  const summaryFile = path.join('reports', `grid_search_summary_${Date.now()}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify({ date: new Date().toISOString(), top, totalConfigs: results.length }, null, 2));
  console.log('Summary saved to', summaryFile);

  // Save CSV of top
  const csvLines = ['rsi,ma,macd,atrStop,atrTarget,winRate,totalPnl,avgPnl,avgDaysHeld,total,wins,losses'];
  top.forEach(t => {
    const c = t.config;
    csvLines.push([c.weights.rsi,c.weights.ma,c.weights.macd,c.atrMultiplierForStop,c.atrMultiplierForTarget,t.winRate,t.totalPnl,t.avgPnl,t.avgDaysHeld,t.total,t.wins,t.losses].join(','));
  });
  const csvFile = path.join('reports', `grid_search_top_${Date.now()}.csv`);
  fs.writeFileSync(csvFile, csvLines.join('\n'));
  console.log('Top CSV saved to', csvFile);
};

evaluateGrid();