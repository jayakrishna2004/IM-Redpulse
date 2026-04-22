import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions, Easing, Alert, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.55;

export default function EmergencyAlertScreen({ navigation, route }) {
  const { donor, apiBase, setPendingAlert } = useApp();
  const alert = route.params?.alert;

  const [responding, setResponding] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const translateX = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Countdown timer
  useEffect(() => {
    Vibration.vibrate([0, 400, 200, 400]);
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); handleTimeout(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Pulse animation
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      ])
    );
    glow.start();

    return () => { anim.stop(); glow.stop(); };
  }, []);

  async function respond(action) {
    if (responding) return;
    setResponding(true);
    try {
      await fetch(`${apiBase}/requests/${alert?.requestId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      setPendingAlert(null);
      if (action === 'ACCEPTED') {
        navigation.replace('Tracking', { requestId: alert?.requestId });
      } else {
        navigation.goBack();
      }
    } catch (e) {
      Alert.alert('Error', 'Could not record response. Please try again.');
      setResponding(false);
    }
  }

  function handleTimeout() {
    setPendingAlert(null);
    navigation.goBack();
  }

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,26,60,0.3)', 'rgba(255,26,60,0.9)'],
  });

  const urgencyEmoji = { CRITICAL: '🚨', HIGH: '⚠️', NORMAL: '🔔' };
  const countdownColor = countdown <= 10 ? COLORS.red : countdown <= 20 ? COLORS.amber : COLORS.textSecondary;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Background glow */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,26,60,0.04)' }]} />

      <View style={styles.container}>
        {/* Countdown */}
        <View style={styles.countdownRow}>
          <Text style={styles.countdownLabel}>Auto-dismiss in</Text>
          <Text style={[styles.countdown, { color: countdownColor }]}>{countdown}s</Text>
        </View>

        {/* Main alert card */}
        <Animated.View style={[styles.alertCard, { borderColor, transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertEmoji}>{urgencyEmoji[alert?.urgency] || '🆘'}</Text>
          <Text style={styles.urgencyText}>{alert?.urgency || 'EMERGENCY'}</Text>
          <Text style={styles.alertTitle}>Blood Required</Text>

          <View style={styles.bloodCenterBadge}>
            <Text style={styles.bloodGroupBig}>{alert?.bloodGroup || '?'}</Text>
          </View>

          <View style={styles.detailsGrid}>
            <DetailItem icon="🏥" label="Hospital" value={alert?.hospitalName || 'Unknown'} />
            <DetailItem icon="📍" label="Distance" value={alert?.distanceKm ? `${alert.distanceKm} km away` : '—'} />
            <DetailItem icon="🧠" label="Match Score" value={alert?.score ? `${(alert.score * 100).toFixed(0)}%` : '—'} highlight />
          </View>
        </Animated.View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => respond('REJECTED')}
            disabled={responding}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 30 }}>✕</Text>
            <Text style={styles.rejectLabel}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => respond('ACCEPTED')}
            disabled={responding}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 36 }}>✓</Text>
            <Text style={styles.acceptLabel}>ACCEPT</Text>
            <Text style={styles.acceptSub}>Tap to respond</Text>
          </TouchableOpacity>

          <View style={{ width: 80 }} />
        </View>

        <Text style={styles.disclaimer}>
          Only accept if you are currently able to donate safely
        </Text>
      </View>
    </SafeAreaView>
  );
}

function DetailItem({ icon, label, value, highlight }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <View>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, highlight && { color: COLORS.green }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.base },
  container: { flex: 1, padding: 20, justifyContent: 'space-between' },
  countdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  countdownLabel: { fontSize: 13, color: COLORS.textMuted },
  countdown: { fontSize: 26, fontWeight: '900', fontVariant: ['tabular-nums'] },
  alertCard: {
    backgroundColor: COLORS.card, borderRadius: 24,
    borderWidth: 2, padding: 28, alignItems: 'center',
  },
  alertEmoji: { fontSize: 48, marginBottom: 8 },
  urgencyText: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: COLORS.red, textTransform: 'uppercase', marginBottom: 4 },
  alertTitle: { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 20 },
  bloodCenterBadge: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.redSubtle, borderWidth: 2, borderColor: COLORS.red,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  bloodGroupBig: { fontSize: 32, fontWeight: '900', color: COLORS.red },
  detailsGrid: { width: '100%', gap: 10 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: COLORS.input, borderRadius: 10 },
  detailIcon: { fontSize: 20 },
  detailLabel: { fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  rejectBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  acceptBtn: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.red, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  acceptLabel: { fontSize: 16, fontWeight: '900', color: '#fff', marginTop: 2 },
  acceptSub: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  disclaimer: { textAlign: 'center', fontSize: 11, color: COLORS.textMuted, paddingBottom: 8 },
});
