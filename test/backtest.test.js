import { describe, it, expect } from 'vitest';
import { runBacktest } from '../src/services/backtest.js';

describe('runBacktest', () => {
  it('computes basic metrics', () => {
    const histWin = Array.from({length:30}).map((_,i)=>({date:i,open:100+i,high:110+i,low:90+i,close:105+i}));
    const sigWin = [{ symbol: 'T1', price: 105, targetPrice: 110, stopLoss: 100, holdDays: 10 }];
    const report = runBacktest(sigWin, { T1: histWin });
    expect(report.total).toBe(1);
    expect(report.wins + report.losses + report.neutrals).toBe(1);
    expect(typeof report.winRate).toBe('number');
  });
});