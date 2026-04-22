import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function PredictionsPage({ user }) {
  const [predictions, setPredictions] = useState(null);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchPredictions = () => {
        fetch('http://localhost:8000/predict/demand', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ hospital_id: user.id || '10000000-0000-0000-0000-000000000001', days_ahead: 7 }) 
        })
        .then(r => r.json())
        .then(d => setPredictions(d.predictions))
        .catch(() => {});
    };

    fetchPredictions();
    const interval = setInterval(fetchPredictions, 10000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      <header className="topbar">
        <div>
          <h2 className="topbar-title">Forecasting Engine</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <p className="topbar-subtitle">Predictive analytics for blood demand (7-day outlook)</p>
            <div style={{ padding: '2px 8px', background: 'rgba(52,152,219,0.1)', border: '1px solid rgba(52,152,219,0.3)', borderRadius: 4, fontSize: 9, color: '#3498db', fontFamily: 'monospace' }}>
                LAST COMPUTE CYCLE: {new Date().toLocaleTimeString()}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', background: 'rgba(0,255,157,0.1)', border: '1px solid rgba(0,255,157,0.3)', borderRadius: 4, fontSize: 9, color: '#00ff9d', fontFamily: 'monospace' }}>
                <div style={{ width: 6, height: 6, borderRadius: 3, background: '#00ff9d', boxShadow: '0 0 10px #00ff9d' }}></div>
                TELEMETRY: LIVE
            </div>
          </div>
        </div>
        <div style={{ background: 'rgba(255,184,0,0.1)', border: '1px solid var(--amber)', color: 'var(--amber)', padding: '8px 16px', borderRadius: '100px', fontSize: 11, fontWeight: 800 }}>⚡ AI ACTIVE</div>
      </header>

      <div className="card glass">
        {!predictions ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🧬</div>
            <div>AI Intelligence Engine Offline.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 12 }}>
            {predictions.map((p, i) => (
              <motion.div 
                key={i} 
                className="glass" 
                style={{ 
                  padding: 16, 
                  borderRadius: 12, 
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  borderTop: p.alert_groups?.length > 0 ? '2px solid var(--red)' : '1px solid var(--glass-border)'
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{p.day_name}</div>
                    {p.alert_groups?.length > 0 && (
                        <div style={{ fontSize: 8, padding: '2px 4px', background: 'rgba(255,26,60,0.2)', border: '1px solid var(--red)', borderRadius: 2, color: 'var(--red)', fontWeight: 900 }}>HOT ZONE</div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries(p.predicted_requests).slice(0, 4).map(([bg, c]) => (
                    <div key={bg} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{bg}</span>
                      <span style={{ color: c > 8 ? 'var(--red)' : 'var(--text-primary)', fontWeight: 800 }}>{c}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
