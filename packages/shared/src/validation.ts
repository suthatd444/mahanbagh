import { z } from 'zod';

export const mobileSchema = z
  .string()
  .regex(/^[6-9][0-9]{9}$/, { message: 'Invalid Indian mobile number' });

export const emailSchema = z
  .string()
  .email({ message: 'Invalid email address' })
  .max(254);

export const panSchema = z
  .string()
  .regex(/^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/, { message: 'Invalid PAN format' });

export const aadhaarSchema = z
  .string()
  .regex(/^[0-9]{12}$/, { message: 'Aadhaar must be exactly 12 digits' });

export const passwordSchema = z
  .string()
  .min(8)
  .refine((p) => /[A-Z]/.test(p), 'Password must contain uppercase letter')
  .refine((p) => /[a-z]/.test(p), 'Password must contain lowercase letter')
  .refine((p) => /[0-9]/.test(p), 'Password must contain digit')
  .refine((p) => /[^A-Za-z0-9]/.test(p), 'Password must contain special character');

export const nameSchema = z.string().min(1).max(150);
export const addressSchema = z.string().min(1).max(2000);
export const citySchema = z.string().min(1).max(100);
