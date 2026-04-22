import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS, commonStyles } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const BLOOD_GROUP_COLOR = {
  'O-': '#34d399', 'O+': '#10b981', 'A+': '#ef4444', 'A-': '#f97316',
  'B+': '#8b5cf6', 'B-': '#a78bfa', 'AB+': '#3b82f6', 'AB-': '#60a5fa',
};

const COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};

export default function ProfileScreen() {
  const { user, donor, setUser, setDonor, apiBase } = useApp();
  const [history, setHistory] = useState([]);
  const [isActive, setIsActive] = useState(donor?.status === 'ACTIVE');

  useEffect(() => {
    fetch(`${apiBase}/donors/me/history`, {
      headers: { Authorization: `Bearer ${user?.token || ''}` },
    })
      .then(r => r.json())
      .then(setHistory)
      .catch(() => {});
  }, []);

  async function toggleAvailability(val) {
    setIsActive(val);
    try {
      await fetch(`${apiBase}/donors/availability`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: val ? 'ACTIVE' : 'INACTIVE' }),
      });
      setDonor(d => ({ ...d, status: val ? 'ACTIVE' : 'INACTIVE' }));
    } catch {}
  }

  const score = donor?.ai_score ?? 0;
  const scoreRating = score >= 0.8 ? 'Excellent' : score >= 0.6 ? 'Good' : score >= 0.4 ? 'Fair' : 'Needs Improvement';
  const scoreColor = score >= 0.8 ? COLORS.green : score >= 0.6 ? COLORS.blue : score >= 0.4 ? COLORS.amber : COLORS.red;

  return (
    <SafeAreaView style={commonStyles.screen}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* Profile hero */}
        <View style={styles.heroCard}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarBigText}>{(user?.name || 'D')[0]}</Text>
          </View>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          {donor?.blood_group && (
            <View style={[styles.bloodPill, { backgroundColor: `${BLOOD_GROUP_COLOR[donor.blood_group] || COLORS.red}22`, borderColor: BLOOD_GROUP_COLOR[donor.blood_group] || COLORS.red }]}>
              <Text style={[styles.bloodPillText, { color: BLOOD_GROUP_COLOR[donor.blood_group] || COLORS.red }]}>
                REDPULSE {donor.blood_group}
              </Text>
            </View>
          )}
        </View>

        {/* AI Score */}
        <View style={[commonStyles.card, { marginBottom: 12 }]}>
          <Text style={commonStyles.label}>AI Reliability Score</Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 42, fontWeight: '900', color: scoreColor }}>{(score * 100).toFixed(0)}</Text>
            <Text style={{ fontSize: 20, color: COLORS.textMuted, marginBottom: 6 }}>/100</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: scoreColor }}>{scoreRating}</Text>
            </View>
          </View>
          <View style={{ height: 8, backgroundColor: COLORS.input, borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ width: `${score * 100}%`, height: '100%', backgroundColor: scoreColor, borderRadius: 4 }} />
          </View>
          <View style={styles.aiInsights}>
            <Text style={styles.aiInsightText}>
              {score >= 0.8 ? 'SYSTEM OPERATOR: ELITE LEVEL' : score >= 0.5 ? 'SYSTEM OPERATOR: STABILIZING' : 'SYSTEM OPERATOR: RECOVERY MODE'}
            </Text>
            <Text style={styles.aiInsightSub}>
              {donor?.total_accepted > 5 ? 'Proven life-saver with 5+ donations' : 'Sync 3 more donations for loyalty badge'}
            </Text>
          </View>
        </View>

        {/* Compatibility Matrix */}
        {donor?.blood_group && (
          <View style={commonStyles.card}>
            <Text style={commonStyles.label}>Blood Compatibility</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>
              As a {donor.blood_group} donor, you can help patients with:
            </Text>
            <View style={styles.compGrid}>
              {COMPATIBILITY[donor.blood_group]?.map(bg => (
                <View key={bg} style={styles.compBadge}>
                  <Text style={styles.compBadgeText}>{bg}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatBox label="Accepted" value={donor?.total_accepted ?? 0} color={COLORS.green} icon="checkmark-shield-outline" />
          <StatBox label="Rejected" value={donor?.total_rejected ?? 0} color={COLORS.amber} icon="close-outline" />
          <StatBox label="Missed" value={donor?.total_ignored ?? 0} color={COLORS.red} icon="timer-outline" />
        </View>

        {/* Availability toggle */}
        <View style={[commonStyles.card, { flexDirection: 'row', alignItems: 'center' }]}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>Available for Donation</Text>
          <Switch
            value={isActive}
            onValueChange={toggleAvailability}
            trackColor={{ false: COLORS.input, true: COLORS.redGlow }}
            thumbColor={isActive ? COLORS.red : COLORS.textMuted}
          />
        </View>

        {/* Donation history */}
        <Text style={[commonStyles.label, { marginTop: 8, marginBottom: 8 }]}>Donation History</Text>
        {history.length === 0 ? (
          <View style={[commonStyles.card, { alignItems: 'center', padding: 28 }]}>
             <Ionicons name="journal-outline" size={32} color={COLORS.textMuted} style={{ marginBottom: 8 }} />
            <Text style={{ color: COLORS.textMuted, fontSize: 13, fontWeight: '700' }}>HISTORY LOG: EMPTY</Text>
          </View>
        ) : (
          history.slice(0, 10).map((h, i) => (
            <View key={i} style={[commonStyles.card, { marginBottom: 8 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: COLORS.textPrimary, fontWeight: '600' }}>{h.hospital_name}</Text>
                <View style={[commonStyles.bloodBadge]}>
                  <Text style={commonStyles.bloodBadgeText}>{h.blood_group}</Text>
                </View>
              </View>
              <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4 }}>
                {h.urgency} · {h.action} · {new Date(h.request_date).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => { setUser(null); setDonor(null); }}
        >
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color, icon }) {
  return (
    <View style={[styles.statBox]}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: COLORS.card, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border,
    padding: 24, alignItems: 'center', marginBottom: 16,
  },
  avatarBig: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.red, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarBigText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  userEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, marginBottom: 12 },
  bloodPill: {
    borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 6,
  },
  bloodPillText: { fontWeight: '800', fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    padding: 14, alignItems: 'center', gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  logoutBtn: {
    marginTop: 24, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  logoutText: { color: COLORS.textMuted, fontWeight: '600', fontSize: 14 },
  aiInsights: { marginTop: 12, gap: 4 },
  aiInsightText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  aiInsightSub: { color: COLORS.textMuted, fontSize: 11 },
  compGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  compBadge: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: COLORS.input, borderWidth: 1, borderColor: COLORS.border,
  },
  compBadgeText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
});
