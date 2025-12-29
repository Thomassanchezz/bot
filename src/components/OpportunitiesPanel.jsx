import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { evaluateStock, rankOpportunities } from '../utils/opportunities';
import { getHistoricalPrices } from '../services/yahooFinance';

const OpportunitiesPanel = ({ symbols = [], stockData = {}, onCreateAlert = () => {}, limit = 6 }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      const toEval = symbols.slice(0, limit);
      const results = [];
      for (const s of toEval) {
        try {
          // get minimal historical to improve signals (non-blocking)
          const hist = await getHistoricalPrices(s, { period: '6mo', interval: '1d' }).catch(()=>null);
          const evaluated = await evaluateStock(s, stockData[s] || {}, hist ? hist.map(p=>p.close) : null);
          if (evaluated) results.push(evaluated);
        } catch (err) {
          console.error('opportunity eval error', s, err);
        }
      }
      if (!active) return;
      const top = rankOpportunities(results, limit);
      setEvaluations(top);
      setLoading(false);
    };

    if (symbols && symbols.length > 0) run();
    return () => { active = false; };
  }, [symbols, stockData, limit]);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg md:text-xl font-bold text-white">Oportunidades Sugeridas</h2>
        <div className="text-sm text-gray-300">Top {evaluations.length}</div>
      </div>

      {loading ? (
        <Card>Analizando oportunidades...</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {evaluations.map(ev => (
            <Card key={ev.symbol} header={ev.symbol} badge={`${ev.score}`}>
              <p className="text-sm text-gray-300 mb-2">{ev.reasons.join(' • ')}</p>
              <p className="text-2xl font-bold text-white mb-2">${ev.price.toLocaleString('es-AR')}</p>
              <div className="text-xs text-gray-300 mb-3">
                <div>Recomendación: <span className="font-semibold">{ev.recommendation}</span></div>
                <div>Confianza: <span className="font-semibold">{ev.confidence}</span></div>
                <div>Objetivo: <span className="text-green-400 font-semibold">${ev.targetPrice}</span></div>
                <div>Stop loss: <span className="text-red-400 font-semibold">${ev.stopLoss}</span></div>
                <div>R:R: <span className="font-semibold">{ev.riskReward}</span></div>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onCreateAlert(ev)}>Crear Alerta</Button>
                <Button variant="outline" onClick={() => console.log('Simular', ev)}>Simular</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OpportunitiesPanel;
