import { describe, it, expect } from 'vitest';
import { evaluateStock } from '../src/utils/opportunities.js';

describe('evaluateStock', () => {
  it('returns a valid evaluation object for synthetic data', async () => {
    const closes = Array.from({length:120}).map((_,i)=>100 + Math.sin(i/5)*2 + i*0.1);
    const ev = await evaluateStock('TEST', {}, closes);
    expect(ev).toBeTruthy();
    expect(typeof ev.score).toBe('number');
    expect(ev.targetPrice).toBeGreaterThan(ev.stopLoss);
  });
});