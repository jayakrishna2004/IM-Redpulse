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
var MatchingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const database_module_1 = require("../database/database.module");
const donors_service_1 = require("../donors/donors.service");
const notifications_service_1 = require("../notifications/notifications.service");
const scoring_engine_1 = require("./scoring.engine");
const config_1 = require("@nestjs/config");
let MatchingService = MatchingService_1 = class MatchingService {
    db;
    donorsService;
    notificationsService;
    config;
    logger = new common_1.Logger(MatchingService_1.name);
    activeJobs = new Map();
    constructor(db, donorsService, notificationsService, config) {
        this.db = db;
        this.donorsService = donorsService;
        this.notificationsService = notificationsService;
        this.config = config;
    }
    async startMatching(requestId, lat, lng, bloodGroup, urgency, hospitalName) {
        const initialRadius = parseFloat(this.config.get('INITIAL_RADIUS_KM', '3'));
        const job = {
            requestId, lat, lng, bloodGroup, urgency, hospitalName,
            currentRadius: initialRadius,
            notifiedDonorIds: new Set(),
        };
        this.activeJobs.set(requestId, job);
        this.logger.log(`🔴 Starting matching for request ${requestId} | Blood: ${bloodGroup} | Urgency: ${urgency}`);
        await this.runMatchingRound(job);
    }
    async runMatchingRound(job) {
        const maxRadius = parseFloat(this.config.get('MAX_RADIUS_KM', '20'));
        if (job.currentRadius > maxRadius) {
            this.logger.warn(`⚠️ Max radius reached for request ${job.requestId}. No donors found.`);
            await this.db.query(`UPDATE requests SET status='CANCELLED', notes='No donors found within ${maxRadius}km' WHERE id=$1`, [job.requestId]);
            this.activeJobs.delete(job.requestId);
            this.notificationsService.broadcastRequestUpdate(job.requestId, 'CANCELLED', null);
            return;
        }
        this.logger.log(`📡 Scanning ${job.currentRadius}km radius for ${job.bloodGroup} donors...`);
        const compatibleGroups = (0, scoring_engine_1.getCompatibleDonorGroups)(job.bloodGroup);
        const donors = await this.donorsService.getEligibleDonorsInRadius(job.lat, job.lng, job.currentRadius, compatibleGroups);
        const newDonors = donors.filter(d => !job.notifiedDonorIds.has(d.id));
        if (newDonors.length === 0) {
            this.logger.log(`No new donors at ${job.currentRadius}km. Expanding...`);
            await this.expandRadius(job);
            return;
        }
        const scored = newDonors
            .map(d => ({
            ...d,
            computedScore: (0, scoring_engine_1.scoreDonor)(d, job.currentRadius),
        }))
            .sort((a, b) => b.computedScore - a.computedScore);
        const topN = parseInt(this.config.get('TOP_DONORS_PER_BATCH', '5'));
        const topDonors = scored.slice(0, topN);
        this.logger.log(`🎯 Top ${topDonors.length} donors selected (out of ${newDonors.length}):`);
        topDonors.forEach(d => this.logger.log(`  → ${d.name} | ${d.blood_group} | ${d.distance_km?.toFixed(2)}km | score: ${d.computedScore}`));
        for (const donor of topDonors) {
            job.notifiedDonorIds.add(donor.id);
            await this.db.query(`INSERT INTO donor_responses (request_id, donor_id, action, notified_radius_km)
         VALUES ($1, $2, 'PENDING', $3)
         ON CONFLICT (request_id, donor_id) DO NOTHING`, [job.requestId, donor.id, job.currentRadius]);
        }
        await this.db.query(`UPDATE requests SET status='MATCHING', current_radius_km=$1 WHERE id=$2`, [job.currentRadius, job.requestId]);
        for (const donor of topDonors) {
            this.notificationsService.notifyDonor(donor.id, {
                type: 'EMERGENCY_REQUEST',
                requestId: job.requestId,
                bloodGroup: job.bloodGroup,
                urgency: job.urgency,
                hospitalName: job.hospitalName,
                distanceKm: parseFloat(donor.distance_km?.toFixed(1)),
                score: donor.computedScore,
                lat: job.lat,
                lng: job.lng,
                email: donor.email,
                phone: donor.phone,
            });
        }
        this.notificationsService.broadcastRequestUpdate(job.requestId, 'MATCHING', {
            radius: job.currentRadius,
            donorsNotified: job.notifiedDonorIds.size,
            topDonors: topDonors.map(d => ({ id: d.id, name: d.name, distanceKm: d.distance_km, score: d.computedScore })),
        });
        const expandMs = parseInt(this.config.get('EXPANSION_INTERVAL_MS', '120000'));
        job.timer = setTimeout(() => this.expandRadius(job), expandMs);
    }
    async expandRadius(job) {
        const expansionKm = parseFloat(this.config.get('RADIUS_EXPANSION_KM', '2'));
        job.currentRadius += expansionKm;
        this.logger.log(`🔄 Expanding radius to ${job.currentRadius}km for request ${job.requestId}`);
        await this.runMatchingRound(job);
    }
    async acceptRequest(requestId, donorId) {
        const job = this.activeJobs.get(requestId);
        if (!job)
            return;
        if (job.timer)
            clearTimeout(job.timer);
        this.activeJobs.delete(requestId);
        this.logger.log(`✅ Donor ${donorId} accepted request ${requestId}`);
        await this.db.query(`UPDATE requests SET status='MATCHED', matched_donor_id=$1 WHERE id=$2`, [donorId, requestId]);
        this.notificationsService.broadcastRequestUpdate(requestId, 'MATCHED', { donorId });
        this.notificationsService.broadcastToDonors(job.notifiedDonorIds, requestId, 'REQUEST_FILLED');
    }
    cancelMatching(requestId) {
        const job = this.activeJobs.get(requestId);
        if (job?.timer)
            clearTimeout(job.timer);
        this.activeJobs.delete(requestId);
    }
    getActiveJobs() {
        return Array.from(this.activeJobs.entries()).map(([id, job]) => ({
            requestId: id,
            currentRadius: job.currentRadius,
            notifiedCount: job.notifiedDonorIds.size,
        }));
    }
};
exports.MatchingService = MatchingService;
exports.MatchingService = MatchingService = MatchingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DATABASE_POOL)),
    __metadata("design:paramtypes", [pg_1.Pool,
        donors_service_1.DonorsService,
        notifications_service_1.NotificationsService,
        config_1.ConfigService])
], MatchingService);
//# sourceMappingURL=matching.service.js.map