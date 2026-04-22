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
exports.RequestsService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const database_module_1 = require("../database/database.module");
const matching_service_1 = require("../matching/matching.service");
const donors_service_1 = require("../donors/donors.service");
const notifications_service_1 = require("../notifications/notifications.service");
let RequestsService = class RequestsService {
    db;
    matchingService;
    donorsService;
    notificationsService;
    constructor(db, matchingService, donorsService, notificationsService) {
        this.db = db;
        this.matchingService = matchingService;
        this.donorsService = donorsService;
        this.notificationsService = notificationsService;
    }
    async createRequest(dto) {
        const hospitalQuery = await this.db.query('SELECT * FROM hospitals WHERE id=$1', [dto.hospitalId]);
        if (!hospitalQuery.rows.length)
            throw new common_1.NotFoundException('Hospital not found');
        const hospital = hospitalQuery.rows[0];
        const requestedUnits = dto.unitsNeeded ?? 1;
        let bloodStock = hospital.blood_stock;
        if (typeof bloodStock === 'string') {
            try {
                bloodStock = JSON.parse(bloodStock);
            }
            catch (e) {
                bloodStock = {};
            }
        }
        bloodStock = bloodStock || {};
        const hasInternalStock = (bloodStock[dto.bloodGroup] || 0) >= requestedUnits;
        if (hasInternalStock) {
            const finalNotes = `(Fulfilled internally from hospital stock)\n${dto.notes || ''}`;
            const res = await this.db.query(`INSERT INTO requests (hospital_id, blood_group, urgency, lat, lng, units_needed, notes, status, fulfilled_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [
                dto.hospitalId, dto.bloodGroup, dto.urgency, dto.lat, dto.lng, requestedUnits, finalNotes, 'FULFILLED', new Date()
            ]);
            const request = res.rows[0];
            bloodStock[dto.bloodGroup] -= requestedUnits;
            await this.db.query('UPDATE hospitals SET blood_stock=$1 WHERE id=$2', [JSON.stringify(bloodStock), dto.hospitalId]);
            this.notificationsService.broadcastBloodStock(dto.hospitalId, bloodStock);
            this.notificationsService.broadcastRequestUpdate(request.id, 'FULFILLED', null);
            this.notificationsService.notifyRequester({
                hospitalName: hospital.name,
                bloodGroup: dto.bloodGroup,
                urgency: dto.urgency,
                isInStock: true,
                phone: hospital.phone || null,
            });
            return request;
        }
        const res = await this.db.query(`INSERT INTO requests (hospital_id, blood_group, urgency, lat, lng, units_needed, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [dto.hospitalId, dto.bloodGroup, dto.urgency, dto.lat, dto.lng, requestedUnits, dto.notes, 'MATCHING']);
        const request = res.rows[0];
        this.matchingService.startMatching(request.id, dto.lat, dto.lng, dto.bloodGroup, dto.urgency, hospital.name);
        this.notificationsService.notifyRequester({
            hospitalName: hospital.name,
            bloodGroup: dto.bloodGroup,
            urgency: dto.urgency,
            isInStock: false,
            phone: hospital.phone || null,
        });
        return request;
    }
    async fulfillInternally(requestId, hospitalId, bloodGroup, units) {
        const hospitalQuery = await this.db.query('SELECT blood_stock FROM hospitals WHERE id=$1', [hospitalId]);
        let bloodStock = hospitalQuery.rows[0]?.blood_stock || {};
        if (typeof bloodStock === 'string')
            bloodStock = JSON.parse(bloodStock);
        if ((bloodStock[bloodGroup] || 0) < units)
            return false;
        bloodStock[bloodGroup] -= units;
        await this.db.query('UPDATE hospitals SET blood_stock=$1 WHERE id=$2', [JSON.stringify(bloodStock), hospitalId]);
        await this.db.query(`UPDATE requests SET status='FULFILLED', fulfilled_at=NOW(), 
              notes=COALESCE(notes, '') || '\n(Reactive fulfillment from manual stock update)'
       WHERE id=$1`, [requestId]);
        this.notificationsService.broadcastBloodStock(hospitalId, bloodStock);
        this.notificationsService.broadcastRequestUpdate(requestId, 'FULFILLED', null);
        return true;
    }
    async getAll(filters) {
        let query = `
      SELECT r.*, h.name as hospital_name, h.lat as hospital_lat, h.lng as hospital_lng,
             u.name as donor_name
      FROM requests r
      JOIN hospitals h ON r.hospital_id = h.id
      LEFT JOIN donors d ON r.matched_donor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
    `;
        const params = [];
        const conditions = [];
        if (filters?.status) {
            conditions.push(`r.status = $${params.length + 1}`);
            params.push(filters.status);
        }
        if (filters?.hospitalId) {
            conditions.push(`r.hospital_id = $${params.length + 1}`);
            params.push(filters.hospitalId);
        }
        if (conditions.length)
            query += ` WHERE ${conditions.join(' AND ')}`;
        query += ' ORDER BY r.created_at DESC';
        const res = await this.db.query(query, params);
        return res.rows;
    }
    async getById(id) {
        const res = await this.db.query(`SELECT r.*, h.name as hospital_name,
              d.blood_group as donor_blood_group, u.name as donor_name, u.phone as donor_phone
       FROM requests r
       JOIN hospitals h ON r.hospital_id = h.id
       LEFT JOIN donors d ON r.matched_donor_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE r.id = $1`, [id]);
        if (!res.rows.length)
            throw new common_1.NotFoundException('Request not found');
        return res.rows[0];
    }
    async respondToRequest(requestId, donorUserId, action) {
        const donorRes = await this.db.query('SELECT * FROM donors WHERE user_id=$1', [donorUserId]);
        if (!donorRes.rows.length)
            throw new common_1.BadRequestException('Donor profile not found');
        const donor = donorRes.rows[0];
        const notifRes = await this.db.query(`SELECT *, EXTRACT(EPOCH FROM (NOW() - notified_at)) as elapsed_seconds
       FROM donor_responses WHERE request_id=$1 AND donor_id=$2`, [requestId, donor.id]);
        if (!notifRes.rows.length)
            throw new common_1.BadRequestException('You were not notified for this request');
        if (notifRes.rows[0].action !== 'PENDING')
            throw new common_1.BadRequestException('Already responded');
        const elapsed = parseFloat(notifRes.rows[0].elapsed_seconds);
        await this.donorsService.recordResponse(donor.id, requestId, action, elapsed);
        if (action === 'ACCEPTED') {
            const request = await this.getById(requestId);
            if (request.status !== 'MATCHING' && request.status !== 'PENDING') {
                throw new common_1.BadRequestException('Request is no longer available');
            }
            await this.matchingService.acceptRequest(requestId, donor.id);
            const requestData = await this.db.query('SELECT * FROM requests WHERE id=$1', [requestId]);
            const req = requestData.rows[0];
            await this.db.query(`INSERT INTO tracking_sessions (request_id, donor_id, donor_lat, donor_lng, hospital_lat, hospital_lng)
         VALUES ($1,$2,$3,$4,$5,$6)`, [requestId, donor.id, donor.lat, donor.lng, req.lat, req.lng]);
        }
        return { success: true, action, requestId, donorId: donor.id };
    }
    async cancelRequest(id) {
        this.matchingService.cancelMatching(id);
        await this.db.query(`UPDATE requests SET status='CANCELLED' WHERE id=$1`, [id]);
        this.notificationsService.broadcastRequestUpdate(id, 'CANCELLED', null);
        return { success: true };
    }
    async getDonorResponsesForRequest(requestId) {
        const res = await this.db.query(`SELECT dr.*, u.name, d.blood_group, d.ai_score,
              ST_Distance(d.location, r.location) / 1000 as distance_km
       FROM donor_responses dr
       JOIN donors d ON dr.donor_id = d.id
       JOIN users u ON d.user_id = u.id
       JOIN requests r ON dr.request_id = r.id
       WHERE dr.request_id = $1
       ORDER BY d.ai_score DESC`, [requestId]);
        return res.rows;
    }
};
exports.RequestsService = RequestsService;
exports.RequestsService = RequestsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DATABASE_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool,
        matching_service_1.MatchingService,
        donors_service_1.DonorsService,
        notifications_service_1.NotificationsService])
], RequestsService);
//# sourceMappingURL=requests.service.js.map