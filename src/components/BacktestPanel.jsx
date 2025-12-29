import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { evaluateStock } from '../utils/opportunities.js';
import { runBacktest } from '../services/backtest.js';
import { getHistoricalPrices } from '../services/yahooFinance.js';

const BacktestPanel = ({ defaultSymbols = ['GGAL','YPFD','PAMP','BBAR','TXAR','ALUA'] }) => {
  const [symbols, setSymbols] = useState(defaultSymbols.join(','));
  const [holdDays, setHoldDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);

  // params
  const [rsiWeight, setRsiWeight] = useState(15);
  const [maWeight, setMaWeight] = useState(25);
  const [macdWeight, setMacdWeight] = useState(20);
  const [atrStop, setAtrStop] = useState(1.5);
  const [atrTarget, setAtrTarget] = useState(4);

  // filters & presets
  const [timeframeDays, setTimeframeDays] = useState(180);
  const [sector, setSector] = useState('');
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');

  useEffect(()=>{
    try {
      const saved = localStorage.getItem('backtestReports');
      setHistory(saved ? JSON.parse(saved) : []);
    } catch (e) { setHistory([]); }

    try {
      const p = JSON.parse(localStorage.getItem('backtestPresets') || '[]');
      setPresets(p);
    } catch (e) { setPresets([]); }
  }, []);

  const savePreset = () => {
    if (!presetName) return alert('Ingresá un nombre para el preset');
    const p = { id: `p_${Date.now()}`, name: presetName, symbols: symbols.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean), params: { rsiWeight, maWeight, macdWeight, atrStop, atrTarget, holdDays, timeframeDays, sector } };
    const next = [p].concat(presets).slice(0,20);
    localStorage.setItem('backtestPresets', JSON.stringify(next));
    setPresets(next);
    setPresetName('');
    setSelectedPreset(p.id);
  };

  const loadPreset = (id) => {
    if (!id) return;
    const p = presets.find(x=>x.id === id);
    if (!p) return;
    setSymbols(p.symbols.join(','));
    setRsiWeight(p.params.rsiWeight);
    setMaWeight(p.params.maWeight);
    setMacdWeight(p.params.macdWeight);
    setAtrStop(p.params.atrStop);
    setAtrTarget(p.params.atrTarget);
    setHoldDays(p.params.holdDays);
    setTimeframeDays(p.params.timeframeDays || 180);
    setSector(p.params.sector || '');
    setSelectedPreset(id);
  };

  const runBatch = async () => {
    if (presets.length === 0) return alert('No hay presets guardados para batch');
    setLoading(true);
    const batchReports = [];
    for (const p of presets) {
      const syms = p.symbols;
      const configOverride = { weights: { rsi: p.params.rsiWeight, ma: p.params.maWeight, macd: p.params.macdWeight, momentum:15, volume:10, volatility:15 }, atrMultiplierForStop: p.params.atrStop, atrMultiplierForTarget: p.params.atrTarget };
      const evaluations = [];
      const histories = {};
      for (const s of syms) {
        try {
          const closes = await getHistoricalPrices(s, p.params.timeframeDays || 180);
          let usedCloses = closes && closes.length ? closes : Array.from({length:(p.params.timeframeDays || 180)}).map(()=>100 + Math.random()*200);
          const ev = await evaluateStock(s, {}, usedCloses, configOverride);
          if (!ev) continue;
          evaluations.push(ev);
          histories[s] = usedCloses.map((c,i)=>({date:i,open:c,high:c*1.01,low:c*0.99,close:c,volume:0}));
        } catch (e) { console.error('batch error', s, e); }
      }
      const signals = evaluations.map(e => ({ symbol: e.symbol, price: e.price, targetPrice: e.targetPrice, stopLoss: e.stopLoss, holdDays: p.params.holdDays }));
      const summary = runBacktest(signals, histories);
      const full = { id: `b_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, date: new Date().toISOString(), preset: p.name, params: p.params, summary, signals };
      batchReports.push(full);
    }
    // save batch combined as a report
    const combined = { id: `batch_${Date.now()}`, date: new Date().toISOString(), type: 'batch', reports: batchReports };
    try {
      const prev = JSON.parse(localStorage.getItem('backtestReports') || '[]');
      const next = [combined].concat(prev).slice(0,50);
      localStorage.setItem('backtestReports', JSON.stringify(next));
      setHistory(next);
    } catch (e) { console.warn('Could not save batch report', e); }
    setLoading(false);
  };

  const sparkPath = (values, w=80, h=20) => {
    if (!values || values.length === 0) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const len = values.length;
    return values.map((v,i)=>{
      const x = (i/(len-1))*w;
      const y = h - ((v-min)/(max-min || 1))*h;
      return `${i===0?'M':'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  };

  const run = async () => {
    setLoading(true);
    const syms = symbols.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
    const evaluations = [];
    const histories = {};
    const configOverride = { weights: { rsi: rsiWeight, ma: maWeight, macd: macdWeight, momentum:15, volume:10, volatility:15 }, atrMultiplierForStop: atrStop, atrMultiplierForTarget: atrTarget };

    for (const s of syms) {
      try {
        const closes = await getHistoricalPrices(s, timeframeDays);
        let usedCloses = closes && closes.length ? closes : Array.from({length:timeframeDays || 180}).map(()=>100 + Math.random()*200);
        const ev = await evaluateStock(s, {}, usedCloses, configOverride);
        if (!ev) continue;
        evaluations.push(ev);
        histories[s] = usedCloses.map((c,i)=>({date:i,open:c,high:c*1.01,low:c*0.99,close:c,volume:0}));
      } catch (e) { console.error('error backtest run', s, e); }
    }

    const signals = evaluations.map(e => ({ symbol: e.symbol, price: e.price, targetPrice: e.targetPrice, stopLoss: e.stopLoss, holdDays }));
    const summary = runBacktest(signals, histories);
    const fullReport = { summary, signals, histories, params: { rsiWeight, maWeight, macdWeight, atrStop, atrTarget, holdDays, symbols: syms }, date: new Date().toISOString(), id: `r_${Date.now()}` };
    setReport(fullReport);

    // save to local history
    try {
      const prev = JSON.parse(localStorage.getItem('backtestReports') || '[]');
      const next = [fullReport].concat(prev).slice(0, 50); // keep last 50
      localStorage.setItem('backtestReports', JSON.stringify(next));
      setHistory(next);
    } catch (e) { console.warn('Could not save report', e); }

    setLoading(false);
  };

  return (
    <Card header="Backtest" className="mb-6">
      <div className="space-y-3">
        <div>
          <label className="text-sm text-gray-300 block">Símbolos (coma separados)</label>
          <input className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded" value={symbols} onChange={(e)=>setSymbols(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm text-gray-300 block">Timeframe (días)</label>
            <div className="flex items-center gap-3">
              <div className="text-sm text-white font-semibold">{timeframeDays} días</div>
              <div className="flex gap-2">
                <button aria-label="Set 90 days" className="px-2 py-1 bg-white/6 rounded" onClick={(e)=>{ e.preventDefault(); setTimeframeDays(90); }}>90d</button>
                <button aria-label="Set 180 days" className="px-2 py-1 bg-white/6 rounded" onClick={(e)=>{ e.preventDefault(); setTimeframeDays(180); }}>180d</button>
                <button aria-label="Set 365 days" className="px-2 py-1 bg-white/6 rounded" onClick={(e)=>{ e.preventDefault(); setTimeframeDays(365); }}>365d</button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm text-gray-300 block">Sector (opcional)</label>
            <input className="w-full px-3 py-2 bg-white/5 border rounded" value={sector || ''} onChange={(e)=>setSector(e.target.value)} placeholder="ej: bancario, energéticas" />
          </div>

          <div>
            <label className="text-sm text-gray-300 block">Guardar Preset</label>
            <div className="flex gap-2">
              <input className="w-full px-2 py-1 bg-white/5 border rounded" placeholder="Nombre preset" value={presetName} onChange={(e)=>setPresetName(e.target.value)} />
              <Button variant="ghost" onClick={()=>savePreset()} aria-label="Guardar preset">Guardar</Button>
            </div>
            <div className="mt-2">
              <label className="text-xs text-gray-400">Presets disponibles</label>
              <select className="w-full mt-1 px-2 py-1 bg-white/5 border rounded" value={selectedPreset || ''} onChange={(e)=>loadPreset(e.target.value)}>
                <option value="">-- seleccionar --</option>
                {presets.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-end justify-end">
            <div className="flex gap-2">
              <Button variant="outline" onClick={()=>runBatch()} disabled={loading} aria-label="Ejecutar batch">Run Batch</Button>
              <Button onClick={run} variant="primary" disabled={loading}>Ejecutar Backtest</Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-300 block">Hold days</label>
            <input type="number" className="w-full px-3 py-2 bg-white/5 border rounded" value={holdDays} onChange={(e)=>setHoldDays(parseInt(e.target.value)||30)} />
          </div>
          <div>
            <label className="text-sm text-gray-300 block">Pesos (Rsi / MA / MACD)</label>
            <div className="flex gap-2">
              <input type="number" className="w-16 px-2 py-1 bg-white/5 border rounded" value={rsiWeight} onChange={(e)=>setRsiWeight(parseInt(e.target.value)||0)} />
              <input type="number" className="w-16 px-2 py-1 bg-white/5 border rounded" value={maWeight} onChange={(e)=>setMaWeight(parseInt(e.target.value)||0)} />
              <input type="number" className="w-16 px-2 py-1 bg-white/5 border rounded" value={macdWeight} onChange={(e)=>setMacdWeight(parseInt(e.target.value)||0)} />
            </div>
          </div>
          <div className="flex items-end justify-end">
            
          </div>
        </div>

        {loading && <p className="text-sm text-gray-300">Ejecutando...</p>}
        {report && (
          <div>
            <h4 className="font-bold text-white">Resumen</h4>
            <p className="text-sm text-gray-300">Total: {report.summary.total} • Wins: {report.summary.wins} • Losses: {report.summary.losses} • WinRate: {report.summary.winRate}%</p>
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
              {report.summary.results.map(r => (
                <div key={r.symbol} className="bg-white/5 rounded p-2 text-sm grid grid-cols-3 gap-2 items-center">
                  <div className="font-semibold">{r.symbol}</div>
                  <div className="text-xs">{r.result?.outcome} {r.result?.exitPrice ? `@ ${r.result.exitPrice}` : ''}</div>
                  <div className="flex justify-end">
                    <svg className="w-20 h-5" viewBox="0 0 80 20" xmlns="http://www.w3.org/2000/svg">
                      <path d={report.histories && report.histories[r.symbol] ? sparkPath(report.histories[r.symbol].map(h=>h.close), 80, 20) : ''} fill="none" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="ghost" onClick={() => {
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `backtest_${Date.now()}.json`; a.click();
                URL.revokeObjectURL(url);
              }}>Exportar JSON</Button>

              <Button variant="ghost" onClick={() => {
                // Export CSV
                const rows = [ ['symbol','outcome','exitPrice','daysHeld'] ];
                report.summary.results.forEach(r=> rows.push([r.symbol, r.result?.outcome, r.result?.exitPrice || '', r.result?.daysHeld || '']));
                const csv = rows.map(r=> r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `backtest_${Date.now()}.csv`; a.click(); URL.revokeObjectURL(url);
              }}>Exportar CSV</Button>

              <Button variant="ghost" onClick={() => {
                // abrir historial
                const el = document.getElementById('backtest-history-panel');
                if (el) { el.scrollIntoView({ behavior: 'smooth' }); }
              }}>Ver Historial</Button>
            </div>
          </div>
        )}

        {/* Historial local de reportes */}
        <div id="backtest-history-panel" className="mt-6 bg-white/5 rounded p-4 border border-white/5">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-bold text-white">Historial de Reportes</h4>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={()=>{
                const all = JSON.parse(localStorage.getItem('backtestReports') || '[]');
                const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `backtest_history_${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
              }}>Exportar todo</Button>
              <Button variant="ghost" onClick={()=>{ if (confirm('Eliminar todo el historial?')) { localStorage.removeItem('backtestReports'); setHistory([]); } }}>Vaciar</Button>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-gray-300">No hay reportes guardados.</p>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="bg-white/3 p-3 rounded flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-white">{new Date(h.date).toLocaleString()}</div>
                    <div className="text-xs text-gray-300">{h.params.symbols.join(', ')} • WinRate: {h.summary.winRate}% • Total: {h.summary.total}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={()=> setReport(h)}>Ver</Button>
                    <Button variant="ghost" onClick={()=>{
                      const blob = new Blob([JSON.stringify(h, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `backtest_${h.id}.json`; a.click(); URL.revokeObjectURL(url);
                    }}>Descargar</Button>
                    <Button variant="ghost" onClick={()=>{
                      const next = history.filter(x=>x.id !== h.id); localStorage.setItem('backtestReports', JSON.stringify(next)); setHistory(next);
                    }}>Eliminar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BacktestPanel;