import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView,
  TouchableOpacity, Animated, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS, commonStyles } from '../theme';
import { Ionicons } from '@expo/vector-icons';

function PulsingDot({ active }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!active) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.8, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active]);

  return (
    <View style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      {active && (
        <Animated.View style={[styles.dotRing, { transform: [{ scale }], opacity }]} />
      )}
      <View style={[styles.dot, { backgroundColor: active ? COLORS.green : COLORS.textMuted }]} />
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { user, donor, setDonor, apiBase } = useApp();
  const [isActive, setIsActive] = useState(donor?.status === 'ACTIVE');
  const [loading, setLoading] = useState(false);
  const [nearbyRequests, setNearbyRequests] = useState([]);

  useEffect(() => {
    if (donor) setIsActive(donor.status === 'ACTIVE');
  }, [donor]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRequests() {
    try {
      const res = await fetch(`${apiBase}/requests?status=MATCHING`);
      if (res.ok) setNearbyRequests(await res.json());
    } catch {}
  }

  async function toggleAvailability(val) {
    setIsActive(val);
    setLoading(true);
    try {
      await fetch(`${apiBase}/donors/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: val ? 'ACTIVE' : 'INACTIVE' }),
      });
      setDonor(d => ({ ...d, status: val ? 'ACTIVE' : 'INACTIVE' }));
    } catch {}
    setLoading(false);
  }

  async function simulateLocation() {
    setLoading(true);
    // Simulate coordinates (Mumbai center - same as demo core-api logic)
    const lat = 19.0760;
    const lng = 72.8777;
    try {
      await fetch(`${apiBase}/donors/me/location`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ lat, lng }),
      });
      setDonor(d => ({ ...d, lat, lng }));
      Alert.alert('Location Updated', 'Simulated location set to Mumbai (City Center).');
    } catch {
      Alert.alert('Error', 'Failed to update location.');
    }
    setLoading(false);
  }

  const infoStats = [
    { label: 'Blood Group', value: donor?.blood_group || '—', color: COLORS.red },
    { label: 'Donated', value: donor?.total_accepted ?? 0, color: COLORS.green },
    { label: 'AI Score', value: donor?.ai_score ? (donor.ai_score * 100).toFixed(0) + '%' : '—', color: COLORS.blue },
    { label: 'Streak', value: `${donor?.total_accepted ?? 0} 🔥`, color: COLORS.amber },
  ];

  return (
    <SafeAreaView style={commonStyles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>SYSTEM OPERATOR: READY</Text>
            <Text style={styles.name}>{user?.name?.toUpperCase().split(' ')[0] || 'REDPULSE UNIT'}</Text>
          </View>
          <View style={styles.scoreCircle}>
            <Ionicons name="stats-chart" size={14} color={COLORS.blue} />
            <Text style={styles.scoreValue}>{donor?.ai_score ? Math.round(donor.ai_score * 100) : '—'}</Text>
          </View>
        </View>

        {/* Availability Toggle — Hero element */}
        <View style={[styles.availCard, isActive && styles.availCardActive]}>
          <View style={styles.availTop}>
            <PulsingDot active={isActive} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.availTitle}>{isActive ? 'TRANSMITTER: ACTIVE' : 'TRANSMITTER: OFFLINE'}</Text>
              <Text style={styles.availSub}>{isActive ? 'Broadcasting location telemetry' : 'Encrypted dormant state'}</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={toggleAvailability}
              disabled={loading}
              trackColor={{ false: COLORS.input, true: COLORS.redGlow }}
              thumbColor={isActive ? COLORS.red : COLORS.textMuted}
              ios_backgroundColor={COLORS.input}
            />
          </View>
          {isActive && (
            <View style={styles.availBanner}>
              <Text style={styles.availBannerText}>TACTICAL SCAN: MONITORING FREQUENCIES...</Text>
            </View>
          )}
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          {infoStats.map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={commonStyles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={commonStyles.label}>LOCATION FIX</Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '700', fontFamily: 'monospace' }}>
                {donor?.lat ? `${donor.lat.toFixed(4)}, ${donor.lng.toFixed(4)}` : 'SIGNAL LOST'}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.smallBtn, { borderColor: COLORS.blue }]} 
              onPress={simulateLocation}
              disabled={loading}
            >
              <Text style={[styles.smallBtnText, { color: COLORS.blue }]}>SIMULATE</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={commonStyles.card}>
          <Text style={commonStyles.label}>ELIGIBILITY STATUS</Text>
          {donor?.last_donation_date ? (
            <EligibilityBar lastDate={donor.last_donation_date} />
          ) : (
            <Text style={{ color: COLORS.green, fontWeight: '800', fontSize: 13 }}>READY_TO_DEPLOY — FIRST MATCH</Text>
          )}
        </View>

        {nearbyRequests.length > 0 && (
          <View style={commonStyles.card}>
            <Text style={commonStyles.label}>INCOMING SIGNALS</Text>
            {nearbyRequests.slice(0, 3).map(r => (
              <View key={r.id} style={styles.requestRow}>
                <View style={commonStyles.bloodBadge}>
                  <Text style={commonStyles.bloodBadgeText}>{r.blood_group}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: COLORS.textPrimary, fontWeight: '800', fontSize: 13 }}>{r.hospital_name.toUpperCase()}</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 10, letterSpacing: 1 }}>{r.urgency} // 0.8km</Text>
                </View>
                <Ionicons 
                  name={r.urgency === 'CRITICAL' ? 'alert-circle' : 'information-circle'} 
                  size={20} 
                  color={r.urgency === 'CRITICAL' ? COLORS.red : COLORS.amber} 
                />
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[commonStyles.bigButton, { marginTop: 8, gap: 12, flexDirection: 'row' }]}
          onPress={() => navigation.navigate('Request')}
          activeOpacity={0.85}
        >
          <Ionicons name="megaphone-outline" size={20} color="#fff" />
          <Text style={commonStyles.bigButtonText}>TRIGGER EMERGENCY SIGNAL</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function EligibilityBar({ lastDate }) {
  const daysSince = Math.floor((Date.now() - new Date(lastDate)) / (1000 * 86400));
  const progress = Math.min(1, daysSince / 90);
  const eligible = daysSince >= 90;

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ color: eligible ? COLORS.green : COLORS.amber, fontWeight: '700' }}>
          {eligible ? '✅ Eligible' : `⏳ ${90 - daysSince} days remaining`}
        </Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{daysSince}/90 days</Text>
      </View>
      <View style={{ height: 6, backgroundColor: COLORS.input, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{
          height: '100%', borderRadius: 3,
          width: `${progress * 100}%`,
          backgroundColor: eligible ? COLORS.green : COLORS.amber,
        }} />
      </View>
    </View>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  greeting: { fontSize: 14, color: COLORS.textMuted },
  name: { fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, marginTop: 2 },
  scoreCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.card, borderWidth: 2, borderColor: COLORS.blue,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreValue: { color: COLORS.blue, fontWeight: '800', fontSize: 16 },
  scoreLabel: { color: COLORS.textMuted, fontSize: 9 },
  availCard: {
    backgroundColor: COLORS.card, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 18, marginBottom: 16,
  },
  availCardActive: { borderColor: 'rgba(16,185,129,0.4)', backgroundColor: 'rgba(16,185,129,0.06)' },
  availTop: { flexDirection: 'row', alignItems: 'center' },
  availTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  availSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  availBanner: {
    marginTop: 12, backgroundColor: 'rgba(255,26,60,0.1)', borderRadius: 8,
    padding: 10, borderWidth: 1, borderColor: 'rgba(255,26,60,0.2)',
  },
  availBannerText: { color: COLORS.red, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotRing: {
    position: 'absolute', width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.green, opacity: 0.4,
  },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statItem: {
    flex: 1, backgroundColor: COLORS.card,
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 12, alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  requestRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  criticalBadge: { backgroundColor: COLORS.redSubtle },
  urgencyText: { fontSize: 16 },
  smallBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, backgroundColor: 'rgba(59,130,246,0.05)',
  },
  smallBtnText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
});
