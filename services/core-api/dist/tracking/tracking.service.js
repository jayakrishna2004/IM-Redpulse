"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const database_module_1 = require("../database/database.module");
const notifications_service_1 = require("../notifications/notifications.service");
let TrackingService = class TrackingService {
    db;
    notificationsService;
    constructor(db, notificationsService) {
        this.db = db;
        this.notificationsService = notificationsService;
    }
    async updateDonorLocation(requestId, donorUserId, lat, lng) {
        const tsRes = await this.db.query(`SELECT ts.*, d.id as donor_id
       FROM tracking_sessions ts
       JOIN donors d ON ts.donor_id = d.id
       WHERE ts.request_id = $1 AND d.user_id = $2 AND ts.completed_at IS NULL`, [requestId, donorUserId]);
        if (!tsRes.rows.length)
            return null;
        const session = tsRes.rows[0];
        const distKm = this.haversineDistance(lat, lng, session.hospital_lat, session.hospital_lng);
        const etaSec = Math.round((distKm / 30) * 3600);
        await this.db.query(`UPDATE tracking_sessions SET donor_lat=$1, donor_lng=$2, eta_seconds=$3, distance_remaining_km=$4
       WHERE id=$5`, [lat, lng, etaSec, distKm, session.id]);
        await this.db.query(`UPDATE donors SET lat=$1, lng=$2, last_seen_at=NOW() WHERE id=$3`, [lat, lng, session.donor_id]);
        this.notificationsService.broadcastTracking(requestId, {
            donorId: session.donor_id,
            lat, lng,
            etaSeconds: etaSec,
            distanceRemainingKm: Math.round(distKm * 100) / 100,
        });
        return { etaSeconds: etaSec, distanceRemainingKm: distKm };
    }
    async getTrackingSession(requestId) {
        const res = await this.db.query(`SELECT ts.*, u.name as donor_name, d.blood_group
       FROM tracking_sessions ts
       JOIN donors d ON ts.donor_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE ts.request_id = $1 AND ts.completed_at IS NULL`, [requestId]);
        return res.rows[0] || null;
    }
    async completeTracking(requestId) {
        await this.db.query(`UPDATE tracking_sessions SET completed_at=NOW() WHERE request_id=$1`, [requestId]);
        await this.db.query(`UPDATE requests SET status='FULFILLED', fulfilled_at=NOW() WHERE id=$1`, [requestId]);
        this.notificationsService.broadcastRequestUpdate(requestId, 'FULFILLED', null);
    }
    haversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    toRad(deg) { return (deg * Math.PI) / 180; }
};
exports.TrackingService = TrackingService;
exports.TrackingService = TrackingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DATABASE_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool,
        notifications_service_1.NotificationsService])
], TrackingService);
//# sourceMappingURL=tracking.service.js.map