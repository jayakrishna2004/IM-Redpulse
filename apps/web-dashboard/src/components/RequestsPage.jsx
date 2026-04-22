import { useState } from 'react';
import { RequestList } from './RequestList.jsx';

export default function RequestsPage({ requests, onTrigger }) {
  const [filter, setFilter] = useState('ALL');
  const filtered = filter === 'ALL' ? requests : requests.filter(r => r.status === filter);
  
  return (
    <>
      <header className="topbar">
        <div>
          <h2 className="topbar-title">Emergency Logs</h2>
          <p className="topbar-subtitle">Audit trail of all broadcasted requests</p>
        </div>
        <button className="emergency-btn secondary" onClick={onTrigger}>🚨 New Broadcast</button>
      </header>

      <div className="tabs glass" style={{ padding: 6, borderRadius: 12, display: 'flex', gap: 4, width: 'fit-content' }}>
        {['ALL', 'PENDING', 'MATCHING', 'MATCHED', 'FULFILLED', 'CANCELLED'].map(s => (
          <button 
            key={s} 
            className={`tab ${filter === s ? 'active' : ''}`} 
            onClick={() => setFilter(s)}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: filter === s ? 'var(--blue)' : 'transparent',
              color: filter === s ? '#fff' : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card glass">
        <RequestList requests={filtered} />
      </div>
    </>
  );
}
