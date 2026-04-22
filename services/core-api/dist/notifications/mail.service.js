"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_ses_1 = require("@aws-sdk/client-ses");
const nodemailer = __importStar(require("nodemailer"));
const axios_1 = __importDefault(require("axios"));
let MailService = MailService_1 = class MailService {
    configService;
    logger = new common_1.Logger(MailService_1.name);
    transporter = null;
    sesClient = null;
    hubUrl = null;
    constructor(configService) {
        this.configService = configService;
        const sesAccessKey = this.configService.get('SES_ACCESS_KEY');
        const sesSecretKey = this.configService.get('SES_SECRET_KEY');
        const sesRegion = this.configService.get('SES_REGION', 'us-east-1');
        this.hubUrl = this.configService.get('EXTERNAL_HUB_URL') || null;
        if (this.hubUrl) {
            this.logger.log(`📧 Initializing External Hub Mode: ${this.hubUrl}`);
        }
        else if (sesAccessKey && sesSecretKey) {
            this.logger.log('📧 Initializing Native AWS SES Client');
            this.sesClient = new client_ses_1.SESClient({
                region: sesRegion,
                credentials: {
                    accessKeyId: sesAccessKey,
                    secretAccessKey: sesSecretKey,
                },
            });
        }
        else {
            this.logger.log('📧 SES Keys missing. Initializing Mock/Ethereal SMTP fallback');
            this.transporter = nodemailer.createTransport({
                host: this.configService.get('SMTP_HOST', 'smtp.ethereal.email'),
                port: this.configService.get('SMTP_PORT', 587),
                auth: {
                    user: this.configService.get('SMTP_USER', 'mock-user'),
                    pass: this.configService.get('SMTP_PASS', 'mock-pass'),
                },
            });
        }
    }
    normalizePhone(phone) {
        const cleaned = phone.replace(/[^\d+]/g, '');
        if (cleaned.startsWith('+'))
            return cleaned;
        if (cleaned.length === 10)
            return `+91${cleaned}`;
        return cleaned;
    }
    normalizeEmail(email) {
        return email.trim().toLowerCase();
    }
    async sendEmergencyEmail(to, data) {
        const globalOverride = this.configService.get('SES_SANDBOX_OVERRIDE_EMAIL');
        const emailWhitelist = this.configService.get('EMAIL_WHITELIST', '').split(',').map(e => this.normalizeEmail(e.trim()));
        let actualRecipient = data.overrideEmail || globalOverride || to;
        actualRecipient = this.normalizeEmail(actualRecipient);
        const isOverridden = actualRecipient !== this.normalizeEmail(to);
        const isInWhitelist = emailWhitelist.includes(actualRecipient) || emailWhitelist.includes('*');
        if (emailWhitelist[0] !== '' && !isInWhitelist) {
            this.logger.warn(`[MAIL] Skipped: ${actualRecipient} is not in the Verified Email Whitelist.`);
            return;
        }
        const from = this.configService.get('MAIL_FROM', 'notifications@redpulse.local');
        const subject = `${isOverridden ? '[TEST] ' : ''}❗ EMERGENCY: ${data.bloodGroup} Needed at ${data.hospitalName}`;
        const html = `
      <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        ${isOverridden ? `<div style="background: #fff4e5; border: 1px solid #ff9800; padding: 10px; margin-bottom: 15px; font-size: 11px; border-radius: 6px;">
          <strong>VERIFIED TEST MODE</strong>: This alert was originally intended for <strong>${to}</strong>.
        </div>` : ''}
        <h2 style="color: #ff1a3c;">🚨 URGENT BLOOD REQUEST</h2>
        <p>This is a critical alert from <strong>RedPulse</strong>.</p>
        <div style="background: #fdf2f2; padding: 15px; border-left: 4px solid #ff1a3c; margin: 20px 0;">
          <p><strong>Hospital:</strong> ${data.hospitalName}</p>
          <p><strong>Blood Group Required:</strong> <span style="font-size: 1.2em; color: #ff1a3c;">${data.bloodGroup}</span></p>
          <p><strong>Urgency:</strong> ${data.urgency}</p>
          <p><strong>Distance:</strong> ${data.distanceKm > 0 ? `${data.distanceKm.toFixed(1)} km` : 'Immediate'}</p>
        </div>
        <p>A life is at stake. Please check the RedPulse mobile app immediately.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8em; color: #666;">Request ID: ${data.requestId}</p>
      </div>
    `;
        try {
            this.logger.log(`[NOTIF] Dispatching Email to ${actualRecipient}...`);
            if (this.hubUrl) {
                const hubPayload = {
                    email: actualRecipient,
                    subject: subject,
                    message: `RedPulse Emergency: ${data.bloodGroup} needed at ${data.hospitalName}.`,
                };
                const res = await axios_1.default.post(this.hubUrl, hubPayload);
                this.logger.log(`[MAIL] Success via Hub: ${res.data?.id || 'OK'}`);
            }
            else if (this.sesClient) {
                const command = new client_ses_1.SendEmailCommand({
                    Destination: { ToAddresses: [actualRecipient] },
                    Message: {
                        Body: { Html: { Data: html, Charset: 'UTF-8' } },
                        Subject: { Data: subject, Charset: 'UTF-8' },
                    },
                    Source: from,
                });
                await this.sesClient.send(command);
                this.logger.log(`[MAIL] Success via AWS SES`);
            }
            else if (this.transporter) {
                await this.transporter.sendMail({ from, to: actualRecipient, subject, html });
                this.logger.log(`[MAIL] Success via SMTP Mock`);
            }
        }
        catch (err) {
            const details = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            this.logger.error(`[MAIL] Failed to send to ${actualRecipient}: ${details}`);
        }
    }
    async sendEmergencySms(phone, message, overridePhone) {
        if (!this.hubUrl) {
            this.logger.warn(`[SMS] No hub URL configured. Skipping delivery.`);
            return;
        }
        const normalizedOriginal = this.normalizePhone(phone);
        const globalOverride = this.configService.get('SES_SANDBOX_OVERRIDE_PHONE');
        const smsWhitelist = this.configService.get('SMS_WHITELIST', '').split(',').map(n => this.normalizePhone(n.trim()));
        let actualRecipient = overridePhone || globalOverride || normalizedOriginal;
        actualRecipient = this.normalizePhone(actualRecipient);
        const isOverridden = actualRecipient !== normalizedOriginal;
        const isInWhitelist = smsWhitelist.includes(actualRecipient) || smsWhitelist.includes('*');
        if (smsWhitelist[0] !== '' && !isInWhitelist) {
            this.logger.warn(`[SMS] Skipped: ${actualRecipient} is not in the Verified SMS Whitelist.`);
            return;
        }
        try {
            this.logger.log(`[NOTIF] Dispatching SMS to ${actualRecipient}${isOverridden ? ` (Override for ${normalizedOriginal})` : ''}...`);
            const hubPayload = {
                phone: actualRecipient,
                message: message,
            };
            const res = await axios_1.default.post(this.hubUrl, hubPayload);
            this.logger.log(`[SMS] Success: Sent to ${actualRecipient} | Hub ID: ${res.data?.id || 'OK'}`);
        }
        catch (err) {
            const details = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            this.logger.error(`[SMS] Failed to send to ${actualRecipient}: ${details}`);
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MailService);
//# sourceMappingURL=mail.service.js.map