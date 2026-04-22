import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib.js';

export default function AddDonorModal({ onClose, onCreated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    bloodGroup: 'O+',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await api.register({
        ...formData,
        role: 'DONOR'
      });
      onCreated(res.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create donor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div 
        className="modal-content glass"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title">REGISTER NEW DONOR</h2>
            <p className="modal-subtitle">Manually add a verified responder to the matrix</p>
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="emergency-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                required 
                placeholder="John Doe"
                className="form-input"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Blood Group</label>
              <select 
                className="form-input"
                value={formData.bloodGroup}
                onChange={e => setFormData({...formData, bloodGroup: e.target.value})}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              placeholder="donor@example.com"
              className="form-input"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="tel" 
                placeholder="+91 XXXXX XXXXX"
                className="form-input"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                required 
                minLength={6}
                placeholder="••••••••"
                className="form-input"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button 
            type="submit" 
            className="emergency-btn" 
            disabled={loading}
            style={{ background: 'var(--blue)', borderColor: 'var(--blue-glow)', marginTop: 16 }}
          >
            {loading ? 'INITIALIZING NODE...' : 'AUTHORIZE DONOR NODE'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
