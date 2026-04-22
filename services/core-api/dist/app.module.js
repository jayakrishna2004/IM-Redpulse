"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./auth/auth.module");
const donors_module_1 = require("./donors/donors.module");
const requests_module_1 = require("./requests/requests.module");
const hospitals_module_1 = require("./hospitals/hospitals.module");
const matching_module_1 = require("./matching/matching.module");
const tracking_module_1 = require("./tracking/tracking.module");
const notifications_module_1 = require("./notifications/notifications.module");
const database_module_1 = require("./database/database.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const oracle_controller_1 = require("./oracle.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
            database_module_1.DatabaseModule,
            auth_module_1.AuthModule,
            donors_module_1.DonorsModule,
            requests_module_1.RequestsModule,
            hospitals_module_1.HospitalsModule,
            matching_module_1.MatchingModule,
            tracking_module_1.TrackingModule,
            notifications_module_1.NotificationsModule,
        ],
        controllers: [app_controller_1.AppController, oracle_controller_1.OracleController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map