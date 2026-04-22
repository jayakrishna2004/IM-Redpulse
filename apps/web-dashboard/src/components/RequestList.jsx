import { motion, AnimatePresence } from 'framer-motion'
import { timeSince } from '../lib.js'

export function RequestList({ requests, onSelect, selectedId }) {
  return (
    <div className="requests-list">
      <AnimatePresence>
        {requests.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 13 }}
          >
            No active requests
          </motion.div>
        )}
        {requests.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: i * 0.05 }}
            className={`request-item ${r.urgency?.toLowerCase()}`}
            onClick={() => onSelect?.(r)}
            style={{ outline: selectedId === r.id ? '1px solid var(--red)' : 'none' }}
          >
            <div className="request-header">
              <div className="flex items-center gap-2">
                <span className="blood-badge">{r.blood_group}</span>
                <span className={`urgency-badge urgency-${r.urgency}`}>{r.urgency}</span>
              </div>
              <span className={`status-chip status-${r.status}`}>
                {r.status === 'MATCHING' && <span className="animate-blink">●</span>}
                {r.status}
              </span>
            </div>
            <div className="request-meta">
              <div className="truncate">{r.hospital_name || 'Unknown Hospital'}</div>
              <div className="flex justify-between mt-2" style={{ fontSize: 11 }}>
                <span>Created {timeSince(r.created_at)}</span>
                {r.donor_name && <span style={{ color: 'var(--blue)' }}>→ {r.donor_name}</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

export function DonorResponseList({ responses }) {
  return (
    <div className="donor-list">
      {responses.map((r, i) => {
        const score = parseFloat(r.ai_score || 0)
        const scoreClass = score >= 0.75 ? 'score-high' : score >= 0.5 ? 'score-mid' : 'score-low'
        return (
          <motion.div
            key={r.id}
            className="donor-item"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="donor-avatar">{(r.name || 'D')[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="font-bold truncate" style={{ fontSize: 13 }}>{r.name}</div>
              <div className="text-muted text-sm">{r.blood_group} · {r.distance_km ? `${parseFloat(r.distance_km).toFixed(1)}km` : '?'}</div>
            </div>
            <span className={`donor-score ${scoreClass}`}>{score.toFixed(2)}</span>
            <span className={`status-chip status-${r.action}`} style={{ fontSize: 10 }}>{r.action || 'PENDING'}</span>
          </motion.div>
        )
      })}
    </div>
  )
}
