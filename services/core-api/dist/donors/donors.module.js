"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DonorsModule = void 0;
const common_1 = require("@nestjs/common");
const donors_controller_1 = require("./donors.controller");
const donors_service_1 = require("./donors.service");
let DonorsModule = class DonorsModule {
};
exports.DonorsModule = DonorsModule;
exports.DonorsModule = DonorsModule = __decorate([
    (0, common_1.Module)({
        controllers: [donors_controller_1.DonorsController],
        providers: [donors_service_1.DonorsService],
        exports: [donors_service_1.DonorsService],
    })
], DonorsModule);
//# sourceMappingURL=donors.module.js.map