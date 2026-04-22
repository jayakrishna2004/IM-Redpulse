# 🩸 RedPulse — Real-Time Emergency Blood Response System

> Local Development Setup (No cloud credentials required)

---

## Prerequisites

- **Node.js** ≥ 18  
- **Python** ≥ 3.10  
- **Docker Desktop** (for PostgreSQL + Redis)

---

## 🚀 Start Everything (5 steps)

### Step 1 — Start the Database
```bash
docker compose up -d
```
This starts PostgreSQL (PostGIS) on port 5432 and Redis on port 6379.
The database schema and seed data auto-loads on first start.

---

### Step 2 — Start the Backend API (NestJS)
```bash
cd services/core-api
npm install
npm run start:dev
```
Running on: http://localhost:3001  
Swagger docs: http://localhost:3001/api/docs

---

### Step 3 — Start the AI Engine (FastAPI)
```bash
cd services/ai-engine
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Running on: http://localhost:8000  
API docs: http://localhost:8000/docs

---

### Step 4 — Start the Hospital Dashboard (React)
```bash
cd apps/web-dashboard
npm install
npm run dev
```
Running on: http://localhost:5173

---

### Step 5 — Start the Mobile App (Expo)
```bash
cd apps/mobile
npm install
npx expo start
```
Scan QR code with Expo Go app, or press `w` for browser.

---

## 🎭 Demo Scenario

1. Open dashboard → http://localhost:5173
2. Click **🚨 Trigger Emergency** → Select O+, CRITICAL
3. Watch matching engine find top donors in console
4. Open mobile app → see emergency alert notification
5. Swipe to accept → dashboard shows donor moving live
6. ETA countdown appears on dashboard

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Hospital | cityhosp@demo.com | demo123 |
| Hospital | apexhosp@demo.com | demo123 |
| Donor | donor1@demo.com | demo123 |
| Donor | donor2@demo.com | demo123 |

---

## Architecture

```
Port 3001  — NestJS Core API (REST + WebSocket)
Port 8000  — FastAPI AI Engine
Port 5173  — React Dashboard
Port 8081  — Expo Mobile App
Port 5432  — PostgreSQL + PostGIS
Port 6379  — Redis
```

---

## Key Features Implemented

- ✅ Real-time geo-matching with PostGIS ST_DWithin
- ✅ AI scoring engine (4-factor: distance, eligibility, responsiveness, recency)
- ✅ Smart radius expansion (3km → 5km → 7km every 2 min)
- ✅ Blood compatibility matrix (O- universal donor logic)
- ✅ WebSocket live tracking with Haversine ETA calculation
- ✅ Hospital command dashboard with live map (dark CartoDB tiles)
- ✅ Animated donor response tracking
- ✅ Fraud/spam detection endpoint
- ✅ Demand prediction (7-day forecast)
- ✅ Expo mobile app with swipe-to-accept
