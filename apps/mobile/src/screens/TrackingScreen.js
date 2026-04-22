import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS } from '../theme';

function ETADisplay({ seconds }) {
  const m = Math.floor((seconds || 0) / 60);
  const s = (seconds || 0) % 60;
  return (
    <Text style={styles.etaTime}>
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </Text>
  );
}

function LiveDot() {
  const blink = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.liveDot, { opacity: blink }]} />;
}

export default function TrackingScreen({ navigation, route }) {
  const { apiBase, socket } = useApp();
  const requestId = route.params?.requestId;
  const [tracking, setTracking] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [locationSim, setLocationSim] = useState({ lat: 19.076, lng: 72.877 });

  // Fetch tracking session
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiBase}/tracking/${requestId}`);
        if (res.ok) setTracking(await res.json());
      } catch {}
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [requestId]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Simulate sending location updates
  useEffect(() => {
    if (!requestId) return;
    const interval = setInterval(() => {
      const newLat = locationSim.lat + (Math.random() - 0.47) * 0.001;
      const newLng = locationSim.lng + (Math.random() - 0.47) * 0.001;
      setLocationSim({ lat: newLat, lng: newLng });

      fetch(`${apiBase}/tracking/${requestId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: newLat, lng: newLng }),
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [requestId, locationSim]);

  // WebSocket tracking updates
  useEffect(() => {
    if (!socket) return;
    socket.on('tracking_update', (data) => {
      if (data.requestId === requestId || !data.requestId) {
        setTracking(prev => ({ ...prev, ...data }));
      }
    });
    return () => socket.off('tracking_update');
  }, [socket, requestId]);

  async function markComplete() {
    try {
      await fetch(`${apiBase}/tracking/${requestId}/complete`, { method: 'POST' });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch {
      navigation.goBack();
    }
  }

  const distKm = tracking?.distance_remaining_km?.toFixed(2) || '—';
  const etaSec = tracking?.eta_seconds;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <LiveDot />
          <Text style={styles.headerText}>LIVE TRACKING</Text>
        </View>

        {/* Main ETA card */}
        <View style={styles.etaCard}>
          <Text style={styles.etaLabel}>Estimated Arrival</Text>
          <ETADisplay seconds={etaSec} />
          <Text style={styles.etaSub}>{distKm} km remaining</Text>
        </View>

        {/* Progress steps */}
        <View style={styles.stepsContainer}>
          <Step icon="✅" label="Request Accepted" done />
          <StepLine done />
          <Step icon="🚗" label="En Route to Hospital" active />
          <StepLine />
          <Step icon="🏥" label="Arrived at Hospital" />
          <StepLine />
          <Step icon="🩸" label="Donation Complete" />
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <InfoChip icon="⏱" label="Time Elapsed" value={`${Math.floor(elapsed/60)}m ${elapsed%60}s`} />
          <InfoChip icon="📡" label="GPS Updates" value="Live" color={COLORS.green} />
          <InfoChip icon="📍" label="Distance" value={`${distKm} km`} />
        </View>

        {/* Map placeholder — shows coords */}
        <View style={styles.mapPlaceholder}>
          <Text style={{ fontSize: 40, marginBottom: 8 }}>🗺</Text>
          <Text style={styles.coordText}>
            {locationSim.lat.toFixed(5)}, {locationSim.lng.toFixed(5)}
          </Text>
          <Text style={styles.coordSub}>Live coordinates updating...</Text>
        </View>

        {/* Complete button */}
        <TouchableOpacity style={styles.completeBtn} onPress={markComplete} activeOpacity={0.85}>
          <Text style={styles.completeBtnText}>✅ Mark Donation Complete</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Step({ icon, label, done, active }) {
  return (
    <View style={[styles.step, active && styles.stepActive]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={[styles.stepLabel, { color: done ? COLORS.green : active ? COLORS.textPrimary : COLORS.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}
function StepLine({ done }) {
  return <View style={[styles.stepLine, done && { backgroundColor: COLORS.green }]} />;
}
function InfoChip({ icon, label, value, color }) {
  return (
    <View style={styles.infoChip}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: color || COLORS.textPrimary }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.base },
  container: { flex: 1, padding: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { fontSize: 13, fontWeight: '800', letterSpacing: 2, color: COLORS.red, textTransform: 'uppercase' },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.red },
  etaCard: {
    backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
    padding: 24, alignItems: 'center',
  },
  etaLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 1, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 8 },
  etaTime: { fontSize: 56, fontWeight: '900', color: COLORS.blue, fontVariant: ['tabular-nums'], letterSpacing: -2 },
  etaSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  stepsContainer: { gap: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10 },
  stepActive: { backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  stepLabel: { fontSize: 13, fontWeight: '600' },
  stepLine: { width: 2, height: 16, backgroundColor: COLORS.border, marginLeft: 21 },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoChip: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 12, alignItems: 'center', gap: 4,
  },
  mapPlaceholder: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', minHeight: 120,
  },
  coordText: { fontFamily: 'monospace', fontSize: 13, color: COLORS.blue },
  coordSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  completeBtn: {
    backgroundColor: COLORS.green, borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: COLORS.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  completeBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
