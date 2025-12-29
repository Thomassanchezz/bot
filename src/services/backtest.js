// Very simple backtester for the MVP
// signals: [{ symbol, price, recommendation, targetPrice, stopLoss, holdDays }]
// history: { symbol: [ {date, open, high, low, close, volume}, ... ] }

export const backtestSignal = (signal, history) => {
  // find entry day => next day's open after the signal day (approx)
  if (!history || history.length === 0) return null;
  const entryPrice = history[history.length-1].open || history[history.length-1].close;
  const target = signal.targetPrice;
  const stop = signal.stopLoss;
  const holdDays = signal.holdDays || 20;

  // Run simulation: iterate forward, check if hit target or stop
  // For MVP we'll simulate selling at first day that hits target or stop, or at holdDays
  for (let i = history.length-1; i >= Math.max(0, history.length - holdDays); i--) {
    const day = history[i];
    if (!day) continue;
    if (day.high >= target) return { outcome: 'win', exitPrice: target, daysHeld: history.length - i };
    if (day.low <= stop) return { outcome: 'loss', exitPrice: stop, daysHeld: history.length - i };
  }

  // otherwise exit at last close
  const lastClose = history[history.length-1].close;
  const pnl = lastClose - entryPrice;
  return { outcome: 'neutral', exitPrice: lastClose, pnl }; 
};

export const runBacktest = (signals, histories) => {
  const results = signals.map(sig => {
    const hist = histories[sig.symbol];
    const res = backtestSignal(sig, hist || []);
    return { symbol: sig.symbol, signal: sig, result: res };
  });

  // aggregate summary
  const wins = results.filter(r => r.result && r.result.outcome === 'win').length;
  const losses = results.filter(r => r.result && r.result.outcome === 'loss').length;
  const neutrals = results.filter(r => r.result && (!r.result.outcome || r.result.outcome === 'neutral')).length;
  const total = results.length;

  // PnL and days held
  let totalPnl = 0;
  let totalDays = 0;
  let pnlCount = 0;
  results.forEach(r => {
    if (r.result) {
      const entry = r.signal.price || (r.signal && r.signal.entryPrice) || 0;
      const exit = r.result.exitPrice || 0;
      if (typeof entry === 'number' && typeof exit === 'number') {
        totalPnl += (exit - entry);
        pnlCount += 1;
      } else if (typeof r.result.pnl === 'number') {
        totalPnl += r.result.pnl;
        pnlCount += 1;
      }
      if (r.result.daysHeld) totalDays += r.result.daysHeld;
    }
  });

  const avgPnl = pnlCount ? totalPnl / pnlCount : 0;
  const avgDaysHeld = pnlCount ? totalDays / pnlCount : 0;

  return {
    total,
    wins,
    losses,
    neutrals,
    winRate: total ? Number(((wins/total)*100).toFixed(1)) : 0,
    totalPnl: Number(totalPnl.toFixed(2)),
    avgPnl: Number(avgPnl.toFixed(4)),
    avgDaysHeld: Number(avgDaysHeld.toFixed(1)),
    results
  };
};
