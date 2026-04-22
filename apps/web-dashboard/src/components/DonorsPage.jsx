import { useState } from 'react';
import { motion } from 'framer-motion';
import AddDonorModal from './AddDonorModal';

export default function DonorsPage({ donors, onDonorCreated }) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <header className="topbar">
        <div>
          <h2 className="topbar-title">Blood Donor Matrix</h2>
          <p className="topbar-subtitle">Network status of authenticated responders — Mumbai Sector</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            className="btn btn-primary" 
            style={{ fontSize: 11, padding: '8px 16px', background: 'var(--blue)' }}
            onClick={() => setShowAddModal(true)}
          >
            + ADD NEW DONOR
          </button>
          <span className="blood-badge">{donors.length} ACTIVE NODES</span>
        </div>
      </header>

      {showAddModal && (
        <AddDonorModal 
          onClose={() => setShowAddModal(false)}
          onCreated={onDonorCreated}
        />
      )}

      <div className="donor-grid">
        {donors.map((donor, i) => {
          const score = parseFloat(donor.ai_score || 0.5);
          const scoreClass = score >= 0.8 ? 'score-high' : score >= 0.6 ? 'score-mid' : 'score-low';
          
          return (
            <motion.div
              key={donor.id}
              className="card glass donor-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -8, borderColor: 'rgba(255,255,255,0.2)' }}
            >
              {donor.status === 'ACTIVE' && <div className="active-pulse" />}
              
              <div className="donor-card-header">
                <div className="donor-avatar-large">
                  {(donor.name || 'D')[0]}
                </div>
                <div>
                  <div className="donor-name-large">{donor.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="donor-group-badge">{donor.blood_group} TYPE</span>
                    <span className={`urgency-badge urgency-${donor.status === 'ACTIVE' ? 'NORMAL' : 'HIGH'}`} style={{ fontSize: 8 }}>
                      {donor.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="score-gauge">
                <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Reliability Rating</div>
                <div className={`score-value ${scoreClass}`}>{(score * 10).toFixed(1)}</div>
              </div>

              <div className="donor-stats-row">
                <div className="donor-stat-box">
                  <div className="donor-stat-label">Response Time</div>
                  <div className="donor-stat-value">{donor.avg_response_time_seconds ? `${Math.round(donor.avg_response_time_seconds)}s` : '42s'}</div>
                </div>
                <div className="donor-stat-box" style={{ textAlign: 'center' }}>
                  <div className="donor-stat-label">Accepted</div>
                  <div className="donor-stat-value" style={{ color: 'var(--green)' }}>{donor.total_accepted || '0'}</div>
                </div>
                <div className="donor-stat-box" style={{ textAlign: 'right' }}>
                  <div className="donor-stat-label">Radius</div>
                  <div className="donor-stat-value">3.2 km</div>
                </div>
              </div>

              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', opacity: 0.5 }}>
                NODE_UUID: {donor.id.substring(0, 8)}...
              </div>
            </motion.div>
          );
        })}
      </div>
    </>
  );
}
