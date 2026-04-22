import { motion } from 'framer-motion'
import { api } from '../lib'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const MAX_STOCK = 20

function getStockClass(count) {
  if (count === 0) return 'critical'
  if (count <= 3) return 'low'
  return 'ok'
}

export default function BloodStockWidget({ hospitalId, stock = {} }) {
  
  const handleUpdate = async (group, delta) => {
    const current = stock[group] ?? 0
    const next = Math.max(0, current + delta)
    if (next === current) return
    
    try {
      const newStock = { ...stock, [group]: next }
      await api.updateBloodStock(hospitalId, newStock)
    } catch (err) {
      console.error('Failed to update stock:', err)
    }
  }

  return (
    <div className="blood-stock-grid">
      {BLOOD_GROUPS.map((bg) => {
        const count = stock[bg] ?? 0
        const pct = Math.min(100, (count / MAX_STOCK) * 100)
        const cls = getStockClass(count)
        return (
          <div key={bg} className="blood-stock-item">
            <div className="stock-label">
              <span className="stock-group">{bg}</span>
              <span className="stock-count">{count} units</span>
            </div>
            <div className="stock-bar">
              <motion.div
                className={`stock-fill ${cls}`}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
            </div>
            <div className="stock-controls">
              <button className="stock-btn minus" onClick={() => handleUpdate(bg, -1)}>−</button>
              <button className="stock-btn plus" onClick={() => handleUpdate(bg, 1)}>+</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
