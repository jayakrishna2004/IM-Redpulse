import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
  Modal, Pressable, Alert, Linking, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS } from '../theme';

const DEMO_ACCOUNTS = [
  { label: '🏥 Hospital Demo', email: 'cityhosp@demo.com', password: 'demo123' },
  { label: '🩸 Donor Demo',    email: 'donor1@demo.com',   password: 'demo123' },
];

export default function LoginScreen() {
  const { login, register, apiBase, updateApiBase } = useApp();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('DONOR');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [newUrl, setNewUrl] = useState(apiBase.replace('/api', ''));
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'online', 'offline'

  useEffect(() => {
    let checkInterval = setInterval(async () => {
      try {
        // Hit the root URL (without /api) as shown in the browser screenshot
        const rootUrl = apiBase.replace('/api', '');
        const res = await fetch(rootUrl, { 
          headers: { 'bypass-tunnel-reminder': 'true' },
          signal: AbortSignal.timeout(5000)
        });
        
        const text = await res.text();
        // Look for the "RedPulse" signature in the response to confirm it's our backend
        if (text.includes('RedPulse') || text.includes('online')) {
          setServerStatus('online');
        } else if (text.includes('interstitial') || text.includes('Cloudflare')) {
          setServerStatus('interstitial');
        } else {
          setServerStatus('offline');
        }
      } catch (err) {
        setServerStatus('offline');
      }
    }, 5000);
    return () => clearInterval(checkInterval);
  }, [apiBase]);

  async function handleAuth() {
    if (!email || !password || (isRegistering && (!name || !phone))) { 
      setError('Fill in all required fields'); 
      return; 
    }
    setLoading(true); setError('');
    try {
      if (isRegistering) {
        await register({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          phone: phone.trim(),
          role,
          bloodGroup: role === 'DONOR' ? bloodGroup : undefined
        });
      } else {
        await login(email.trim().toLowerCase(), password);
      }
    } catch (e) {
      setError(e.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  function SettingsModal() {
    return (
      <Modal visible={settingsVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Connection Settings</Text>
            <Text style={styles.modalSub}>Update the backend URL if server is unreachable</Text>
            
            <Text style={styles.label}>Backend Tunnel URL</Text>
            <TextInput 
              style={styles.input} 
              value={newUrl} 
              onChangeText={setNewUrl}
              placeholder="https://xxx.trycloudflare.com"
              placeholderTextColor={COLORS.textMuted}
            />

            <TouchableOpacity 
              style={styles.btn} 
              onPress={async () => {
                const success = await updateApiBase(newUrl);
                if (success) {
                  setSettingsVisible(false);
                  Alert.alert('Success', 'Connecting to new server...');
                }
              }}
            >
              <Text style={styles.btnText}>Apply & Reconnect</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 12, alignItems: 'center' }} 
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={{ color: COLORS.textMuted }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Settings Trigger */}
      <TouchableOpacity 
        style={styles.settingsBtn} 
        onPress={() => setSettingsVisible(true)}
      >
        <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <SettingsModal />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Ionicons name="pulse" size={42} color={COLORS.red} />
          </View>
          <Text style={styles.logoTitle}>
            RedPulse
          </Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: 
                serverStatus === 'online' ? '#4CAF50' : 
                serverStatus === 'interstitial' ? '#FFA000' : 
                serverStatus === 'offline' ? COLORS.red : '#757575' 
            }]} />
            <Text style={styles.statusText}>
              {serverStatus === 'online' ? 'Backend: Online' : 
               serverStatus === 'interstitial' ? 'Action Required' : 
               serverStatus === 'offline' ? 'Backend: Offline' : 'Checking...'}
            </Text>
          </View>
          
          {(serverStatus === 'offline' || serverStatus === 'interstitial') && (
            <TouchableOpacity 
              style={styles.wakeBtn}
              onPress={() => Linking.openURL(apiBase.replace('/api', ''))}
            >
              <Ionicons name="link-outline" size={12} color={COLORS.red} style={{ marginRight: 4 }} />
              <Text style={styles.wakeBtnText}>
                {serverStatus === 'interstitial' ? 'FIX CONNECTION' : 'WAKE BACKEND'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isRegistering ? 'Create Account' : 'Sign In'}</Text>

          {isRegistering && (
            <>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input} value={name} onChangeText={setName}
                placeholder="John Doe" placeholderTextColor={COLORS.textMuted}
              />
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textMuted}
            secureTextEntry
          />

          {isRegistering && (
            <>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input} value={phone} onChangeText={setPhone}
                placeholder="+91-XXXXXXXXXX" placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Register As</Text>
              <View style={{ flexDirection: 'row', marginBottom: 14, gap: 8 }}>
                {['DONOR', 'HOSPITAL'].map(r => (
                  <TouchableOpacity 
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.smallBtn, role === r && { backgroundColor: COLORS.red }]}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {role === 'DONOR' && (
                <>
                  <Text style={styles.label}>Blood Group</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <TouchableOpacity 
                        key={bg}
                        onPress={() => setBloodGroup(bg)}
                        style={[styles.chip, bloodGroup === bg && { backgroundColor: COLORS.red, borderColor: COLORS.red }]}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{bg}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btn} onPress={handleAuth} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>{isRegistering ? 'INITIALIZE ACCOUNT' : 'SIGN IN REMOTE'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setIsRegistering(!isRegistering)} 
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>
              {isRegistering ? '← Back to Login' : "Register New Account"}
            </Text>
          </TouchableOpacity>
        </View>

        {!isRegistering && (
          <View style={styles.demoSection}>
            <Text style={styles.demoTitle}>— Quick Demo Login —</Text>
            {DEMO_ACCOUNTS.map(acc => (
              <TouchableOpacity
                key={acc.email}
                style={styles.demoBtn}
                onPress={() => { setEmail(acc.email); setPassword(acc.password); }}
              >
                <Text style={styles.demoBtnText}>{acc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.base },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  logoSection: { alignItems: 'center', marginBottom: 36 },
  logoIcon: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.redSubtle,
    borderWidth: 1, borderColor: 'rgba(255,26,60,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  logoTitle: { fontSize: 32, fontWeight: '900', color: COLORS.textPrimary, letterSpacing: -1 },
  logoSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 16,
    padding: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.input, borderRadius: 10, padding: 14,
    color: COLORS.textPrimary, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 14,
  },
  error: { color: COLORS.red, fontSize: 13, marginBottom: 12 },
  btn: {
    backgroundColor: COLORS.red, borderRadius: 12, padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.red, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  smallBtn: {
    flex: 1, backgroundColor: COLORS.input, borderRadius: 8, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  chip: {
    backgroundColor: COLORS.input, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  demoSection: { marginTop: 24, alignItems: 'center' },
  demoTitle: { fontSize: 11, color: COLORS.textMuted, marginBottom: 12, letterSpacing: 0.5 },
  demoBtn: {
    backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingVertical: 12, paddingHorizontal: 20, marginBottom: 8, width: '100%', alignItems: 'center',
  },
  demoBtnText: { color: COLORS.textPrimary, fontWeight: '600', fontSize: 14 },
  settingsBtn: {
    position: 'absolute', top: 50, right: 24, zIndex: 10,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: COLORS.card, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  modalSub: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, marginTop: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  wakeBtn: {
    marginTop: 10,
    backgroundColor: 'rgba(255, 61, 0, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 0, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  wakeBtnText: {
    color: COLORS.red,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  secondaryBtn: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  }
});
