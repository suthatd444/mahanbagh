import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { UsersService } from "../../users/users.service";
import { EncryptionService } from "../encryption/encryption.service";
import {
  IdentityDocumentFiles,
  getIdentityUploadFiles,
  removeIdentityUploadFiles,
} from "../uploads/identity-upload";
import { sha256 } from "../utils/crypto.util";

type RegistrationData = Record<string, string | undefined>;

@Injectable()
export class RegistrationService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private encryption: EncryptionService,
  ) {}

  async createEmployee(data: RegistrationData, files: IdentityDocumentFiles) {
    this.requireFields(data, ["name", "mobile", "pan", "aadhaar"]);
    const rawJoiningDate = data.joiningDate?.trim();
    const joiningDate = rawJoiningDate ? new Date(rawJoiningDate) : new Date();
    if (Number.isNaN(joiningDate.getTime()))
      throw new BadRequestException("joiningDate must be valid");

    return this.createWithDocuments(
      data,
      files,
      "EMPLOYEE",
      async (tx, userId, now) => {
        await tx.employee_profiles.create({
          data: {
            user_id: userId,
            address: data.address ?? "",
            city: data.city ?? "",
            designation: data.designation ?? "",
            joining_date: joiningDate,
            bank_holder_name: data.bankHolderName ?? null,
            bank_name: data.bankName ?? null,
            bank_account_encrypted: this.encryptOptional(data.bankAccount),
            bank_ifsc: data.bankIfsc ?? null,
            pan_encrypted: this.encryption.encrypt(data.pan!),
            aadhaar_encrypted: this.encryption.encrypt(data.aadhaar!),
            created_at: now,
            updated_at: now,
          },
        });
      },
    );
  }

  async createBroker(
    data: RegistrationData,
    files: IdentityDocumentFiles,
    options: {
      parentBrokerProfileId?: bigint;
      createdByUserId?: string;
    } = {},
  ) {
    this.requireFields(data, ["name", "mobile", "pan", "aadhaar"]);

    return this.createWithDocuments(
      data,
      files,
      "BROKER",
      async (tx, userId, now) => {
        await tx.broker_profiles.create({
          data: {
            user_id: userId,
            parent_broker_id: options.parentBrokerProfileId ?? null,
            created_by_user_id: options.createdByUserId
              ? BigInt(options.createdByUserId)
              : null,
            address: data.address ?? "",
            city: data.city ?? "",
            firm_name: data.firmName ?? null,
            rera_number: data.reraNumber ?? null,
            commission_percentage: data.commissionPercentage || "0",
            bank_holder_name: data.bankHolderName ?? null,
            bank_name: data.bankName ?? null,
            bank_account_encrypted: this.encryptOptional(data.bankAccount),
            bank_ifsc: data.bankIfsc ?? null,
            pan_encrypted: this.encryption.encrypt(data.pan!),
            aadhaar_encrypted: this.encryption.encrypt(data.aadhaar!),
            created_at: now,
            updated_at: now,
          },
        });
      },
    );
  }

  private async createWithDocuments(
    data: RegistrationData,
    files: IdentityDocumentFiles,
    roleCode: "EMPLOYEE" | "BROKER",
    createProfile: (
      tx: Prisma.TransactionClient,
      userId: bigint,
      now: Date,
    ) => Promise<void>,
  ) {
    const { panDocument, aadhaarDocument } = getIdentityUploadFiles(files);
    if (data.bankIfsc?.trim()) this.validateBankIfsc(data.bankIfsc.trim());
    const panHash = sha256(data.pan!.toUpperCase());
    const aadhaarHash = sha256(data.aadhaar!);

    try {
      const documentExists = await this.prisma.identity_documents.findFirst({
        where: {
          OR: [
            { document_type: "PAN", document_hash: panHash },
            { document_type: "AADHAAR", document_hash: aadhaarHash },
          ],
        },
      });
      if (documentExists)
        throw new BadRequestException("PAN or Aadhaar is already registered");

      const [role, userCode] = await Promise.all([
        this.prisma.roles.findUnique({ where: { code: roleCode } }),
        this.users.generateUserCode(roleCode),
      ]);
      if (!role)
        throw new BadRequestException(`Role ${roleCode} is not configured`);

      const now = new Date();
      const user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.users.create({
          data: {
            uuid: randomUUID(),
            user_code: userCode,
            role_id: role.id,
            name: data.name!,
            email: data.email?.trim() || null,
            mobile: data.mobile!,
            status: "ACTIVE",
            is_verified: true,
            created_at: now,
            updated_at: now,
          },
        });
        await createProfile(tx, createdUser.id, now);
        await tx.identity_documents.createMany({
          data: [
            {
              user_id: createdUser.id,
              document_type: "PAN",
              document_hash: panHash,
              created_at: now,
            },
            {
              user_id: createdUser.id,
              document_type: "AADHAAR",
              document_hash: aadhaarHash,
              created_at: now,
            },
          ],
        });
        // Identity document files are optional; only persist the ones uploaded.
        const uploadedDocuments = [
          panDocument && {
            user_id: createdUser.id,
            document_type: "PAN" as const,
            storage_path: `identity-documents/${panDocument.filename}`,
            original_name: panDocument.originalname,
            mime_type: panDocument.mimetype,
            size_bytes: panDocument.size,
            created_at: now,
          },
          aadhaarDocument && {
            user_id: createdUser.id,
            document_type: "AADHAAR" as const,
            storage_path: `identity-documents/${aadhaarDocument.filename}`,
            original_name: aadhaarDocument.originalname,
            mime_type: aadhaarDocument.mimetype,
            size_bytes: aadhaarDocument.size,
            created_at: now,
          },
        ].filter(Boolean) as Prisma.uploaded_documentsCreateManyInput[];

        if (uploadedDocuments.length) {
          await tx.uploaded_documents.createMany({ data: uploadedDocuments });
        }
        return createdUser;
      });

      return {
        id: user.id.toString(),
        userCode: user.user_code,
        name: user.name,
      };
    } catch (error) {
      await removeIdentityUploadFiles(files);
      throw toRegistrationError(error);
    }
  }

  private requireFields(data: RegistrationData, fields: string[]) {
    const missing = fields.filter((field) => !data[field]?.trim());
    if (missing.length)
      throw new BadRequestException(
        `Missing required fields: ${missing.join(", ")}`,
      );
  }

  private validateBankIfsc(bankIfsc: string) {
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankIfsc)) {
      throw new BadRequestException(
        "bankIfsc must be a valid 11 character IFSC code",
      );
    }
  }

  private encryptOptional(value: string | undefined) {
    const normalized = value?.trim();
    return normalized ? this.encryption.encrypt(normalized) : null;
  }
}

function toRegistrationError(error: unknown): unknown {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== "P2002"
  ) {
    return error;
  }

  const target = String(
    Array.isArray(error.meta?.target)
      ? error.meta.target.join(", ")
      : error.meta?.target ?? "",
  ).toLowerCase();

  if (target.includes("mobile"))
    return new BadRequestException("Mobile number is already registered.");
  if (target.includes("email"))
    return new BadRequestException("Email address is already registered.");
  if (target.includes("user_code"))
    return new BadRequestException("Unable to generate a unique user code. Please try again.");
  return new BadRequestException("These details are already registered.");
}
