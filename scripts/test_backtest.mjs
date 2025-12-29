import { runBacktest } from '../src/services/backtest.js';

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } };

(() => {
  console.log('Running runBacktest unit tests...');
  // create a synthetic history where target will be hit
  const histWin = Array.from({length:30}).map((_,i)=>({date:i,open:100+i,high:110+i,low:90+i,close:105+i}));
  const sigWin = [{ symbol: 'T1', price: 105, targetPrice: 110, stopLoss: 100, holdDays: 10 }];
  const report = runBacktest(sigWin, { T1: histWin });
  assert(report.total === 1, 'total should be 1');
  assert((report.wins + report.losses + report.neutrals) === 1, 'sum of outcomes should equal total');
  assert(typeof report.winRate === 'number', 'winRate should be numeric');
  assert(typeof report.totalPnl === 'number', 'totalPnl should be numeric');
  assert(typeof report.avgPnl === 'number', 'avgPnl should be numeric');
  console.log('All runBacktest tests passed');
})();