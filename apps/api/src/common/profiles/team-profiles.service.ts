import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { unlink } from "fs/promises";
import { join } from "path";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { EncryptionService } from "../encryption/encryption.service";
import { sha256 } from "../utils/crypto.util";
import {
  IdentityDocumentFiles,
  removeIdentityUploadFiles,
} from "../uploads/identity-upload";

export type TeamRoleCode = "EMPLOYEE" | "BROKER";

export type ProfileScope =
  | { actor: "ADMIN" }
  | { actor: "EMPLOYEE"; userId: bigint }
  | { actor: "BROKER"; userId: bigint };

export type DocumentType = "PAN" | "AADHAAR";

interface ProfileInput {
  name: string;
  email: string | null;
  mobile: string;
  address: string;
  city: string;
  designation: string;
  firmName: string;
  reraNumber: string;
  bankHolderName: string | null;
  bankName: string | null;
  bankIfsc: string | null;
  bankAccount: string | null;
  pan: string | null;
  aadhaar: string | null;
}

interface StoredFile {
  storagePath: string;
  mimeType: string;
  originalName: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_PATTERN = /^\d{10}$/;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_PATTERN = /^\d{12}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_PATTERN = /^\d{6,20}$/;

const ROLE_LABEL: Record<TeamRoleCode, string> = {
  EMPLOYEE: "Employee",
  BROKER: "Broker",
};

@Injectable()
export class TeamProfilesService {
  constructor(
    private prisma: PrismaService,
    private enc: EncryptionService,
  ) {}

  async getDetail(roleCode: TeamRoleCode, id: string, scope: ProfileScope) {
    const userId = this.toUserId(id);
    const user = await this.findUser(userId, roleCode);
    const profile = await this.loadProfile(roleCode, userId, scope);
    const documents = await this.prisma.uploaded_documents.findMany({
      where: { user_id: userId },
      select: {
        document_type: true,
        original_name: true,
        mime_type: true,
        size_bytes: true,
        created_at: true,
      },
    });
    return this.toDetailResponse(user, roleCode, profile, documents);
  }

  async update(
    roleCode: TeamRoleCode,
    id: string,
    data: any,
    scope: ProfileScope,
    files?: IdentityDocumentFiles,
  ) {
    const userId = this.toUserId(id);
    const panFile = files?.panDocument?.[0];
    const aadhaarFile = files?.aadhaarDocument?.[0];
    const now = new Date();
    const replacedPaths: string[] = [];

    try {
      const user = await this.findUser(userId, roleCode);
      const profile = await this.loadProfile(roleCode, userId, scope);
      const input = this.readInput(data, roleCode, { user, profile });

      this.assertDocumentPairing("PAN", input.pan, panFile);
      this.assertDocumentPairing("AADHAAR", input.aadhaar, aadhaarFile);

      if (input.pan)
        await this.assertDocumentAvailable(userId, "PAN", input.pan);
      if (input.aadhaar)
        await this.assertDocumentAvailable(userId, "AADHAAR", input.aadhaar);

      await this.prisma.$transaction(async (tx) => {
        await tx.users.update({
          where: { id: user.id },
          data: {
            name: input.name,
            email: input.email,
            mobile: input.mobile,
            updated_at: now,
          },
        });
        await this.profileUpdate(tx, roleCode, profile.id, input, now);
        if (input.pan) {
          await this.writeIdentityDocument(
            tx,
            userId,
            "PAN",
            input.pan,
            panFile,
            now,
            replacedPaths,
          );
        }
        if (input.aadhaar) {
          await this.writeIdentityDocument(
            tx,
            userId,
            "AADHAAR",
            input.aadhaar,
            aadhaarFile,
            now,
            replacedPaths,
          );
        }
      });
    } catch (error) {
      if (files) await removeIdentityUploadFiles(files).catch(() => null);
      throw this.toUniqueViolation(error);
    }

    await this.deleteStoredFiles(replacedPaths);

    return {
      status: true,
      message: `${ROLE_LABEL[roleCode]} updated successfully.`,
      data: await this.getDetail(roleCode, id, scope),
    };
  }

  async getDocument(id: string, rawType: string, scope: ProfileScope) {
    const type = String(rawType ?? "").toUpperCase();
    if (type !== "PAN" && type !== "AADHAAR") {
      throw new BadRequestException("Document type must be PAN or AADHAAR");
    }

    const userId = this.toUserId(id);
    const roleCode = await this.resolveRoleCode(userId);
    await this.findUser(userId, roleCode);
    await this.loadProfile(roleCode, userId, scope);

    const document = await this.prisma.uploaded_documents.findUnique({
      where: {
        user_id_document_type: { user_id: userId, document_type: type },
      },
    });
    if (!document) throw new NotFoundException("Document not found");

    const storagePath = document.storage_path.replace(/^\/+/, "");
    if (
      storagePath.includes("..") ||
      !storagePath.startsWith("identity-documents/")
    ) {
      throw new NotFoundException("Document not found");
    }

    return {
      storagePath,
      mimeType: document.mime_type,
      originalName: document.original_name,
      sizeBytes: document.size_bytes,
    };
  }

  private async resolveRoleCode(userId: bigint): Promise<TeamRoleCode> {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { roles: { select: { code: true } } },
    });
    const code = user?.roles?.code;
    if (code === "EMPLOYEE" || code === "BROKER") {
      return code;
    }
    throw new NotFoundException("User not found");
  }

  private async findUser(userId: bigint, roleCode: TeamRoleCode) {
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null, roles: { code: roleCode } },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        user_code: true,
        status: true,
        is_verified: true,
        created_at: true,
        last_login_at: true,
      },
    });
    if (!user) throw new NotFoundException(`${ROLE_LABEL[roleCode]} not found`);
    return user;
  }

  private async loadProfile(
    roleCode: TeamRoleCode,
    userId: bigint,
    scope: ProfileScope,
  ) {
    if (scope.actor === "BROKER" && roleCode !== "BROKER") {
      throw new NotFoundException("Not found");
    }

    if (roleCode === "EMPLOYEE") {
      if (scope.actor !== "ADMIN") throw new NotFoundException("Not found");
      const profile = await this.prisma.employee_profiles.findUnique({
        where: { user_id: userId },
      });
      if (!profile) throw new NotFoundException("Employee profile not found");
      return profile;
    }

    const brokerProfile = await this.prisma.broker_profiles.findUnique({
      where: { user_id: userId },
    });
    if (!brokerProfile) throw new NotFoundException("Broker not found");

    await this.assertBrokerAccess(brokerProfile, scope);
    return brokerProfile;
  }

  private async assertBrokerAccess(
    brokerProfile: { id: bigint; created_by_user_id: bigint | null },
    scope: ProfileScope,
  ) {
    if (scope.actor === "ADMIN") return;

    if (scope.actor === "EMPLOYEE") {
      if (brokerProfile.created_by_user_id !== scope.userId) {
        throw new NotFoundException("Broker not found");
      }
      return;
    }

    // A broker may only access profiles within their own downline tree.
    const actorProfile = await this.prisma.broker_profiles.findUnique({
      where: { user_id: scope.userId },
      select: { id: true },
    });
    if (!actorProfile) throw new NotFoundException("Broker not found");

    let currentId: bigint | null = brokerProfile.id;
    while (currentId) {
      if (currentId === actorProfile.id) return;
      const parent: { parent_broker_id: bigint | null } | null =
        await this.prisma.broker_profiles.findUnique({
          where: { id: currentId },
          select: { parent_broker_id: true },
        });
      currentId = parent?.parent_broker_id ?? null;
    }
    throw new NotFoundException("Broker not found");
  }

  private profileUpdate(
    tx: any,
    roleCode: TeamRoleCode,
    profileId: bigint,
    input: ProfileInput,
    now: Date,
  ) {
    const shared = {
      address: input.address,
      city: input.city,
      bank_holder_name: input.bankHolderName,
      bank_name: input.bankName,
      bank_ifsc: input.bankIfsc,
      ...(input.bankAccount
        ? { bank_account_encrypted: this.enc.encrypt(input.bankAccount) }
        : {}),
      ...(input.pan ? { pan_encrypted: this.enc.encrypt(input.pan) } : {}),
      ...(input.aadhaar
        ? { aadhaar_encrypted: this.enc.encrypt(input.aadhaar) }
        : {}),
      updated_at: now,
    };

    if (roleCode === "EMPLOYEE") {
      return tx.employee_profiles.update({
        where: { id: profileId },
        data: { ...shared, designation: input.designation },
      });
    }

    return tx.broker_profiles.update({
      where: { id: profileId },
      data: {
        ...shared,
        firm_name: input.firmName || null,
        rera_number: input.reraNumber || null,
      },
    });
  }

  private async writeIdentityDocument(
    tx: any,
    userId: bigint,
    type: DocumentType,
    value: string,
    file: Express.Multer.File | undefined,
    now: Date,
    replacedPaths: string[],
  ) {
    const hash = type === "PAN" ? sha256(value.toUpperCase()) : sha256(value);

    const existingHash = await tx.identity_documents.findFirst({
      where: { user_id: userId, document_type: type },
    });
    if (existingHash) {
      await tx.identity_documents.update({
        where: { id: existingHash.id },
        data: { document_hash: hash },
      });
    } else {
      await tx.identity_documents.create({
        data: {
          user_id: userId,
          document_type: type,
          document_hash: hash,
          created_at: now,
        },
      });
    }

    // The number can be updated without a new file; only touch the stored
    // file when a replacement upload was provided.
    if (!file) return;

    const storagePath = `identity-documents/${file.filename}`;
    const existingUpload = await tx.uploaded_documents.findUnique({
      where: { user_id_document_type: { user_id: userId, document_type: type } },
    });
    if (existingUpload) {
      replacedPaths.push(existingUpload.storage_path);
      await tx.uploaded_documents.update({
        where: { id: existingUpload.id },
        data: {
          storage_path: storagePath,
          original_name: file.originalname,
          mime_type: file.mimetype,
          size_bytes: file.size,
          created_at: now,
        },
      });
    } else {
      await tx.uploaded_documents.create({
        data: {
          user_id: userId,
          document_type: type,
          storage_path: storagePath,
          original_name: file.originalname,
          mime_type: file.mimetype,
          size_bytes: file.size,
          created_at: now,
        },
      });
    }
  }

  private async assertDocumentAvailable(
    userId: bigint,
    type: DocumentType,
    value: string,
  ) {
    const hash = type === "PAN" ? sha256(value.toUpperCase()) : sha256(value);
    const clash = await this.prisma.identity_documents.findFirst({
      where: {
        document_type: type,
        document_hash: hash,
        user_id: { not: userId },
      },
      select: { id: true },
    });
    if (clash) {
      throw new BadRequestException(
        `${type} is already registered to another user.`,
      );
    }
  }

  private assertDocumentPairing(
    type: DocumentType,
    value: string | null,
    file: Express.Multer.File | undefined,
  ) {
    // A document number may be changed on its own, but an uploaded file always
    // needs its matching number so the stored hash stays consistent.
    if (file && !value) {
      throw new BadRequestException(
        `Enter the ${type} number for the uploaded document.`,
      );
    }
  }

  private readInput(
    data: any,
    _roleCode: TeamRoleCode,
    current: { user: any; profile: any },
  ): ProfileInput {
    const str = (value: unknown) => String(value ?? "").trim();
    const pick = (key: string, fallback: string) =>
      data && key in data ? str(data[key]) : fallback;

    const name = pick("name", str(current.user.name));
    const mobile = pick("mobile", str(current.user.mobile));
    const email = pick("email", str(current.user.email));
    const address = pick("address", str(current.profile.address));
    const city = pick("city", str(current.profile.city));
    const designation = pick("designation", str(current.profile.designation));
    const firmName = pick("firmName", str(current.profile.firm_name));
    const reraNumber = pick("reraNumber", str(current.profile.rera_number));
    const bankHolderName = pick(
      "bankHolderName",
      str(current.profile.bank_holder_name),
    );
    const bankName = pick("bankName", str(current.profile.bank_name));
    const bankIfsc = pick("bankIfsc", str(current.profile.bank_ifsc));
    const bankAccount = str(data?.bankAccount);
    const pan = str(data?.pan).toUpperCase();
    const aadhaar = str(data?.aadhaar);

    if (!name) throw new BadRequestException("Name is required");
    if (!MOBILE_PATTERN.test(mobile))
      throw new BadRequestException("Enter a valid 10-digit mobile number");
    if (email && !EMAIL_PATTERN.test(email))
      throw new BadRequestException("Enter a valid email address");
    // PAN and Aadhaar are mandatory. On edit they may be left blank only when a
    // value is already stored against the profile.
    if (!pan && !current.profile.pan_encrypted)
      throw new BadRequestException("PAN is required");
    if (!aadhaar && !current.profile.aadhaar_encrypted)
      throw new BadRequestException("Aadhaar number is required");
    if (bankIfsc && !IFSC_PATTERN.test(bankIfsc))
      throw new BadRequestException("Enter a valid 11-character IFSC code");
    if (bankAccount && !ACCOUNT_PATTERN.test(bankAccount))
      throw new BadRequestException("Enter a valid bank account number");
    if (pan && !PAN_PATTERN.test(pan))
      throw new BadRequestException("Enter a valid PAN number");
    if (aadhaar && !AADHAAR_PATTERN.test(aadhaar))
      throw new BadRequestException("Enter a valid 12-digit Aadhaar number");

    return {
      name,
      mobile,
      email: email || null,
      address,
      city,
      designation,
      firmName,
      reraNumber,
      bankHolderName: bankHolderName || null,
      bankName: bankName || null,
      bankIfsc: bankIfsc || null,
      bankAccount: bankAccount || null,
      pan: pan || null,
      aadhaar: aadhaar || null,
    };
  }

  private toDetailResponse(
    user: {
      id: { toString(): string };
      name: string;
      email: string | null;
      mobile: string;
      user_code: string | null;
      status: string;
      is_verified: boolean;
      created_at: Date;
      last_login_at: Date | null;
    },
    roleCode: TeamRoleCode,
    profile: any,
    documents: any[],
  ) {
    const base = {
      id: user.id.toString(),
      role: roleCode,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      user_code: user.user_code,
      status: user.status,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at,
      address: profile.address,
      city: profile.city,
      bankHolderName: profile.bank_holder_name ?? "",
      bankName: profile.bank_name ?? "",
      bankIfsc: profile.bank_ifsc ?? "",
      bankAccountMasked: this.maskAccount(
        this.maybeDecrypt(profile.bank_account_encrypted),
      ),
      panMasked: this.maskPan(this.maybeDecrypt(profile.pan_encrypted)),
      aadhaarMasked: this.maskAadhaar(
        this.maybeDecrypt(profile.aadhaar_encrypted),
      ),
      documents: documents.map((document) => ({
        type: document.document_type as DocumentType,
        originalName: document.original_name,
        mimeType: document.mime_type,
        sizeBytes: document.size_bytes,
        createdAt: document.created_at,
      })),
    };

    if (roleCode === "EMPLOYEE") {
      return {
        ...base,
        designation: profile.designation,
        joiningDate: profile.joining_date,
      };
    }

    return {
      ...base,
      firmName: profile.firm_name ?? "",
      reraNumber: profile.rera_number ?? "",
      commissionPercentage: String(profile.commission_percentage ?? "0"),
    };
  }

  private maybeDecrypt(value: string | null | undefined) {
    if (!value) return "";
    try {
      return this.enc.decrypt(value);
    } catch {
      return "";
    }
  }

  private maskPan(value: string) {
    if (!value) return "";
    if (value.length < 10) return "****";
    return `${value.slice(0, 5)}****${value.slice(-1)}`;
  }

  private maskAadhaar(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length < 4) return "****";
    return `XXXX XXXX ${digits.slice(-4)}`;
  }

  private maskAccount(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length < 4) return "****";
    return `******${digits.slice(-4)}`;
  }

  private async deleteStoredFiles(storagePaths: string[]) {
    await Promise.all(
      storagePaths.map((storagePath) =>
        unlink(join(process.cwd(), "uploads", storagePath)).catch(() => null),
      ),
    );
  }

  private toUserId(id: string) {
    try {
      return BigInt(id);
    } catch {
      throw new BadRequestException("Invalid user ID");
    }
  }

  private toUniqueViolation(error: unknown) {
    const prismaError = error as { code?: string; meta?: { target?: unknown } };
    if (prismaError?.code !== "P2002") return error;

    const target = prismaError.meta?.target;
    const fields = Array.isArray(target) ? target : [target];
    if (fields.some((field) => String(field).includes("mobile"))) {
      return new BadRequestException("Mobile number is already registered.");
    }
    if (fields.some((field) => String(field).includes("email"))) {
      return new BadRequestException("Email address is already registered.");
    }
    return new BadRequestException("This value is already in use.");
  }
}
