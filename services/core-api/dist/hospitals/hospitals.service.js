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
exports.HospitalsService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const database_module_1 = require("../database/database.module");
const notifications_service_1 = require("../notifications/notifications.service");
let HospitalsService = class HospitalsService {
    db;
    notificationsService;
    constructor(db, notificationsService) {
        this.db = db;
        this.notificationsService = notificationsService;
    }
    async findAll() {
        const res = await this.db.query('SELECT * FROM hospitals ORDER BY name');
        return res.rows;
    }
    async findById(id) {
        const res = await this.db.query('SELECT * FROM hospitals WHERE id=$1', [id]);
        return res.rows[0];
    }
    async findByUserId(userId) {
        const res = await this.db.query('SELECT * FROM hospitals WHERE user_id=$1', [userId]);
        return res.rows[0];
    }
    async getDashboardData(hospitalId) {
        const [hospital, activeRequests, recentResponses] = await Promise.all([
            this.db.query('SELECT * FROM hospitals WHERE id=$1', [hospitalId]),
            this.db.query(`SELECT r.*, u.name as donor_name, d.blood_group as donor_blood_group,
                ts.donor_lat, ts.donor_lng, ts.eta_seconds, ts.distance_remaining_km
         FROM requests r
         LEFT JOIN donors d ON r.matched_donor_id = d.id
         LEFT JOIN users u ON d.user_id = u.id
         LEFT JOIN tracking_sessions ts ON ts.request_id = r.id AND ts.completed_at IS NULL
         WHERE r.hospital_id = $1 AND r.status NOT IN ('FULFILLED','CANCELLED')
         ORDER BY r.created_at DESC`, [hospitalId]),
            this.db.query(`SELECT dr.*, u.name, d.blood_group, d.ai_score, d.lat, d.lng,
                r.urgency, r.blood_group as requested_blood_group
         FROM donor_responses dr
         JOIN donors d ON dr.donor_id = d.id
         JOIN users u ON d.user_id = u.id
         JOIN requests r ON dr.request_id = r.id
         WHERE r.hospital_id = $1
         ORDER BY dr.notified_at DESC LIMIT 20`, [hospitalId]),
        ]);
        return {
            hospital: hospital.rows[0],
            activeRequests: activeRequests.rows,
            recentResponses: recentResponses.rows,
        };
    }
    async updateBloodStock(hospitalId, stock) {
        await this.db.query('UPDATE hospitals SET blood_stock=$1 WHERE id=$2', [JSON.stringify(stock), hospitalId]);
        this.notificationsService.broadcastBloodStock(hospitalId, stock);
        const pendingRequests = await this.db.query(`SELECT id, blood_group, units_needed FROM requests 
         WHERE hospital_id=$1 AND status='MATCHING' AND blood_group = ANY($2::text[])
         ORDER BY created_at ASC`, [hospitalId, Object.keys(stock)]);
        let updatedStock = { ...stock };
        let stockChanged = false;
        for (const req of pendingRequests.rows) {
            const unitsNeeded = req.units_needed || 1;
            if ((updatedStock[req.blood_group] || 0) >= unitsNeeded) {
                updatedStock[req.blood_group] -= unitsNeeded;
                stockChanged = true;
                await this.db.query(`UPDATE requests SET status='FULFILLED', fulfilled_at=NOW(), 
                        notes=COALESCE(notes, '') || '\n(Auto-fulfilled from manual stock replenishment)'
                 WHERE id=$1`, [req.id]);
                this.notificationsService.broadcastRequestUpdate(req.id, 'FULFILLED', null);
            }
        }
        if (stockChanged) {
            await this.db.query('UPDATE hospitals SET blood_stock=$1 WHERE id=$2', [JSON.stringify(updatedStock), hospitalId]);
            this.notificationsService.broadcastBloodStock(hospitalId, updatedStock);
            return { success: true, stock: updatedStock, autoFulfilled: true };
        }
        return { success: true, stock };
    }
    async getStats() {
        const res = await this.db.query(`
      SELECT
        (SELECT COUNT(*) FROM requests WHERE status = 'FULFILLED' AND created_at > NOW() - INTERVAL '24 hours') as fulfilled_today,
        (SELECT COUNT(*) FROM requests WHERE status NOT IN ('FULFILLED','CANCELLED')) as active_requests,
        (SELECT COUNT(*) FROM donors WHERE status = 'ACTIVE') as active_donors,
        (SELECT AVG(EXTRACT(EPOCH FROM (fulfilled_at - created_at))/60) 
         FROM requests WHERE fulfilled_at IS NOT NULL AND status='FULFILLED' AND created_at > NOW() - INTERVAL '24 hours') as avg_fulfillment_minutes
    `);
        return res.rows[0];
    }
    async updateVerifiedRecipients(hospitalId, testEmail, testPhone) {
        await this.db.query('UPDATE hospitals SET test_email=$1, test_phone=$2, updated_at=NOW() WHERE id=$3', [testEmail, testPhone, hospitalId]);
        return { success: true };
    }
};
exports.HospitalsService = HospitalsService;
exports.HospitalsService = HospitalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DATABASE_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool,
        notifications_service_1.NotificationsService])
], HospitalsService);
//# sourceMappingURL=hospitals.service.js.map