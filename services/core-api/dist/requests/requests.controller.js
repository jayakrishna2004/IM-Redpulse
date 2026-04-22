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
var RequestsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestsController = exports.RespondDto = exports.CreateRequestDto = void 0;
const common_1 = require("@nestjs/common");
const requests_service_1 = require("./requests.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
class CreateRequestDto {
    hospitalId;
    bloodGroup;
    urgency;
    lat;
    lng;
    unitsNeeded;
    notes;
}
exports.CreateRequestDto = CreateRequestDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'Hospital ID must be a valid string.' }),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "hospitalId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "bloodGroup", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "urgency", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateRequestDto.prototype, "lat", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateRequestDto.prototype, "lng", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateRequestDto.prototype, "unitsNeeded", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateRequestDto.prototype, "notes", void 0);
class RespondDto {
    action;
}
exports.RespondDto = RespondDto;
__decorate([
    (0, class_validator_1.IsIn)(['ACCEPTED', 'REJECTED']),
    __metadata("design:type", String)
], RespondDto.prototype, "action", void 0);
let RequestsController = RequestsController_1 = class RequestsController {
    requestsService;
    logger = new common_1.Logger(RequestsController_1.name);
    constructor(requestsService) {
        this.requestsService = requestsService;
    }
    create(dto) {
        this.logger.log(`🚨 [INCOMING] Hospital ID: ${dto.hospitalId} | Group: ${dto.bloodGroup}`);
        return this.requestsService.createRequest(dto);
    }
    findAll(status, hospitalId) {
        return this.requestsService.getAll({ status, hospitalId });
    }
    findOne(id) {
        return this.requestsService.getById(id);
    }
    getResponses(id) {
        return this.requestsService.getDonorResponsesForRequest(id);
    }
    respond(id, dto, req) {
        return this.requestsService.respondToRequest(id, req.user.id, dto.action);
    }
    cancel(id) {
        return this.requestsService.cancelRequest(id);
    }
};
exports.RequestsController = RequestsController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create emergency blood request' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateRequestDto]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all requests' }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('hospitalId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get request details' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/responses'),
    (0, swagger_1.ApiOperation)({ summary: 'Get ranked donor responses' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "getResponses", null);
__decorate([
    (0, common_1.Post)(':id/respond'),
    (0, swagger_1.ApiOperation)({ summary: 'Donor response' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RespondDto, Object]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "respond", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel request' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RequestsController.prototype, "cancel", null);
exports.RequestsController = RequestsController = RequestsController_1 = __decorate([
    (0, swagger_1.ApiTags)('Requests'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('requests'),
    __metadata("design:paramtypes", [requests_service_1.RequestsService])
], RequestsController);
//# sourceMappingURL=requests.controller.js.map