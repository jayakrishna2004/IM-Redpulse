import BloodStockWidget from './BloodStock.jsx';

export default function BloodStockPage({ hospitals }) {
  return (
    <>
      <header className="topbar">
        <h2 className="topbar-title">Global Inventory</h2>
        <p className="topbar-subtitle">Real-time blood bank levels across sector nodes</p>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24, paddingBottom: 40 }}>
        {hospitals.map(h => (
          <div key={h.id} className="card glass" style={{ borderTop: '4px solid var(--red)' }}>
            <div className="card-title" style={{ fontSize: 20 }}>🏥 {h.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 20, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>NODE_ID: {h.id}</div>
            <BloodStockWidget hospitalId={h.id} stock={h.blood_stock || {}} />
          </div>
        ))}
      </div>
    </>
  );
}
