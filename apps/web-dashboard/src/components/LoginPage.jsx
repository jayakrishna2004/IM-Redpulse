import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib.js';

export default function LoginPage({ onLoginSuccess }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('HOSPITAL');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let res;
      if (isRegistering) {
        res = await api.register({
          email: identifier,
          password,
          name,
          phone,
          role,
          bloodGroup: role === 'DONOR' ? bloodGroup : undefined
        });
      } else {
        // Heuristic: If it looks like a email, use standard login. Otherwise use Hospital ID login.
        if (identifier.includes('@')) {
          res = await api.login(identifier, password);
        } else {
          res = await api.loginByHospital(identifier, password);
        }
      }

      localStorage.setItem('rp_token', res.access_token);
      localStorage.setItem('rp_user_id', res.user?.id || res.user?._id || ''); // Verify ID key
      onLoginSuccess(res.user);
    } catch (err) {
      console.error('[AUTH] Error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, var(--red-glow) 0%, transparent 70%)', opacity: 0.1, zIndex: 0 }} />
      
      <motion.div 
        className="auth-card glass"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="auth-header">
          <div className="logo-icon">🩸</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1 }}>Red<span>Pulse</span></h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>
            {isRegistering ? 'Create Security Credentials' : 'Emergency Command Center Login'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" className="auth-input" placeholder="e.g. John Doe"
                value={name} onChange={(e) => setName(e.target.value)} required disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label>{isRegistering ? 'Email' : 'Hospital ID or Email'}</label>
            <input 
              type="text" className="auth-input" placeholder="you@example.com"
              value={identifier} onChange={(e) => setIdentifier(e.target.value)} required disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" className="auth-input" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
            />
          </div>

          {isRegistering && (
            <>
              <div className="form-group">
                <label>Phone Number (for SMS alerts)</label>
                <input 
                  type="text" className="auth-input" placeholder="+91-XXXXXXXXXX"
                  value={phone} onChange={(e) => setPhone(e.target.value)} required disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Account Role</label>
                <select 
                  className="auth-input" value={role} 
                  onChange={(e) => setRole(e.target.value)} disabled={loading}
                >
                  <option value="HOSPITAL">HOSPITAL</option>
                  <option value="DONOR">DONOR</option>
                </select>
              </div>

              {role === 'DONOR' && (
                <div className="form-group">
                  <label>Blood Group</label>
                  <select 
                    className="auth-input" value={bloodGroup} 
                    onChange={(e) => setBloodGroup(e.target.value)} disabled={loading}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}
            >
              ⚠️ {error}
            </motion.div>
          )}

          <motion.button 
            type="submit" className="emergency-btn mt-4" style={{ width: '100%' }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading}
          >
            {loading ? 'PROCESSING...' : (isRegistering ? 'REGISTER ACCOUNT' : 'ENTER COMMAND CENTER')}
          </motion.button>
        </form>

        <button 
          onClick={() => setIsRegistering(!isRegistering)}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, marginTop: 16, cursor: 'pointer', fontWeight: 600 }}
        >
          {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
        </button>

        <div style={{ marginTop: 24, fontSize: 11, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
          Secure Matrix Node Access • v1.1.0
        </div>
      </motion.div>
    </div>
  );
}
