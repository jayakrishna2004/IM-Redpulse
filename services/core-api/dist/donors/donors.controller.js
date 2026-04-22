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
exports.DonorsController = exports.UpdateAvailabilityDto = exports.UpdateLocationDto = void 0;
const common_1 = require("@nestjs/common");
const donors_service_1 = require("./donors.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class UpdateLocationDto {
    lat;
    lng;
}
exports.UpdateLocationDto = UpdateLocationDto;
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateLocationDto.prototype, "lat", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateLocationDto.prototype, "lng", void 0);
class UpdateAvailabilityDto {
    status;
}
exports.UpdateAvailabilityDto = UpdateAvailabilityDto;
__decorate([
    (0, class_validator_1.IsIn)(['ACTIVE', 'INACTIVE']),
    __metadata("design:type", String)
], UpdateAvailabilityDto.prototype, "status", void 0);
let DonorsController = class DonorsController {
    donorsService;
    constructor(donorsService) {
        this.donorsService = donorsService;
    }
    findAll() {
        return this.donorsService.findAll();
    }
    getMe(req) {
        return this.donorsService.findByUserId(req.user.id);
    }
    getHistory(req) {
        return this.donorsService.getDonationHistory(req.user.id);
    }
    findOne(id) {
        return this.donorsService.findById(id);
    }
    updateLocation(req, dto) {
        return this.donorsService.updateLocation(req.user.id, dto.lat, dto.lng);
    }
    updateAvailability(req, dto) {
        return this.donorsService.updateAvailability(req.user.id, dto.status);
    }
};
exports.DonorsController = DonorsController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all donors with scores' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DonorsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current donor profile' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DonorsController.prototype, "getMe", null);
__decorate([
    (0, common_1.Get)('me/history'),
    (0, swagger_1.ApiOperation)({ summary: 'Get donation history' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DonorsController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get donor by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DonorsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)('location'),
    (0, swagger_1.ApiOperation)({ summary: 'Update donor GPS location' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateLocationDto]),
    __metadata("design:returntype", void 0)
], DonorsController.prototype, "updateLocation", null);
__decorate([
    (0, common_1.Patch)('availability'),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle donor availability (ACTIVE/INACTIVE)' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, UpdateAvailabilityDto]),
    __metadata("design:returntype", void 0)
], DonorsController.prototype, "updateAvailability", null);
exports.DonorsController = DonorsController = __decorate([
    (0, swagger_1.ApiTags)('Donors'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('donors'),
    __metadata("design:paramtypes", [donors_service_1.DonorsService])
], DonorsController);
//# sourceMappingURL=donors.controller.js.map