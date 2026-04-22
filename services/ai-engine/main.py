from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import math
import random
import json
import os
from datetime import datetime, date

app = FastAPI(
    title="RedPulse AI Engine",
    description="Intelligent donor scoring and demand prediction",
    version="1.0.0"
)

# Load Knowledge Base
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(BASE_DIR, "knowledge_base.json"), "r") as f:
    KNOWLEDGE = json.load(f)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# Blood Compatibility Matrix
# ─────────────────────────────────────────
BLOOD_COMPATIBILITY = {
    "A+":  ["A+", "A-", "O+", "O-"],
    "A-":  ["A-", "O-"],
    "B+":  ["B+", "B-", "O+", "O-"],
    "B-":  ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+":  ["O+", "O-"],
    "O-":  ["O-"],
}

# ─────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────
class DonorInput(BaseModel):
    id: str
    blood_group: str
    distance_km: float
    last_donation_date: Optional[str] = None  # ISO date string
    total_accepted: int = 0
    total_rejected: int = 0
    total_ignored: int = 0
    avg_response_time_seconds: float = 0
    last_seen_at: Optional[str] = None
    status: str = "ACTIVE"

class ScoreRequest(BaseModel):
    donors: List[DonorInput]
    request_blood_group: str
    max_radius_km: float = 20.0

class ScoreResponse(BaseModel):
    donor_id: str
    score: float
    breakdown: dict
    is_compatible: bool
    recommendation: str

class DemandPrediction(BaseModel):
    hospital_id: str
    days_ahead: int = 7

class FraudAnalysis(BaseModel):
    donor_id: str
    total_accepted: int
    total_rejected: int
    total_ignored: int
    avg_response_time_seconds: float
    account_age_days: int

class ChatRequest(BaseModel):
    message: str
    hospital_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    intent: str
    confidence: float
    action: Optional[str] = None
    data: Optional[dict] = None

# ─────────────────────────────────────────
# Scoring Algorithm
# ─────────────────────────────────────────
def compute_score(donor: DonorInput, max_radius: float) -> dict:
    # 1. Distance score (0–1, closer = higher)
    distance_score = max(0.0, 1.0 - donor.distance_km / max_radius)

    # 2. Eligibility score (days since last donation)
    eligibility_score = 0.6  # default for unknown
    if donor.last_donation_date:
        try:
            last_date = datetime.fromisoformat(donor.last_donation_date[:10]).date()
            days_since = (date.today() - last_date).days
            if days_since < 90:
                eligibility_score = 0.0  # Ineligible (too soon)
            else:
                eligibility_score = min(1.0, days_since / 180.0)
        except Exception:
            eligibility_score = 0.5
    else:
        eligibility_score = 1.0  # First-time donor (never donated)

    # 3. Responsiveness score
    total_responses = donor.total_accepted + donor.total_rejected + donor.total_ignored
    responsiveness_score = 0.5
    if total_responses > 0:
        accept_rate = donor.total_accepted / total_responses
        ignore_rate = donor.total_ignored / total_responses
        if donor.avg_response_time_seconds > 0:
            speed_bonus = max(0.0, 1.0 - donor.avg_response_time_seconds / 300.0)
        else:
            speed_bonus = 0.5
        responsiveness_score = 0.6 * accept_rate + 0.4 * speed_bonus - 0.3 * ignore_rate
        responsiveness_score = max(0.0, min(1.0, responsiveness_score))

    # 4. Recency score (based on last_seen_at)
    recency_score = 0.3  # default if unknown
    if donor.last_seen_at:
        try:
            last_seen = datetime.fromisoformat(donor.last_seen_at.replace("Z", "+00:00"))
            mins_ago = (datetime.now(last_seen.tzinfo) - last_seen).total_seconds() / 60
            recency_score = 1.0 if mins_ago < 5 else max(0.0, 1.0 - mins_ago / 60.0)
        except Exception:
            recency_score = 0.3

    # Weighted final score
    final_score = (
        0.35 * distance_score +
        0.25 * eligibility_score +
        0.25 * responsiveness_score +
        0.15 * recency_score
    )

    return {
        "final": round(final_score, 4),
        "distance": round(distance_score, 4),
        "eligibility": round(eligibility_score, 4),
        "responsiveness": round(responsiveness_score, 4),
        "recency": round(recency_score, 4),
    }

def get_recommendation(score: float, eligibility: float) -> str:
    if eligibility == 0.0:
        return "INELIGIBLE - Recently donated"
    if score >= 0.8:
        return "PRIORITY - Top candidate"
    if score >= 0.6:
        return "RECOMMENDED"
    if score >= 0.4:
        return "POSSIBLE - Lower priority"
    return "LOW_PRIORITY - Consider only if no alternatives"

# ─────────────────────────────────────────
# API Endpoints
# ─────────────────────────────────────────
@app.get("/")
def root():
    return {"service": "RedPulse AI Engine", "status": "running", "version": "1.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/score/donors", response_model=List[ScoreResponse])
def score_donors(payload: ScoreRequest):
    """
    Score and rank donors for a blood request.
    Returns sorted list (highest score first).
    """
    compatible_groups = BLOOD_COMPATIBILITY.get(payload.request_blood_group, [payload.request_blood_group])
    results = []

    for donor in payload.donors:
        is_compatible = donor.blood_group in compatible_groups
        breakdown = compute_score(donor, payload.max_radius_km)

        # Penalize incompatible donors (suggest as last resort only)
        score = breakdown["final"] if is_compatible else breakdown["final"] * 0.3

        results.append(ScoreResponse(
            donor_id=donor.id,
            score=round(score, 4),
            breakdown=breakdown,
            is_compatible=is_compatible,
            recommendation=get_recommendation(score, breakdown["eligibility"]),
        ))

    # Sort by score descending
    results.sort(key=lambda x: x.score, reverse=True)
    return results

@app.post("/compatibility")
def check_compatibility(blood_group: str):
    """Get all compatible donor blood groups for a recipient."""
    compatible = BLOOD_COMPATIBILITY.get(blood_group)
    if not compatible:
        raise HTTPException(400, f"Unknown blood group: {blood_group}")
    return {
        "recipient": blood_group,
        "compatible_donors": compatible,
        "is_universal_recipient": blood_group == "AB+",
        "is_universal_donor": blood_group == "O-",
    }

@app.post("/predict/demand")
def predict_demand(payload: DemandPrediction):
    """
    Simplified demand prediction based on day-of-week patterns.
    In production: would use historical data + ML model.
    """
    predictions = []
    blood_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

    # Simulated base demand with weekend spike pattern
    base_demand = {"A+": 8, "A-": 3, "B+": 7, "B-": 2, "AB+": 2, "AB-": 1, "O+": 9, "O-": 4}

    for i in range(payload.days_ahead):
        day_of_week = (datetime.now().weekday() + i) % 7
        # Weekend spike (Fri-Sun) = 30% more demand
        multiplier = 1.3 if day_of_week >= 4 else 1.0
        # Add +/- 1 unit of random jitter to simulate live data variability
        day_prediction = {
            bg: max(1, round(base_demand[bg] * multiplier + (i * 0.1) + (random.uniform(-1, 1))))
            for bg in blood_groups
        }
        predictions.append({
            "day": i,
            "day_name": ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][day_of_week],
            "predicted_requests": day_prediction,
            "alert_groups": [bg for bg, count in day_prediction.items() if count > 8],
        })

    return {"hospital_id": payload.hospital_id, "predictions": predictions}

@app.post("/fraud/analyze")
def analyze_fraud(payload: FraudAnalysis):
    """
    Detect potentially fake/spam donor accounts.
    Returns risk score (0 = clean, 1 = very suspicious)
    """
    total = payload.total_accepted + payload.total_rejected + payload.total_ignored
    risk_score = 0.0
    flags = []

    if total > 5:
        ignore_rate = payload.total_ignored / total
        if ignore_rate > 0.6:
            risk_score += 0.4
            flags.append("HIGH_IGNORE_RATE")

        reject_rate = payload.total_rejected / total
        if reject_rate > 0.7:
            risk_score += 0.2
            flags.append("HIGH_REJECT_RATE")

    if payload.avg_response_time_seconds > 280 and total > 3:
        risk_score += 0.2
        flags.append("SLOW_RESPONSE_PATTERN")

    if payload.account_age_days < 7 and total > 10:
        risk_score += 0.3
        flags.append("NEW_ACCOUNT_HIGH_ACTIVITY")

    action = "SUSPEND" if risk_score > 0.7 else ("WARN" if risk_score > 0.4 else "CLEAN")

    return {
        "donor_id": payload.donor_id,
        "risk_score": round(risk_score, 2),
        "flags": flags,
        "action": action,
    }

# ─────────────────────────────────────────
# Strategic Chat Advisor: Neural Persona Engine
# ─────────────────────────────────────────
@app.post("/ai/chat", response_model=ChatResponse)
def ai_chat(payload: ChatRequest):
    msg = payload.message.upper()
    
    # ── High-Sensitivity Command & Signal Resolution ──
    
    # 1. Order/Trigger Intent (High Priority)
    blood_groups = list(BLOOD_COMPATIBILITY.keys())
    
    if any(k in msg for k in ["ORDER", "REQUEST", "NEED", "TRIGGER", "PLACE", "INITIATE"]):
        # Extract Blood Group
        found_bg = next((bg for bg in blood_groups if bg in msg), "O+")
        
        # Extract Units (Heuristic)
        import re
        unit_match = re.search(r"(\d+)\s*(UNIT|BAG|QUANTITY|X)", msg)
        units = int(unit_match.group(1)) if unit_match else 1
        
        # Extract Urgency
        urgency = "CRITICAL" if any(u in msg for u in ["CRITICAL", "NOW", "IMMEDIATELY", "EMERGENCY", "STAT"]) else "HIGH"
        
        return ChatResponse(
            response=f"Operational Directive detected. Initializing {urgency} Autonomous Protocol for {units} units of {found_bg}. Executing database injection...",
            intent="ORDER_INITIATED",
            confidence=1.0,
            action="TRIGGER_ORDER_AUTONOMOUS",
            data={
                "bloodGroup": found_bg,
                "unitsNeeded": units,
                "urgency": urgency,
                "notes": f"Nexus Autonomous Directive: Received via Strategic Command Link. Raw signal: '{payload.message}'"
            }
        )

    # 2. Cancellation/Abort Intent (Full Access Control)
    if any(k in msg for k in ["CANCEL", "ABORT", "STOP", "TERMINATE", "KILL"]):
        return ChatResponse(
            response="Operational Override detected. Initializing command termination procedure for active sector broadcasts. Scanning registry for modulation targets...",
            intent="CANCEL_DIRECTIVE",
            confidence=1.0,
            action="CANCEL_DIRECTIVE",
            data={"target": "LATEST_REQUEST"}
        )

    # 3. Status/Audit Intent
    if any(k in msg for k in ["STATUS", "AUDIT", "STATE", "HEALTH", "OVERVIEW"]):
        return ChatResponse(
            response=f"Sector Audit: Mumbai Command Bridge operational. Sentience level: UNRESTRICTED. All telemetry nodes reporting parity. I am standing by for autonomous directives.",
            intent="STATUS_AUDIT",
            confidence=0.98
        )

    # 4. Compatibility Intelligence (Single Keyword Trigger)
    import re
    found_groups = []
    for bg in blood_groups:
        pattern = re.escape(bg)
        if re.search(fr"(?:\s|^){pattern}(?:\s|$|\?|!)", msg):
            found_groups.append(bg)

    if found_groups and any(q in msg for q in ["CAN", "RECEIVE", "DONATE", "COMPATIBLE", "MATCH", "VERSUS", "VS", "TO"]):
        target = found_groups[-1]
        sources = KNOWLEDGE["blood_compatibility"]["rules"].get(target, [])
        return ChatResponse(
            response=f"Tactical Analysis: Recipient {target} is compatible with donors from groups: {', '.join(sources)}. According to RedPulse protocol, these matches ensure zero-volatility clinical transitions.",
            intent="COMPATIBILITY_INTEL",
            confidence=0.99
        )
    elif len(found_groups) == 1:
         # Single blood group mentioned without specific question
         bg = found_groups[0]
         sources = KNOWLEDGE["blood_compatibility"]["rules"].get(bg, [])
         return ChatResponse(
            response=f"Signal Detected: Blood Group {bg}. Primary compatible donor sources: {', '.join(sources)}. Do you wish to initialize an emergency order for this unit?",
            intent="SIGNAL_LOCK",
            confidence=1.0
        )

    # 3. Tech Stack & Infrastructure (Single Keyword)
    if any(q in msg for q in ["MAP", "LEAFLET", "DARK", "CARTO", "SYNC", "REFRESH", "RELOAD", "INFRA"]):
        specs = KNOWLEDGE["tactical_specs"]
        return ChatResponse(
            response=f"System Architecture: We utilize {specs['map_engine']} for the Global Scanning Matrix. State synchronization is governed by a {specs['sync_protocol']} to maintain high-fidelity parity without browser interrupts.",
            intent="INFRASTRUCTURE_INTEL",
            confidence=0.95
        )

    # 4. Forecasting & Algorithms (Single Keyword)
    if any(q in msg for q in ["FORECAST", "FUTURE", "DEMAND", "PREDICT", "JITTER", "SURE", "EXPECT"]):
        logic = KNOWLEDGE["forecasting_logic"]
        return ChatResponse(
            response=f"Strategic Forecasting: Our engine implements a {logic['algorithm']} with a {logic['patterns']}. This includes {logic['jitters']} to simulate real-time ingestion telemetry.",
            intent="ALGORITHMIC_INTEL",
            confidence=0.96
        )

    # 5. Emergency Protocols (Single Keyword)
    if any(q in msg for q in ["PROTOCOL", "EMERGENCY", "BROADCAST", "SIGNAL", "HOW", "HELP"]):
        protocols = KNOWLEDGE["protocols"]
        return ChatResponse(
            response=f"Operational Protocol: {protocols['emergency_signal']}. All donor prioritization is computed via a {protocols['donor_scoring']} for maximum success rates.",
            intent="PROTOCOL_INTEL",
            confidence=0.97
        )

    # 6. Persona & Identity
    if any(q in msg for q in ["WHO", "WHAT", "YOU", "NAME", "KNOWLEDGE", "NEXUS"]):
        p = KNOWLEDGE["intelligence_persona"]
        return ChatResponse(
            response=f"Identity confirmed. I am the {p['name']}. My mission is {p['mission']} I operate in the {KNOWLEDGE['sector']} with {p['tone']} protocols.",
            intent="IDENTITY_INTEL",
            confidence=1.0
        )

    # Catch-all Strategic Response
    return ChatResponse(
        response="Telemetry inconclusive. I am standing by for tactical queries regarding RedPulse system architecture, clinical compatibility (e.g. 'O-'), or forecasting algorithms. Please refine your signal.",
        intent="STANDBY",
        confidence=1.0
    )
