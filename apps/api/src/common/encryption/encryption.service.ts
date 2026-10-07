import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';

  getKey(): Buffer {
    const keyBase64 = process.env.DATA_ENCRYPTION_KEY;
    if (!keyBase64) {
      throw new Error('DATA_ENCRYPTION_KEY is not set');
    }
    const key = Buffer.from(keyBase64, 'base64');
    if (key.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes');
    }
    return key;
  }

  encrypt(plaintext: string): string {
    const key = this.getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const result = Buffer.concat([iv, authTag, encrypted]);
    return result.toString('base64');
  }

  decrypt(ciphertext: string): string {
    const key = this.getKey();
    const buffer = Buffer.from(ciphertext, 'base64');
    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const enc = buffer.subarray(28);
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
    return decrypted.toString('utf8');
  }
}
