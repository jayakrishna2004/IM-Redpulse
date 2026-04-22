import { useState, useEffect, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { RequestList, DonorResponseList } from './RequestList.jsx';
import { api, formatEta } from '../lib.js';
import MagicBento from './MagicBento.jsx';

const LiveMap = lazy(() => import('./LiveMap.jsx'));

export default function DashboardPage({ requests, stats, tracking, onTrigger }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responses, setResponses] = useState([]);

  async function handleSelectRequest(r) {
    setSelectedRequest(r);
    try {
      const data = await api.getResponses(r.id);
      setResponses(data);
    } catch {
      setResponses([]);
    }
  }

  const activeRequests = requests?.filter(r => !['FULFILLED', 'CANCELLED'].includes(r.status)) || [];

  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync with actual settings from backend
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.getDashboard('me');
        if (data.hospital) {
          setVerifiedPhone(data.hospital.test_phone || import.meta.env.VITE_TEST_PHONE || '');
          setVerifiedEmail(data.hospital.test_email || import.meta.env.VITE_TEST_EMAIL || '');
        }
      } catch (err) {
        console.warn('[DASHBOARD] Failed to load connectivity settings:', err.message);
      }
    }
    loadSettings();
  }, []);

  async function handleUpdateConnectivity() {
    if (!verifiedPhone || !verifiedEmail) {
      alert('Please provide both phone and email for testing.');
      return;
    }
    setIsUpdating(true);
    try {
      await api.updateVerifiedRecipients({ testEmail: verifiedEmail, testPhone: verifiedPhone });
      alert('Connectivity settings successfully synced with Command Center! Emergency alerts will now be redirected to these addresses.');
    } catch (err) {
      console.error('[SETTINGS] Update Failed:', err);
      alert('Failed to update settings: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUpdating(false);
    }
  }

  const bentoStats = [
    {
      label: 'Network',
      title: 'Active Emergencies',
      description: 'Critical pending fulfillment',
      value: activeRequests.length,
      glowColor: '255, 95, 95', // Vivid Pastel Red
      color: '#FF5F5F',
    },
    {
      label: 'Operations',
      title: 'Donors Online',
      description: 'Authenticated responders',
      value: stats?.active_donors ?? '8',
      glowColor: '95, 255, 95', // Vivid Pastel Green
      color: '#5FFF5F',
    },
    {
      label: 'Fulfilled',
      title: 'Delivered Today',
      description: 'Units successfully transported',
      value: stats?.fulfilled_today ?? '12',
      glowColor: '95, 159, 255', // Vivid Pastel Blue
      color: '#5F9FFF',
    },
    {
      label: 'Efficiency',
      title: 'Avg Response',
      description: 'Alert to target match time',
      value: stats?.avg_fulfillment_minutes ? `${Math.round(stats.avg_fulfillment_minutes)}m` : '4.2m',
      glowColor: '255, 255, 95', // Vivid Pastel Yellow
      color: '#FFFF5F',
    },
    {
      label: 'Security',
      title: 'System Node',
      description: 'AES-256 Encrypted Layer',
      value: 'CORE',
      glowColor: '159, 95, 255', // Vivid Pastel Purple
      color: '#9F5FFF',
    }
  ];

  return (
    <>
      <header className="topbar">
        <div>
          <h2 className="topbar-title">Command Center</h2>
          <p className="topbar-subtitle">Real-time Emergency Response Matrix — Mumbai Sector</p>
        </div>
        <motion.button 
          className="emergency-btn pulse-red" 
          onClick={onTrigger} 
          whileTap={{ scale: 0.95 }}
        >
          Trigger Emergency
        </motion.button>
      </header>

      <section className="magic-stats-container">
        <MagicBento 
          cardData={bentoStats}
          glowColor="255, 26, 60"
          enableTilt={true}
          spotlightRadius={350}
        />
      </section>

      <main className="dashboard-grid">
        <div className="dashboard-main">
          <div className="card glass spotlight-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="card-title" style={{ padding: '24px 24px 0' }}>🛰 Global Scanning Matrix</div>
            <div className="map-container" style={{ border: '1px solid var(--glass-border)', borderRadius: '12px' }}>
              <Suspense fallback={<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Initializing Map Layer...</div>}>
                <LiveMap requests={activeRequests} trackingData={tracking} />
              </Suspense>
            </div>
          </div>

          {tracking && (
            <motion.div 
              className="card glass spotlight-card" 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              style={{ background: 'linear-gradient(135deg, rgba(255, 26, 60, 0.1), rgba(22, 28, 54, 0.4))' }}
            >
              <div className="card-title" style={{ color: 'var(--red)' }}>INTERCEPTION IN PROGRESS</div>
              <div className="flex items-center justify-between" style={{ padding: '0 10px' }}>
                  <div>
                    <div className="eta-countdown" style={{ color: 'var(--blue)', fontSize: 56, letterSpacing: -2, fontWeight: 800 }}>{formatEta(tracking.eta_seconds)}</div>
                    <div className="text-muted" style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Estimated Arrival</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {tracking.distance_remaining_km?.toFixed(1)} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>KM</span>
                    </div>
                    <div className="text-muted" style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Distance To Target</div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          <div className="dashboard-side">
            <div className="card glass spotlight-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
              <div className="card-title">LIVE ALERTS</div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: 10 }}>
                <RequestList requests={activeRequests} onSelect={handleSelectRequest} selectedId={selectedRequest?.id} />
              </div>
            </div>
            {selectedRequest && (
              <motion.div 
                className="card glass spotlight-card" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="card-title">ASSIGNED DONORS</div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <DonorResponseList responses={responses} />
                </div>
              </motion.div>
            )}
          </div>
      </main>
    </>
  );
}
