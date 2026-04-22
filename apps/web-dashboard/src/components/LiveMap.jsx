import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../lib.js';

// ── Icons Fix ───────────────────────────────────────────────
// Leaflet default icons often break in bundlers. We'll use custom 
// industrial pulses for the RedPulse aesthetic.
const donorIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#3498db; width:12px; height:12px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 10px #3498db;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const emergencyIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#e74c3c; width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 15px #e74c3c; animation: pulse 1.5s infinite;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const vehicleIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="font-size: 24px;">🚑</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const youIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color:#00ff9d; width:14px; height:14px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 15px #00ff9d; animation: pulse 2s infinite;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

// ── MapSynchronizer Component ─────────────────────────────
// Leaflet's MapContainer is immutable after first render.
// This component syncs the map view and zoom level dynamically.
function MapSynchronizer({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 16, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function LiveMap({ requests = [], trackingData }) {
  const [center, setCenter] = useState([19.0760, 72.8777]); // Default Mumbai
  const [userPos, setUserPos] = useState(null);
  const [donors, setDonors] = useState([]);
  const [zoom, setZoom] = useState(12);

  // Detect and watch user's device location
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          setUserPos(newPos);
          // Auto-center and zoom city-level on first fix
          setCenter(newPos);
          setZoom(16);
        },
        (err) => {
          console.warn('[MAP] Geolocation watch failed or denied.');
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    async function loadDonors() {
      try {
        const data = await api.getDonors();
        setDonors(data.filter(d => d.lat && d.lng));
      } catch (err) {
        console.warn('[MAP] Donor sync failed:', err);
      }
    }
    loadDonors();
    const interval = setInterval(loadDonors, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update center if tracking data arrives
  useEffect(() => {
    if (trackingData?.lat && trackingData?.lng) {
      setCenter([parseFloat(trackingData.lat), parseFloat(trackingData.lng)]);
    }
  }, [trackingData]);

  return (
    <div style={{ height: '500px', width: '100%', position: 'relative', background: '#020308', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ width: '100%', height: '100%', background: '#020308' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapSynchronizer center={center} zoom={zoom} />

        {userPos && (
            <Marker position={userPos} icon={youIcon}>
                <Popup>COMMAND OPERATOR: YOU</Popup>
            </Marker>
        )}

        {trackingData?.lat && trackingData?.lng && (
            <Marker 
                position={[parseFloat(trackingData.lat), parseFloat(trackingData.lng)]} 
                icon={vehicleIcon}
            >
                <Popup>Active Tracker Unit</Popup>
            </Marker>
        )}

        {donors.map(d => (
          <Marker 
            key={d.id} 
            position={[parseFloat(d.lat), parseFloat(d.lng)]} 
            icon={donorIcon}
          >
            <Popup>
              <div style={{ color: '#333' }}>
                <strong>{d.name}</strong><br/>
                Status: {d.status}
              </div>
            </Popup>
          </Marker>
        ))}

        {requests.map(req => (
          <Marker 
            key={req.id} 
            position={[parseFloat(req.lat), parseFloat(req.lng)]} 
            icon={emergencyIcon}
          >
            <Popup>
              <div style={{ color: '#333' }}>
                <strong style={{ color: 'red' }}>🚨 EMERGENCY: {req.blood_group}</strong><br/>
                Hospital: {req.hospital_name}<br/>
                Urgency: {req.urgency}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Industrial Overlay Hud */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, pointerEvents: 'none' }}>
        <div style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.6)', borderRadius: 4, borderLeft: '3px solid var(--red)' }}>
            <Text style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>
                GEO SYNC: ACTIVE // CARTO DB ENGINE
            </Text>
        </div>
      </div>
    </div>
  );
}

// Minimalist Text shim for the HUD
function Text({ children, style }) {
    return <span style={style}>{children}</span>;
}
