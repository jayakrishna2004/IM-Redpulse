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
exports.HospitalsController = void 0;
const common_1 = require("@nestjs/common");
const hospitals_service_1 = require("./hospitals.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
let HospitalsController = class HospitalsController {
    hospitalsService;
    constructor(hospitalsService) {
        this.hospitalsService = hospitalsService;
    }
    findAll() {
        return this.hospitalsService.findAll();
    }
    getStats() {
        return this.hospitalsService.getStats();
    }
    getMe(req) {
        return this.hospitalsService.findByUserId(req.user.id);
    }
    async getDashboard(req) {
        const hospital = await this.hospitalsService.findByUserId(req.user.id);
        return this.hospitalsService.getDashboardData(hospital.id);
    }
    findOne(id) {
        return this.hospitalsService.findById(id);
    }
    getDashboardById(id) {
        return this.hospitalsService.getDashboardData(id);
    }
    updateStock(req, dto) {
        return this.hospitalsService.findByUserId(req.user.id)
            .then(h => this.hospitalsService.updateBloodStock(h.id, dto));
    }
    updateStockById(id, dto) {
        return this.hospitalsService.updateBloodStock(id, dto);
    }
    async updateVerifiedRecipients(req, dto) {
        try {
            console.log(`[HOSPITAL] Updating verified recipients for User: ${req.user.id}`);
            const hospital = await this.hospitalsService.findByUserId(req.user.id);
            if (!hospital) {
                console.error(`[HOSPITAL] Profile not found for User: ${req.user.id}`);
                throw new common_1.NotFoundException('Hospital profile not found');
            }
            return await this.hospitalsService.updateVerifiedRecipients(hospital.id, dto.testEmail, dto.testPhone);
        }
        catch (err) {
            console.error(`[HOSPITAL] Update failed: ${err.message}`);
            throw err;
        }
    }
};
exports.HospitalsController = HospitalsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all hospitals' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HospitalsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Platform-wide stats (active requests, donors, fulfillment rate)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HospitalsController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current hospital profile' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HospitalsController.prototype, "getMe", null);
__decorate([
    (0, common_1.Get)('me/dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Full dashboard data for current hospital' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HospitalsController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get hospital by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HospitalsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get hospital dashboard data' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], HospitalsController.prototype, "getDashboardById", null);
__decorate([
    (0, common_1.Patch)('me/blood-stock'),
    (0, swagger_1.ApiOperation)({ summary: 'Update hospital blood inventory' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HospitalsController.prototype, "updateStock", null);
__decorate([
    (0, common_1.Patch)(':id/blood-stock'),
    (0, swagger_1.ApiOperation)({ summary: 'Update specific hospital blood inventory via Command Center' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HospitalsController.prototype, "updateStockById", null);
__decorate([
    (0, common_1.Patch)('me/verified-recipients'),
    (0, swagger_1.ApiOperation)({ summary: 'Update hospital test verified recipients for development' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HospitalsController.prototype, "updateVerifiedRecipients", null);
exports.HospitalsController = HospitalsController = __decorate([
    (0, swagger_1.ApiTags)('Hospitals'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('hospitals'),
    __metadata("design:paramtypes", [hospitals_service_1.HospitalsService])
], HospitalsController);
//# sourceMappingURL=hospitals.controller.js.map