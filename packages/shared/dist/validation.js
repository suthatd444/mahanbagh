"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.citySchema = exports.addressSchema = exports.nameSchema = exports.passwordSchema = exports.aadhaarSchema = exports.panSchema = exports.emailSchema = exports.mobileSchema = void 0;
const zod_1 = require("zod");
exports.mobileSchema = zod_1.z
    .string()
    .regex(/^[6-9][0-9]{9}$/, { message: 'Invalid Indian mobile number' });
exports.emailSchema = zod_1.z
    .string()
    .email({ message: 'Invalid email address' })
    .max(254);
exports.panSchema = zod_1.z
    .string()
    .regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, { message: 'Invalid PAN format' });
exports.aadhaarSchema = zod_1.z
    .string()
    .regex(/^[0-9]{12}$/, { message: 'Aadhaar must be exactly 12 digits' });
exports.passwordSchema = zod_1.z
    .string()
    .min(8)
    .refine((p) => /[A-Z]/.test(p), 'Password must contain uppercase letter')
    .refine((p) => /[a-z]/.test(p), 'Password must contain lowercase letter')
    .refine((p) => /[0-9]/.test(p), 'Password must contain digit')
    .refine((p) => /[^A-Za-z0-9]/.test(p), 'Password must contain special character');
exports.nameSchema = zod_1.z.string().min(1).max(150);
exports.addressSchema = zod_1.z.string().min(1).max(2000);
exports.citySchema = zod_1.z.string().min(1).max(100);
