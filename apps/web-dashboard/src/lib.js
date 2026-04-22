import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3001'
const API_BASE = '/api'

// ── Socket ──────────────────────────────────────────────────
export let socket = null

export function connectSocket(onConnect) {
  socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
  socket.on('connect', () => {
    socket.emit('join_dashboard', { hospitalId: 'demo' })
    onConnect?.()
  })
  return socket
}

// ── API helpers ─────────────────────────────────────────────
const getToken = () => {
  const t = localStorage.getItem('rp_token')
  console.log(`[AUTH] getToken from storage: ${t ? t.substring(0, 15) + '...' : 'MISSING'}`)
  return t
}

const headers = () => {
  const h = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token && token !== 'undefined' && token !== 'null') {
    h.Authorization = `Bearer ${token}`
  }
  return h
}

async function apiFetch(path, opts = {}) {
  const method = opts.method || 'GET'
  console.log(`[API-DEBUG] START: ${method} ${path}`)
  
  const res = await fetch(API_BASE + path, { 
    headers: headers(), 
    ...opts 
  })
  
  if (!res.ok) {
    console.error(`[API-DEBUG] FAILED: ${method} ${path} | Status: ${res.status}`)
    if (res.status === 401) {
      console.warn('[API-DEBUG] 401 Detected -> Clearing local token')
      localStorage.removeItem('rp_token')
    }
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  
  console.log(`[API-DEBUG] SUCCESS: ${method} ${path}`)
  return res.json()
}

export const api = {
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (dto) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(dto) }),

  loginByHospital: (hospitalId, password) =>
    apiFetch('/auth/login/hospital', { method: 'POST', body: JSON.stringify({ hospitalId, password }) }),

  // Hospitals
  getDashboard: (id) => apiFetch(`/hospitals/${id}/dashboard`),
  getStats:     ()   => apiFetch('/hospitals/stats'),
  getAllHospitals: () => apiFetch('/hospitals'),
  updateBloodStock: (id, stock) =>
    apiFetch(`/hospitals/${id}/blood-stock`, { method: 'PATCH', body: JSON.stringify(stock) }),

  updateVerifiedRecipients: (dto) =>
    apiFetch('/hospitals/me/verified-recipients', { method: 'PATCH', body: JSON.stringify(dto) }),

  // Requests
  getRequests: (status) => apiFetch(`/requests${status ? `?status=${status}` : ''}`),
  createRequest: (dto)  => apiFetch('/requests', { method: 'POST', body: JSON.stringify(dto) }),
  cancelRequest: (id)   => apiFetch(`/requests/${id}/cancel`, { method: 'PATCH' }),
  getResponses:  (id)   => apiFetch(`/requests/${id}/responses`),

  // Donors
  getDonors: () => apiFetch('/donors'),

  // Tracking
  getTracking: (requestId) => apiFetch(`/tracking/${requestId}`),
}

// ── Demo mode helpers ────────────────────────────────────────
const MUMBAI_CENTER = { lat: 19.076, lng: 72.8777 }
export function randomNearby(center = MUMBAI_CENTER, radiusKm = 4) {
  const r = radiusKm / 111
  return {
    lat: center.lat + (Math.random() - 0.5) * r * 2,
    lng: center.lng + (Math.random() - 0.5) * r * 2,
  }
}

export const BLOOD_COLORS = {
  'A+': '#ef4444', 'A-': '#f97316',
  'B+': '#8b5cf6', 'B-': '#a78bfa',
  'AB+': '#3b82f6', 'AB-': '#60a5fa',
  'O+': '#10b981', 'O-': '#34d399',
}

export function formatEta(seconds) {
  if (!seconds) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export function timeSince(dateStr) {
  const sec = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (sec < 60) return `${sec}s ago`
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`
  return `${Math.floor(sec/3600)}h ago`
}
