import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private sesClient: SESClient | null = null;
  private hubUrl: string | null = null;

  constructor(private configService: ConfigService) {
    const sesAccessKey = this.configService.get<string>('SES_ACCESS_KEY');
    const sesSecretKey = this.configService.get<string>('SES_SECRET_KEY');
    const sesRegion = this.configService.get<string>('SES_REGION', 'us-east-1');
    this.hubUrl = this.configService.get<string>('EXTERNAL_HUB_URL') || null;

    if (this.hubUrl) {
      this.logger.log(`📧 Initializing External Hub Mode: ${this.hubUrl}`);
    } else if (sesAccessKey && sesSecretKey) {
      this.logger.log('📧 Initializing Native AWS SES Client');
      this.sesClient = new SESClient({
        region: sesRegion,
        credentials: {
          accessKeyId: sesAccessKey,
          secretAccessKey: sesSecretKey,
        },
      });
    } else {
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

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    // Assume India (+91) if 10 digits
    if (cleaned.length === 10) return `+91${cleaned}`;
    return cleaned;
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async sendEmergencyEmail(to: string, data: {
    hospitalName: string;
    bloodGroup: string;
    urgency: string;
    distanceKm: number;
    requestId: string;
    overrideEmail?: string;
  }) {
    const globalOverride = this.configService.get<string>('SES_SANDBOX_OVERRIDE_EMAIL');
    const emailWhitelist = this.configService.get<string>('EMAIL_WHITELIST', '').split(',').map(e => this.normalizeEmail(e.trim()));
    
    // Priority: Per-request override > Global .env override > Original recipient
    let actualRecipient = data.overrideEmail || globalOverride || to;
    actualRecipient = this.normalizeEmail(actualRecipient);
    
    const isOverridden = actualRecipient !== this.normalizeEmail(to);

    // Whitelist Filter
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
        const res = await axios.post(this.hubUrl, hubPayload);
        this.logger.log(`[MAIL] Success via Hub: ${res.data?.id || 'OK'}`);
      } else if (this.sesClient) {
        const command = new SendEmailCommand({
          Destination: { ToAddresses: [actualRecipient] },
          Message: {
            Body: { Html: { Data: html, Charset: 'UTF-8' } },
            Subject: { Data: subject, Charset: 'UTF-8' },
          },
          Source: from,
        });
        await this.sesClient.send(command);
        this.logger.log(`[MAIL] Success via AWS SES`);
      } else if (this.transporter) {
        await this.transporter.sendMail({ from, to: actualRecipient, subject, html });
        this.logger.log(`[MAIL] Success via SMTP Mock`);
      }
    } catch (err) {
      const details = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      this.logger.error(`[MAIL] Failed to send to ${actualRecipient}: ${details}`);
    }
  }

  async sendEmergencySms(phone: string, message: string, overridePhone?: string) {
    if (!this.hubUrl) {
      this.logger.warn(`[SMS] No hub URL configured. Skipping delivery.`);
      return;
    }

    const normalizedOriginal = this.normalizePhone(phone);
    const globalOverride = this.configService.get<string>('SES_SANDBOX_OVERRIDE_PHONE');
    const smsWhitelist = this.configService.get<string>('SMS_WHITELIST', '').split(',').map(n => this.normalizePhone(n.trim()));
    
    // Priority: Per-request override > Global .env override > Original recipient
    let actualRecipient = overridePhone || globalOverride || normalizedOriginal;
    actualRecipient = this.normalizePhone(actualRecipient);

    const isOverridden = actualRecipient !== normalizedOriginal;

    // Whitelist Filter
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
      
      const res = await axios.post(this.hubUrl, hubPayload);
      this.logger.log(`[SMS] Success: Sent to ${actualRecipient} | Hub ID: ${res.data?.id || 'OK'}`);
    } catch (err) {
      const details = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      this.logger.error(`[SMS] Failed to send to ${actualRecipient}: ${details}`);
    }
  }
}
