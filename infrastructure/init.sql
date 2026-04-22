-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- RedPulse Database Schema
-- =============================================

-- Users (base table for auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(20) NOT NULL DEFAULT 'DONOR', -- DONOR | HOSPITAL | ADMIN
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hospitals
CREATE TABLE IF NOT EXISTS hospitals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  contact_phone VARCHAR(20),
  blood_stock JSONB DEFAULT '{"A+":0,"A-":0,"B+":0,"B-":0,"AB+":0,"AB-":0,"O+":0,"O-":0}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Donors
CREATE TABLE IF NOT EXISTS donors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blood_group VARCHAR(5) NOT NULL, -- A+, A-, B+, B-, AB+, AB-, O+, O-
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  location GEOGRAPHY(POINT, 4326),
  last_donation_date DATE,
  status VARCHAR(20) DEFAULT 'INACTIVE', -- ACTIVE | INACTIVE | SUSPENDED
  fcm_token TEXT, -- For push notifications (fallback only in local)
  total_accepted INTEGER DEFAULT 0,
  total_rejected INTEGER DEFAULT 0,
  total_ignored INTEGER DEFAULT 0,
  avg_response_time_seconds DOUBLE PRECISION DEFAULT 0,
  ai_score DOUBLE PRECISION DEFAULT 0.5,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Blood requests
CREATE TABLE IF NOT EXISTS requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE CASCADE,
  blood_group VARCHAR(5) NOT NULL,
  urgency VARCHAR(20) NOT NULL DEFAULT 'HIGH', -- CRITICAL | HIGH | NORMAL
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location GEOGRAPHY(POINT, 4326),
  units_needed INTEGER DEFAULT 1,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING | MATCHING | MATCHED | FULFILLED | CANCELLED
  current_radius_km DOUBLE PRECISION DEFAULT 3,
  matched_donor_id UUID REFERENCES donors(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  fulfilled_at TIMESTAMP
);

-- Donor responses to requests
CREATE TABLE IF NOT EXISTS donor_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES donors(id) ON DELETE CASCADE,
  notified_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  action VARCHAR(20), -- ACCEPTED | REJECTED | TIMEOUT | PENDING
  response_time_seconds DOUBLE PRECISION,
  notified_radius_km DOUBLE PRECISION,
  UNIQUE(request_id, donor_id)
);

-- Live tracking sessions
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  donor_id UUID REFERENCES donors(id) ON DELETE CASCADE,
  donor_lat DOUBLE PRECISION,
  donor_lng DOUBLE PRECISION,
  hospital_lat DOUBLE PRECISION,
  hospital_lng DOUBLE PRECISION,
  eta_seconds INTEGER,
  distance_remaining_km DOUBLE PRECISION,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Notification log
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id UUID REFERENCES donors(id),
  request_id UUID REFERENCES requests(id),
  type VARCHAR(50) NOT NULL, -- EMERGENCY_REQUEST | REMINDER | SYSTEM
  title TEXT,
  body TEXT,
  delivered_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

-- =============================================
-- Spatial Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_donors_location ON donors USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_hospitals_location ON hospitals USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_requests_location ON requests USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON donors(blood_group);
CREATE INDEX IF NOT EXISTS idx_donors_status ON donors(status);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_donor_responses_request ON donor_responses(request_id);

-- =============================================
-- Trigger: auto-update geography from lat/lng
-- =============================================
CREATE OR REPLACE FUNCTION update_location_from_coords()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location = ST_MakePoint(NEW.lng, NEW.lat)::geography;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER donors_location_trigger
  BEFORE INSERT OR UPDATE ON donors
  FOR EACH ROW EXECUTE FUNCTION update_location_from_coords();

CREATE TRIGGER hospitals_location_trigger
  BEFORE INSERT OR UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION update_location_from_coords();

CREATE TRIGGER requests_location_trigger
  BEFORE INSERT OR UPDATE ON requests
  FOR EACH ROW EXECUTE FUNCTION update_location_from_coords();

-- =============================================
-- SEED DATA — Demo scenario
-- =============================================
-- Centered around Mumbai, India for demo

-- Hospital user
INSERT INTO users (id, email, password_hash, name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'cityhosp@demo.com', '$2b$10$ui8WmXqdOsUVQvhkFjfb4Wh1pO2kJaW/ju7nadNOhQBk', 'City General Hospital', 'HOSPITAL'),
  ('00000000-0000-0000-0000-000000000002', 'apexhosp@demo.com', '$2b$10$ui8WmXqdOsUVQvhkFjfb4Wh1pO2kJaW/ju7nadNOhQBk', 'Apex Medical Center', 'HOSPITAL')
ON CONFLICT DO NOTHING;

-- Hospitals (password = demo123)
INSERT INTO hospitals (id, user_id, name, address, lat, lng, contact_phone, blood_stock) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'City General Hospital', 'MG Road, Mumbai, Maharashtra', 19.0760, 72.8777, '+91-22-12345678',
   '{"A+":5,"A-":2,"B+":3,"B-":1,"AB+":2,"AB-":0,"O+":4,"O-":1}'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'Apex Medical Center', 'Andheri West, Mumbai', 19.1197, 72.8466, '+91-22-87654321',
   '{"A+":8,"A-":0,"B+":6,"B-":2,"AB+":1,"AB-":1,"O+":7,"O-":0}')
ON CONFLICT DO NOTHING;

-- Donor users (all password = demo123)
INSERT INTO users (id, email, password_hash, name, phone, role) VALUES
  ('00000000-0000-0000-0001-000000000001', 'donor1@demo.com', '$2b$10$K9K9K9K9K9K9K9K9K9K9KuSflCeQQYRGBBEWq5rYFH9.z8A05lKy6', 'Arjun Mehta', '+91-9876543201', 'DONOR'),
  ('00000000-0000-0000-0001-000000000002', 'donor2@demo.com', '$2b$10$K9K9K9K9K9K9K9K9K9K9KuSflCeQQYRGBBEWq5rYFH9.z8A05lKy6', 'Priya Sharma', '+91-9876543202', 'DONOR'),
  ('00000000-0000-0000-0001-000000000003', 'donor3@demo.com', '$2b$10$K9K9K9K9K9K9K9K9K9K9KuSflCeQQYRGBBEWq5rYFH9.z8A05lKy6', 'Rahul Verma', '+91-9876543203', 'DONOR'),
  ('00000000-0000-0000-0001-000000000004', 'donor4@demo.com', '$2b$10$K9K9K9K9K9K9K9K9K9K9KuSflCeQQYRGBBEWq5rYFH9.z8A05lKy6', 'Sneha Patel', '+91-9876543204', 'DONOR'),
  ('00000000-0000-0000-0001-000000000005', 'donor5@demo.com', '$2b$10$K9K9K9K9K9K9K9K9K9K9KuSflCeQQYRGBBEWq5rYFH9.z8A05lKy6', 'Karan Singh', '+91-9876543205', 'DONOR'),
  ('00000000-0000-0000-0001-000000000006', 'donor6@demo.com', '$2b$10$K9K9K9K9K9K9K9K9K9K9KuSflCeQQYRGBBEWq5rYFH9.z8A05lKy6', 'Anjali Nair', '+91-9876543206', 'DONOR'),
  ('00000000-0000-0000-0001-000000000007', 'donor7@demo.com', '$2b$10$K9K9K9K9K9K9K9K9K9K9KuSflCeQQYRGBBEWq5rYFH9.z8A05lKy6', 'Vikram Das', '+91-9876543207', 'DONOR'),
  ('00000000-0000-0000-0001-000000000008', 'donor8@demo.com', '$2b$10$K9K9K9K9K9K9K9K9K9K9KuSflCeQQYRGBBEWq5rYFH9.z8A05lKy6', 'Divya Rao', '+91-9876543208', 'DONOR')
ON CONFLICT DO NOTHING;

-- Donors with various blood groups, near Mumbai hospital
INSERT INTO donors (id, user_id, blood_group, lat, lng, last_donation_date, status, total_accepted, total_rejected, total_ignored, avg_response_time_seconds, ai_score) VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 'O+',  19.0820, 72.8810, NOW() - INTERVAL '95 days', 'ACTIVE',  8, 1, 0, 45,  0.91),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0001-000000000002', 'A+',  19.0780, 72.8750, NOW() - INTERVAL '60 days', 'INACTIVE', 3, 2, 1, 90,  0.62),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0001-000000000003', 'B+',  19.0710, 72.8730, NOW() - INTERVAL '120 days','ACTIVE',  12,0, 2, 30,  0.85),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0001-000000000004', 'O-',  19.0850, 72.8820, NOW() - INTERVAL '200 days','ACTIVE',  5, 0, 0, 25,  0.93),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0001-000000000005', 'AB+', 19.0700, 72.8800, NOW() - INTERVAL '45 days', 'ACTIVE',  2, 3, 4, 150, 0.44),
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0001-000000000006', 'A-',  19.0900, 72.8850, NOW() - INTERVAL '92 days', 'ACTIVE',  7, 1, 1, 55,  0.78),
  ('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0001-000000000007', 'B-',  19.0650, 72.8770, NOW() - INTERVAL '300 days','INACTIVE',1, 5, 8, 200, 0.22),
  ('20000000-0000-0000-0000-000000000008', '00000000-0000-0000-0001-000000000008', 'O+',  19.0760, 72.8900, NOW() - INTERVAL '100 days','ACTIVE',  6, 0, 1, 40,  0.82)
ON CONFLICT DO NOTHING;
