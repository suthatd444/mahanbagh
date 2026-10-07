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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const argon2 = __importStar(require("argon2"));
const shared_1 = require("@mohan-bagh/shared");
const prisma = new client_1.PrismaClient();
async function main() {
    const permissions = [
        { code: shared_1.PERMISSIONS.USER_MANAGE },
        { code: shared_1.PERMISSIONS.ROLE_MANAGE },
        { code: shared_1.PERMISSIONS.EMPLOYEE_MANAGE },
        { code: shared_1.PERMISSIONS.MASTER_BROKER_MANAGE },
        { code: shared_1.PERMISSIONS.BROKER_CREATE },
        { code: shared_1.PERMISSIONS.BROKER_VIEW_ALL },
        { code: shared_1.PERMISSIONS.BROKER_UPDATE_ALL },
        { code: shared_1.PERMISSIONS.BROKER_VIEW_ASSIGNED },
        { code: shared_1.PERMISSIONS.BROKER_UPDATE_ASSIGNED },
        { code: shared_1.PERMISSIONS.PROFILE_UPDATE_OWN },
        { code: shared_1.PERMISSIONS.SECURITY_LOGS_VIEW },
        { code: shared_1.PERMISSIONS.SETTINGS_MANAGE },
    ];
    for (const p of permissions) {
        await prisma.permission.upsert({
            where: { code: p.code },
            update: {},
            create: p,
        });
    }
    const adminRole = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        update: {},
        create: { name: 'ADMIN', description: 'Administrator' },
    });
    const allPerms = await prisma.permission.findMany();
    for (const p of allPerms) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
            update: {},
            create: { roleId: adminRole.id, permissionId: p.id },
        });
    }
    await prisma.role.upsert({
        where: { name: 'EMPLOYEE' },
        update: {},
        create: { name: 'EMPLOYEE' },
    });
    await prisma.role.upsert({
        where: { name: 'MASTER_BROKER' },
        update: {},
        create: { name: 'MASTER_BROKER' },
    });
    await prisma.role.upsert({
        where: { name: 'BROKER' },
        update: {},
        create: { name: 'BROKER' },
    });
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@mohanbagh.com' } });
    if (!adminUser) {
        const adminRole2 = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
        await prisma.user.create({
            data: {
                name: 'Admin',
                email: 'admin@mohanbagh.com',
                mobile: '9999999999',
                passwordHash: await argon2.hash('Admin@123'),
                status: 'ACTIVE',
                isVerified: true,
                roleId: adminRole2.id,
            },
        });
    }
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
