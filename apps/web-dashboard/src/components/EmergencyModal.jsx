import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../lib.js'

const DEFAULT_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function EmergencyModal({ hospitals = [], onClose, onCreated }) {
  // CRITICAL: We ONLY use hospitals passed from the App (the official API source)
  const [form, setForm] = useState({
    hospitalId: hospitals[0]?.id || '',
    bloodGroup: 'O+',
    urgency: 'CRITICAL',
    unitsNeeded: 1,
    notes: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Ensure form updates if hospitals arrive after the modal mounts
  useEffect(() => {
    if (hospitals.length > 0 && !form.hospitalId) {
      setForm(f => ({ ...f, hospitalId: hospitals[0].id }))
    }
  }, [hospitals, form.hospitalId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.hospitalId) {
      setError("Please wait... loading hospital registry.");
      return;
    }
    
    setLoading(true); setError(null)
    try {
      const hospital = hospitals.find(h => h.id === form.hospitalId)
      if (!hospital) throw new Error("Invalid selection. Please choose a hospital from the list.");

      const result = await api.createRequest({
        hospitalId: form.hospitalId,
        bloodGroup: form.bloodGroup,
        urgency: form.urgency,
        lat: Number(hospital.lat),
        lng: Number(hospital.lng),
        unitsNeeded: Number(form.unitsNeeded) || 1,
        notes: form.notes || '',
      })
      
      onCreated?.(result)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <motion.div
          className="modal glass"
          initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 400 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '520px', padding: '40px', background: 'rgba(22, 28, 54, 0.95)', border: '1px solid var(--glass-border)', borderRadius: '24px', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}
        >
          <div className="modal-title" style={{ fontSize: '28px', color: 'var(--red)', letterSpacing: '-1px', fontWeight: 900, marginBottom: '8px' }}>
            <span>🚨 TRIGGER EMERGENCY ALERT</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px', fontWeight: 600 }}>Broadcast an urgent blood request to all eligible donors in the sector.</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 800 }}>Hospital Facility</label>
              <select className="form-select" value={form.hospitalId} onChange={e => set('hospitalId', e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', outline: 'none', cursor: 'pointer' }}>
                {hospitals.length === 0 && <option value="">Loading registries...</option>}
                {hospitals.map(h => <option key={h.id} value={h.id} style={{ background: '#0a0c14' }}>{h.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 800 }}>Blood Group</label>
                <select className="form-select" value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', outline: 'none' }}>
                  {DEFAULT_GROUPS.map(bg => <option key={bg} value={bg} style={{ background: '#0a0c14' }}>{bg}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 800 }}>Urgency Level</label>
                <select className="form-select" value={form.urgency} onChange={e => set('urgency', e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', outline: 'none' }}>
                  <option value="CRITICAL" style={{ background: '#0a0c14' }}>🔴 CRITICAL</option>
                  <option value="HIGH" style={{ background: '#0a0c14' }}>🟡 HIGH</option>
                  <option value="NORMAL" style={{ background: '#0a0c14' }}>🟢 NORMAL</option>
                </select>
              </div>
            </div>

            <div className="form-group">
               <label className="form-label" style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 800 }}>Operational Notes (Optional)</label>
               <textarea className="form-input" placeholder="Enter patient specifics or emergency room details..."
                 style={{ width: '100%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: '12px', minHeight: '80px', resize: 'none', outline: 'none' }}
                 value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>

            {error && (
              <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ color: '#ff1a3c', fontSize: '13px', fontWeight: 800, textAlign: 'center', background: 'rgba(255,26,60,0.1)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,26,60,0.2)' }}>
                ⚠ {error}
              </motion.p>
            )}

            <div style={{ display: 'flex', gap: 16, marginTop: '12px' }}>
              <button type="button" onClick={onClose}
                style={{ flex: 1, padding: '16px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 800 }}>
                CANCEL
              </button>
              <button type="submit" className="emergency-btn" style={{ flex: 2 }} disabled={loading}>
                {loading ? 'INITIATING...' : 'EXECUTE BROADCAST'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
