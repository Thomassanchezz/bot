import { evaluateStock } from '../src/utils/opportunities.js';

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exit(1); } };

(async ()=>{
  console.log('Running evaluateStock unit tests...');
  const closes = Array.from({length:60}).map((_,i)=>100 + i*0.5);
  const ev = await evaluateStock('TEST', {}, closes);
  assert(ev !== null, 'evaluateStock should return an object');
  assert(ev.price > 0, 'price should be > 0');
  assert(typeof ev.score === 'number', 'score should be number');
  assert(ev.stopLoss < ev.price && ev.targetPrice > ev.price, 'stop < price < target');
  console.log('All evaluateStock tests passed');
})();