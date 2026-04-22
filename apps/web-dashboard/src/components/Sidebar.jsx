import { motion } from 'framer-motion';

export default function Sidebar({ page, setPage, connected, user, onLogout }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'requests',  label: 'Requests'  },
    { id: 'donors',    label: 'Donors'    },
    { id: 'stock',     label: 'Blood Stock'},
    { id: 'predict',   label: 'Predictions'},
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Red<span>Pulse</span></h1>
      </div>
      
      <nav className="sidebar-nav">
        <div className="nav-section-label">Command Center</div>
        {navItems.map(item => (
          <button 
            key={item.id} 
            className={`nav-item ${page === item.id ? 'active' : ''}`} 
            onClick={() => setPage(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="card glass spotlight-card sidebar-profile">
          <div className="profile-label">Authorized Node</div>
          <div className="profile-name">{user?.name || 'Authorized Hospital'}</div>
          <button className="logout-btn" onClick={onLogout}>
             SECURE DISCONNECT ↪
          </button>
        </div>

        <div className="connection-status">
          <motion.div 
            className={`status-dot ${connected ? 'status-online' : 'status-offline'}`} 
            animate={connected ? { opacity: [1, 0.4, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span className={`status-text ${connected ? 'animate-sync-pulse' : ''}`}>
            {connected ? 'SYSTEM LINK ACTIVE' : 'NO CONNECTION'}
          </span>
        </div>
      </div>
    </aside>
  );
}
