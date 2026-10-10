import { z } from 'zod';
export declare const mobileSchema: z.ZodString;
export declare const emailSchema: z.ZodString;
export declare const panSchema: z.ZodString;
export declare const aadhaarSchema: z.ZodString;
export declare const passwordSchema: z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>, string, string>, string, string>;
export declare const nameSchema: z.ZodString;
export declare const addressSchema: z.ZodString;
export declare const citySchema: z.ZodString;
