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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const notifications_gateway_1 = require("./notifications.gateway");
const mail_service_1 = require("./mail.service");
const pg_1 = require("pg");
const database_module_1 = require("../database/database.module");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    gateway;
    mailService;
    configService;
    db;
    logger = new common_1.Logger(NotificationsService_1.name);
    constructor(gateway, mailService, configService, db) {
        this.gateway = gateway;
        this.mailService = mailService;
        this.configService = configService;
        this.db = db;
    }
    async notifyDonor(donorId, payload) {
        this.logger.log(`📲 Notifying donor ${donorId}: ${payload.urgency} ${payload.bloodGroup} request`);
        let overrideEmail;
        let overridePhone;
        try {
            const res = await this.db.query(`SELECT h.test_email, h.test_phone FROM hospitals h 
         JOIN requests r ON r.hospital_id = h.id 
         WHERE r.id = $1`, [payload.requestId]);
            if (res.rows[0]) {
                overrideEmail = res.rows[0].test_email;
                overridePhone = res.rows[0].test_phone;
            }
        }
        catch (e) {
            this.logger.warn(`Could not fetch hospital overrides: ${e.message}`);
        }
        const donorEmail = payload.email || `donor_${donorId.split('-')[0]}@redpulse.local`;
        const donorPhone = payload.phone;
        this.mailService.sendEmergencyEmail(donorEmail, {
            hospitalName: payload.hospitalName,
            bloodGroup: payload.bloodGroup,
            urgency: payload.urgency,
            distanceKm: payload.distanceKm,
            requestId: payload.requestId,
            overrideEmail,
        }).catch(e => this.logger.error(`[MAIL] Background delivery failed: ${e.message}`));
        if (donorPhone) {
            const smsMsg = `🚨 REDPULSE: ${payload.bloodGroup} needed at ${payload.hospitalName} (${payload.distanceKm}km). Check app now!`;
            this.mailService.sendEmergencySms(donorPhone, smsMsg, overridePhone).catch(e => this.logger.error(`[SMS] Background delivery failed: ${e.message}`));
        }
        this.gateway.server?.to(`donor:${donorId}`).emit('emergency_alert', {
            ...payload,
            timestamp: new Date().toISOString(),
        });
    }
    async notifyRequester(payload) {
        this.logger.log(`📢 Notifying requester: ${payload.hospitalName} for ${payload.bloodGroup} | InStock: ${payload.isInStock}`);
        this.gateway.server?.to('dashboard').emit('request_alert', {
            ...payload,
            timestamp: new Date().toISOString(),
        });
        const hospitalEmail = payload.email || this.configService.get('MAIL_FROM');
        const hospitalPhone = payload.phone;
        if (hospitalEmail) {
            this.mailService.sendEmergencyEmail(hospitalEmail, {
                hospitalName: payload.hospitalName,
                bloodGroup: payload.bloodGroup,
                urgency: payload.urgency,
                distanceKm: 0,
                requestId: 'REQUESTER_CONFIRMATION'
            }).catch(e => this.logger.error(`[MAIL] Requester delivery failed: ${e.message}`));
        }
        if (hospitalPhone) {
            const smsMsg = `🚨 REDPULSE: Your emergency request for ${payload.bloodGroup} at ${payload.hospitalName} has been triggered. Searching for nearby donors...`;
            this.mailService.sendEmergencySms(hospitalPhone, smsMsg).catch(e => this.logger.error(`[SMS] Requester delivery failed: ${e.message}`));
        }
    }
    broadcastRequestUpdate(requestId, status, data) {
        this.gateway.server?.to('dashboard').emit('request_update', {
            requestId,
            status,
            data,
            timestamp: new Date().toISOString(),
        });
    }
    broadcastToDonors(donorIds, requestId, eventType) {
        donorIds.forEach(donorId => {
            this.gateway.server?.to(`donor:${donorId}`).emit(eventType, { requestId });
        });
    }
    broadcastTracking(requestId, trackingData) {
        this.gateway.server?.to(`request:${requestId}`).emit('tracking_update', {
            ...trackingData,
            timestamp: new Date().toISOString(),
        });
        this.gateway.server?.to('dashboard').emit('tracking_update', {
            ...trackingData,
            requestId,
            timestamp: new Date().toISOString(),
        });
    }
    broadcastBloodStock(hospitalId, stock) {
        this.gateway.server?.to('dashboard').emit('blood_stock_update', { hospitalId, stock });
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)(database_module_1.DATABASE_POOL)),
    __metadata("design:paramtypes", [notifications_gateway_1.NotificationsGateway,
        mail_service_1.MailService,
        config_1.ConfigService,
        pg_1.Pool])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map