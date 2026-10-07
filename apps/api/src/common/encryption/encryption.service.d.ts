export declare class EncryptionService {
    private readonly algorithm;
    getKey(): Buffer;
    encrypt(plaintext: string): string;
    decrypt(ciphertext: string): string;
}
