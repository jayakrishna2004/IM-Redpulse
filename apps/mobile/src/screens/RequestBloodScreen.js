import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS, commonStyles } from '../theme';
import { Ionicons } from '@expo/vector-icons';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCIES = ['CRITICAL', 'HIGH', 'NORMAL'];
const URGENCY_COLORS = { CRITICAL: COLORS.red, HIGH: COLORS.amber, NORMAL: COLORS.green };
const URGENCY_ICONS  = { CRITICAL: 'alert-circle', HIGH: 'warning', NORMAL: 'checkmark-circle' };

export default function RequestBloodScreen() {
  const { user, apiBase } = useApp();
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    urgency: 'CRITICAL',
    hospitalId: '',
    unitsNeeded: 1,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetchingHospitals, setFetchingHospitals] = useState(true);
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch(`${apiBase}/hospitals`, {
      headers: { Authorization: `Bearer ${user?.token || ''}` },
    })
      .then(r => r.json())
      .then(data => {
        setHospitals(data);
        if (data.length > 0) set('hospitalId', data[0].id);
      })
      .catch(() => {})
      .finally(() => setFetchingHospitals(false));
  }, []);

  async function handleSubmit() {
    setLoading(true);
    try {
      const h = hospitals.find(x => x.id === form.hospitalId);
      const res = await fetch(`${apiBase}/requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token || ''}`
        },
        body: JSON.stringify({
          hospitalId: form.hospitalId,
          bloodGroup: form.bloodGroup,
          urgency: form.urgency,
          lat: h.lat, lng: h.lng,
          unitsNeeded: parseInt(form.unitsNeeded) || 1,
          notes: form.notes,
        }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`[${res.status}] ${errorText}`);
      }
      
      setSuccess(true);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not send request. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={commonStyles.screen}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View style={styles.radarContainer}>
            <View style={styles.radarRing1} />
            <View style={styles.radarRing2} />
            <Ionicons name="radio-outline" size={60} color={COLORS.red} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '900', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8, marginTop: 24 }}>
            Emergency Broadcast Sent
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 32 }}>
            Searching for matching donors within 3km.
          </Text>
          <View style={{ backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 20, width: '100%', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Blood Group</Text>
            <Text style={{ color: COLORS.red, fontSize: 32, fontWeight: '900', fontFamily: 'monospace' }}>{form.bloodGroup}</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 8 }}>BROADCAST STATUS</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={URGENCY_ICONS[form.urgency]} size={16} color={URGENCY_COLORS[form.urgency]} />
              <Text style={{ color: URGENCY_COLORS[form.urgency], fontSize: 16, fontWeight: '800' }}>
                {form.urgency}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[commonStyles.bigButton, { marginTop: 24, width: '100%' }]}
            onPress={() => setSuccess(false)}
          >
            <Text style={commonStyles.bigButtonText}>Send Another Request</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={commonStyles.screen}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.screenTitle}>Request Blood</Text>
        <Text style={styles.screenSub}>Emergency broadcasts go to nearest eligible donors</Text>

        {/* Blood Group Selector */}
        <Text style={commonStyles.label}>Blood Group Required</Text>
        <View style={styles.chipRow}>
          {BLOOD_GROUPS.map(bg => (
            <TouchableOpacity
              key={bg}
              style={[styles.chip, form.bloodGroup === bg && styles.chipSelected]}
              onPress={() => set('bloodGroup', bg)}
            >
              <Text style={[styles.chipText, form.bloodGroup === bg && { color: COLORS.red }]}>{bg}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Urgency Selector */}
        <Text style={[commonStyles.label, { marginTop: 8 }]}>Urgency Level</Text>
        <View style={styles.urgencyRow}>
          {URGENCIES.map(u => (
            <TouchableOpacity
              key={u}
              style={[styles.urgencyChip, form.urgency === u && { borderColor: URGENCY_COLORS[u], backgroundColor: `${URGENCY_COLORS[u]}18` }]}
              onPress={() => set('urgency', u)}
            >
              <Ionicons name={URGENCY_ICONS[u]} size={20} color={form.urgency === u ? URGENCY_COLORS[u] : COLORS.textMuted} />
              <Text style={[styles.urgencyChipText, form.urgency === u && { color: URGENCY_COLORS[u] }]}>{u}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hospital Selector */}
        <Text style={[commonStyles.label, { marginTop: 8 }]}>Hospital</Text>
        {fetchingHospitals ? (
          <ActivityIndicator color={COLORS.red} style={{ marginVertical: 20 }} />
        ) : hospitals.length === 0 ? (
          <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginVertical: 10 }}>No hospitals found</Text>
        ) : (
          hospitals.map(h => (
            <TouchableOpacity
              key={h.id}
              style={[styles.hospitalChip, form.hospitalId === h.id && styles.hospitalChipSelected]}
              onPress={() => set('hospitalId', h.id)}
            >
              <Ionicons name="business" size={20} color={form.hospitalId === h.id ? COLORS.blue : COLORS.textMuted} />
              <Text style={[styles.hospitalName, form.hospitalId === h.id && { color: COLORS.textPrimary }]}>{h.name}</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Units */}
        <Text style={[commonStyles.label, { marginTop: 8 }]}>Units Needed</Text>
        <View style={styles.stepper}>
          <TouchableOpacity 
            style={styles.stepperBtn} 
            onPress={() => set('unitsNeeded', Math.max(1, form.unitsNeeded - 1))}
          >
            <Text style={styles.stepperBtnText}>-</Text>
          </TouchableOpacity>
          <View style={styles.stepperVal}>
            <Text style={styles.stepperValText}>{form.unitsNeeded}</Text>
          </View>
          <TouchableOpacity 
            style={styles.stepperBtn} 
            onPress={() => set('unitsNeeded', Math.min(10, form.unitsNeeded + 1))}
          >
            <Text style={styles.stepperBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <Text style={[commonStyles.label, { marginTop: 8 }]}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
          value={form.notes}
          onChangeText={v => set('notes', v)}
          placeholder="Patient condition, special requirements..."
          placeholderTextColor={COLORS.textMuted}
          multiline
        />

        {/* Submit */}
        <TouchableOpacity
          style={[commonStyles.bigButton, { marginTop: 20 }]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="megaphone" size={20} color="#fff" />
                <Text style={commonStyles.bigButtonText}>TRIGGER EMERGENCY BROADCAST</Text>
              </>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textPrimary, marginBottom: 4 },
  screenSub: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
  },
  chipSelected: { borderColor: COLORS.red, backgroundColor: COLORS.redSubtle },
  chipText: { fontWeight: '700', fontSize: 14, color: COLORS.textSecondary, fontVariant: ['tabular-nums'] },
  urgencyRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  urgencyChip: {
    flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card, alignItems: 'center', gap: 4,
  },
  urgencyChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.5 },
  hospitalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.card, marginBottom: 8,
  },
  hospitalChipSelected: { borderColor: COLORS.blue, backgroundColor: 'rgba(59,130,246,0.08)' },
  hospitalName: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, flex: 1 },
  input: {
    backgroundColor: COLORS.input, borderRadius: 10, padding: 14,
    color: COLORS.textPrimary, fontSize: 14, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 4,
  },
  stepper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.input,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  stepperBtn: {
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.card,
    borderRightWidth: 1, borderLeftWidth: 1, borderColor: COLORS.border,
  },
  stepperBtnText: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700' },
  stepperVal: { flex: 1, alignItems: 'center' },
  stepperValText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  radarContainer: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  radarRing1: {
    position: 'absolute', width: '100%', height: '100%', borderRadius: 75,
    borderWidth: 2, borderColor: COLORS.red, opacity: 0.2,
  },
  radarRing2: {
    position: 'absolute', width: '70%', height: '70%', borderRadius: 52,
    borderWidth: 2, borderColor: COLORS.red, opacity: 0.4,
  },
});
