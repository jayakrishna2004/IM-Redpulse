import { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { AppContext } from './src/context/AppContext';
import HomeScreen from './src/screens/HomeScreen';
import EmergencyAlertScreen from './src/screens/EmergencyAlertScreen';
import TrackingScreen from './src/screens/TrackingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import RequestBloodScreen from './src/screens/RequestBloodScreen';
import LoginScreen from './src/screens/LoginScreen';
import IndustrialBackground from './src/components/IndustrialBackground';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const debuggerHost = Constants.expoConfig?.hostUri || '';
const host = debuggerHost.split(':')[0] || 'localhost';

// Final stable tunnel URL (Local IP for Wi-Fi / LTE fallback)
const INITIAL_TUNNEL_URL = 'http://192.168.29.113:3001';

console.log('📱 App started with Initial Tunnel URL:', INITIAL_TUNNEL_URL);

function TabIcon({ name, focused }) {
  return (
    <Ionicons 
      name={focused ? name : `${name}-outline`} 
      size={22} 
      color={focused ? COLORS.red : COLORS.textMuted} 
    />
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
        tabBarActiveTintColor: COLORS.red,
        tabBarInactiveTintColor: COLORS.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="shield-checkmark" focused={focused} />, tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Request"
        component={RequestBloodScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="pulse" focused={focused} />, tabBarLabel: 'Emergency' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />, tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [donor, setDonor] = useState(null);
  const [socket, setSocket] = useState(null);
  const [pendingAlert, setPendingAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiBase, setApiBase] = useState(`${INITIAL_TUNNEL_URL}/api`);
  const [socketUrl, setSocketUrl] = useState(INITIAL_TUNNEL_URL);
  const navRef = useRef(null);

  async function updateApiBase(newUrl) {
    if (!newUrl) return;
    try {
      const formattedUrl = newUrl.endsWith('/') ? newUrl.slice(0, -1) : newUrl;
      const cleanUrl = formattedUrl.endsWith('/api') ? formattedUrl.slice(0, -4) : formattedUrl;
      const finalApiBase = `${cleanUrl}/api`;
      
      await AsyncStorage.setItem('rp_api_base', cleanUrl);
      setApiBase(finalApiBase);
      setSocketUrl(cleanUrl);
      
      // Refresh socket if connected
      if (socket) {
        socket.disconnect();
        const newSock = io(cleanUrl, { transports: ['websocket', 'polling'] });
        setSocket(newSock);
      }
      
      return true;
    } catch (e) {
      Alert.alert('Settings Error', 'Failed to save new URL');
      return false;
    }
  }

  useEffect(() => {
    async function loadConfig() {
      // SAFE MODE: Bypass discovery and use stable defaults immediately
      try {
        const savedApi = await AsyncStorage.getItem('api_base_url');
        const savedSocket = await AsyncStorage.getItem('socket_url');
        setApiBase(savedApi || `${INITIAL_TUNNEL_URL}/api`);
        setSocketUrl(savedSocket || INITIAL_TUNNEL_URL);
      } catch (e) {
        console.error('Config Error');
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    }
    loadConfig();
  }, []);

  async function login(email, password) {
    let res;
    try {
      res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (netErr) {
      throw new Error('Cannot reach server. Check your internet connection.');
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Server error: ' + text.substring(0, 120)); }
    if (!res.ok) throw new Error(data?.message || 'Invalid credentials');
    setUser({ ...data.user, token: data.access_token });
    return data;
  }

  async function register(payload) {
    let res;
    try {
      res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      throw new Error('Cannot reach server. Check your internet connection.');
    }
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Server error: ' + text.substring(0, 120)); }
    if (!res.ok) throw new Error(data?.message || 'Registration failed');
    setUser({ ...data.user, token: data.access_token });
    return data;
  }

  async function loadDonorProfile(token, userId) {
    try {
      const res = await fetch(`${apiBase}/donors/me`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
        },
      });
      if (res.ok) setDonor(await res.json());
    } catch {}
  }

  useEffect(() => {
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const sock = io(socketUrl, { transports: ['websocket', 'polling'] });
    sock.on('connect', () => {
      if (donor?.id) sock.emit('join_donor', { donorId: donor.id });
    });
    sock.on('emergency_alert', (data) => {
      setPendingAlert(data);
      navRef.current?.navigate('Alert', { alert: data });
    });
    sock.on('REQUEST_FILLED', () => setPendingAlert(null));
    setSocket(sock);
    return () => sock.disconnect();
  }, [user, donor]);

  const contextValue = {
    user, setUser, donor, setDonor, socket,
    pendingAlert, setPendingAlert,
    apiBase, updateApiBase,
    login, register, loadDonorProfile,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.base, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.red} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContext.Provider value={contextValue}>
          <IndustrialBackground />
          <NavigationContainer ref={navRef} theme={{ colors: { background: 'transparent' } }}>
            <StatusBar style="light" backgroundColor={COLORS.base} />
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {!user ? (
                <Stack.Screen name="Login" component={LoginScreen} />
              ) : (
                <>
                  <Stack.Screen name="Main" component={MainTabs} />
                  <Stack.Screen
                    name="Alert"
                    component={EmergencyAlertScreen}
                    options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
                  />
                  <Stack.Screen name="Tracking" component={TrackingScreen} />
                </>
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </AppContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
