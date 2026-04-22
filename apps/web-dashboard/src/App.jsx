import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectSocket, api } from './lib.js';
import LoginPage from './components/LoginPage.jsx';
import Sidebar from './components/Sidebar.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import RequestsPage from './components/RequestsPage.jsx';
import DonorsPage from './components/DonorsPage.jsx';
import BloodStockPage from './components/BloodStockPage.jsx';
import PredictionsPage from './components/PredictionsPage.jsx';
import EmergencyModal from './components/EmergencyModal.jsx';
import GlobalSpotlight from './components/GlobalSpotlight.jsx';
import AiAdvisor from './components/AiAdvisor.jsx';

// ── Toast System ────────────────────────────────────────────
let toastId = 0;
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((title, body, type = '', duration = 7000) => {
    const id = ++toastId;
    setToasts(t => [...t, { id, title, body, type, duration }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);
  return { toasts, addToast };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const [page, setPage] = useState('dashboard');
  const [connected, setConnected] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  
  const [requests, setRequests] = useState([]);
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [stats, setStats] = useState(null);
  const [tracking, setTracking] = useState(null);
  
  const { toasts, addToast } = useToasts();

  const handleLogout = () => {
    localStorage.removeItem('rp_token');
    setIsAuthenticated(false);
    setUser(null);
    setRequests([]);
    setTracking(null);
    window.location.reload(); 
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  useEffect(() => {
    async function checkSession() {
      const token = localStorage.getItem('rp_token');
      if (!token) {
        setIsReady(true);
        return;
      }
      
      try {
        const [reqs, hosps, dons, st] = await Promise.all([
          api.getRequests().catch(() => []),
          api.getAllHospitals().catch(() => []),
          api.getDonors().catch(() => []),
          api.getStats().catch(() => null)
        ]);
        
        const currentHosp = hosps.find(h => h.user_id === localStorage.getItem('rp_user_id'));
        setUser(currentHosp || { name: 'Authorized Hospital' });
        
        setRequests(reqs);
        setHospitals(hosps);
        setDonors(dons);
        setStats(st);
        setIsAuthenticated(true);
      } catch (err) {
        console.warn('[BOOT] Session invalid:', err.message);
        localStorage.removeItem('rp_token');
      } finally {
        setIsReady(true);
      }
    }
    checkSession();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const sock = connectSocket(() => setConnected(true));
    sock.on('disconnect', () => setConnected(false));
    
    sock.on('request_update', ({ requestId, status }) => {
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status } : r));
    });

    sock.on('emergency_alert', (d) => {
      addToast(`🚨 ${d.urgency} REQUEST`, `${d.hospitalName} needs ${d.bloodGroup}`, 'emergency');
    });

    sock.on('blood_stock_update', ({ hospitalId, stock }) => {
      setHospitals(prev => prev.map(h => 
        h.id === hospitalId ? { ...h, blood_stock: stock } : h
      ));
    });

    sock.on('tracking_update', (d) => setTracking(d));

    sock.on('request_alert', (d) => {
      const title = d.isInStock ? '✅ STOCK VERIFIED' : '⚠️ STOCK UNAVAILABLE';
      const body = d.isInStock ? `Delivered ${d.bloodGroup}` : `Broadcasting ${d.bloodGroup}`;
      addToast(title, body, d.isInStock ? 'success' : 'emergency', 7000); 
    });

    // ── Silent Refresh Protocol ─────────────────────────────
    // Perpetual 10-second sync cycle for all tactical data
    const syncInterval = setInterval(async () => {
      try {
        const [reqs, dons, st] = await Promise.all([
          api.getRequests().catch(() => requests),
          api.getDonors().catch(() => donors),
          api.getStats().catch(() => stats)
        ]);
        setRequests(reqs);
        setDonors(dons);
        setStats(st);
      } catch (err) {
        console.warn('[SILENT_SYNC] Refresh protocol failed');
      }
    }, 10000);

    return () => {
      sock.disconnect();
      clearInterval(syncInterval);
    };
  }, [isAuthenticated, addToast]);

  if (!isReady) {
    return (
      <div style={{ background: '#04050a', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 16 }}>
        <div className="pulse-icon" style={{ fontSize: 40, animation: 'pulse 2s infinite' }}></div>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 4, opacity: 0.5 }}>BOOTING MATRIX...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <LoginPage onLoginSuccess={handleLoginSuccess} />;

  return (
      <div className="layout">
        <GlobalSpotlight />
        <Sidebar 
          page={page} 
          setPage={setPage} 
          connected={connected} 
          user={user}
          onLogout={handleLogout}
        />
        
        <main className="main-content">
          <AnimatePresence mode="wait">
            <motion.div 
              key={page} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              transition={{ duration: 0.3 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
            >
              {page === 'dashboard' && (
                <DashboardPage 
                  requests={requests} 
                  stats={stats} 
                  tracking={tracking} 
                  onTrigger={() => setShowModal(true)} 
                />
              )}
              {page === 'requests' && <RequestsPage requests={requests} onTrigger={() => setShowModal(true)} />}
              {page === 'donors' && <DonorsPage donors={donors} onDonorCreated={(d) => setDonors(p => [d, ...p])} />}
              {page === 'stock' && <BloodStockPage hospitals={hospitals} />}
              {page === 'predict' && <PredictionsPage user={user} />}
            </motion.div>
          </AnimatePresence>
        </main>

        {showModal && (
          <EmergencyModal 
            hospitals={hospitals} 
            onClose={() => setShowModal(false)} 
            onCreated={(r) => { 
                setRequests(p => [r, ...p]); 
                addToast('📢 BROADCAST SENT', 'Protocol Handshake Active', 'emergency', 7000);
            }} 
          />
        )}

        <div className="toast-container">
          <AnimatePresence>
            {toasts.map(t => (
              <motion.div 
                key={t.id} 
                className={`toast ${t.type}`}
                initial={{ x: 300, opacity: 0 }} 
                animate={{ x: 0, opacity: 1 }} 
                exit={{ x: 300, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              >
                <div>
                   <div style={{ fontSize: 20 }}>{t.type === 'emergency' ? '🚨' : t.type === 'success' ? '✅' : 'ℹ️'}</div>
                </div>
                <div>
                  <div className="toast-title">{t.title}</div>
                  <div className="toast-body">{t.body}</div>
                </div>
                <div className="toast-progress">
                  <motion.div 
                    className="toast-progress-fill"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: t.duration / 1000, ease: 'linear' }}
                    style={{ color: t.type === 'emergency' ? 'var(--red)' : t.type === 'success' ? 'var(--green)' : 'var(--blue)' }}
                  />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <AiAdvisor 
            user={user} 
            onOrderCreated={(r) => {
                setRequests(p => [r, ...p]);
                addToast('🧬 NEXUS: COMMAND EXECUTED', 'Autonomous Broadcast Initialized', 'success', 8000);
            }}
            onCancelLatest={async () => {
                const latest = requests.find(r => r.status === 'OPEN');
                if (latest) {
                    try {
                        await api.cancelRequest(latest.id);
                        setRequests(p => p.map(r => r.id === latest.id ? { ...r, status: 'CANCELLED' } : r));
                        addToast('🧬 NEXUS: COMMAND TERMINATED', 'Active Broadcast Modulated', 'success', 8000);
                        return true;
                    } catch (err) {
                        addToast('⚠ NEXUS: MODULATION FAILED', err.message, 'error');
                        return false;
                    }
                }
                return false;
            }}
            onTriggerOrder={() => setShowModal(true)} 
        />
      </div>
  );
}
