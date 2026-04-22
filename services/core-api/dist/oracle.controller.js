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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OracleController = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
let OracleController = class OracleController {
    getOracle() {
        const filePath = (0, path_1.join)(process.cwd(), 'ACTIVE_TUNNEL.txt');
        if (!(0, fs_1.existsSync)(filePath)) {
            return {
                status: 'pending',
                message: 'Tunnels are currently spawning. Please wait 10 seconds.'
            };
        }
        try {
            const content = require('fs').readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            const cfMatch = lines.find(l => l.startsWith('CF:'))?.replace('CF: ', '').trim();
            const ltMatch = lines.find(l => l.startsWith('LT:'))?.replace('LT: ', '').trim();
            return {
                status: 'ready',
                tunnels: {
                    cloudflare: cfMatch || null,
                    localtunnel: ltMatch || null
                },
                timestamp: new Date().toISOString()
            };
        }
        catch (err) {
            return { status: 'error', message: 'Oracle is sleeping' };
        }
    }
};
exports.OracleController = OracleController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OracleController.prototype, "getOracle", null);
exports.OracleController = OracleController = __decorate([
    (0, common_1.Controller)('oracle')
], OracleController);
//# sourceMappingURL=oracle.controller.js.map