import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../infra/prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { EncryptionService } from "../common/encryption/encryption.service";
import { sha256, generateRandomToken } from "../common/utils/crypto.util";
import {
  normalizeUserStatus,
  statusToggleResponse,
} from "../common/utils/user-status.util";
import { addDays } from "date-fns";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import {
  getIdentityUploadFiles,
  IdentityDocumentFiles,
  removeIdentityUploadFiles,
} from "../common/uploads/identity-upload";

@Injectable()
export class BrokersService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private enc: EncryptionService,
  ) {}

  private async ownedProfile(userId: string) {
    const profile = await this.prisma.broker_profiles.findUnique({
      where: { user_id: BigInt(userId) },
      select: { id: true, created_by_user_id: true },
    });
    if (!profile) throw new ForbiddenException();
    return profile;
  }

  private async descendantProfile(userId: string, brokerUserId: string) {
    const owner = await this.ownedProfile(userId);
    const target = await this.prisma.broker_profiles.findFirst({
      where: {
        user_id: BigInt(brokerUserId),
        users: { deleted_at: null },
      },
      select: { id: true, user_id: true, parent_broker_id: true },
    });
    if (!target) throw new NotFoundException("Broker not found");

    let current = target;
    while (current.parent_broker_id) {
      if (current.parent_broker_id === owner.id) return target;
      const parent = await this.prisma.broker_profiles.findUnique({
        where: { id: current.parent_broker_id },
        select: { id: true, user_id: true, parent_broker_id: true },
      });
      if (!parent) break;
      current = parent;
    }

    throw new NotFoundException("Broker not found");
  }

  async createDownlineBroker(
    userId: string,
    data: any,
    files: IdentityDocumentFiles = {},
  ) {
    const name = String(data?.name ?? "").trim();
    const mobile = String(data?.mobile ?? "").trim();
    const pan = String(data?.pan ?? "").trim().toUpperCase();
    const aadhaar = String(data?.aadhaar ?? "").trim();
    if (!name) throw new BadRequestException("Name is required");
    if (!/^\d{10}$/.test(mobile))
      throw new BadRequestException("Enter a valid 10-digit mobile number");
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))
      throw new BadRequestException("Enter a valid PAN number");
    if (!/^\d{12}$/.test(aadhaar))
      throw new BadRequestException("Enter a valid 12-digit Aadhaar number");

    const { panDocument, aadhaarDocument } = getIdentityUploadFiles(files);
    try {
      const panHash = sha256(pan);
      const aadHash = sha256(aadhaar);
      const exists = await this.prisma.identity_documents.findFirst({
        where: {
          OR: [
            { document_type: "PAN", document_hash: panHash },
            { document_type: "AADHAAR", document_hash: aadHash },
          ],
        },
      });
      if (exists) throw new BadRequestException("Document already exists");

      const parent = await this.ownedProfile(userId);
      return await this.prisma.$transaction(async (tx) => {
        const userCode = await this.users.generateUserCode("BROKER");
        const role = await tx.roles.findUnique({ where: { code: "BROKER" } });
        if (!role) throw new BadRequestException("Role BROKER is not configured");
        const now = new Date();
        const user = await tx.users.create({
          data: {
            uuid: randomUUID(),
            user_code: userCode,
            role_id: role.id,
            name,
            email: String(data?.email ?? "").trim() || null,
            mobile,
            status: "ACTIVE",
            is_verified: true,
            created_at: now,
            updated_at: now,
          },
        });
        await tx.broker_profiles.create({
          data: {
            user_id: user.id,
            parent_broker_id: parent.id,
            created_by_user_id: parent.created_by_user_id,
            address: String(data?.address ?? "").trim(),
            city: String(data?.city ?? "").trim(),
            firm_name: String(data?.firmName ?? "").trim() || null,
            rera_number: String(data?.reraNumber ?? "").trim() || null,
            commission_percentage: "0",
            bank_holder_name: String(data?.bankHolderName ?? "").trim() || null,
            bank_name: String(data?.bankName ?? "").trim() || null,
            bank_ifsc: String(data?.bankIfsc ?? "").trim() || null,
            pan_encrypted: this.enc.encrypt(pan),
            aadhaar_encrypted: this.enc.encrypt(aadhaar),
            bank_account_encrypted: data?.bankAccount
              ? this.enc.encrypt(String(data.bankAccount).trim())
              : null,
            created_at: now,
            updated_at: now,
          },
        });
        await tx.identity_documents.createMany({
          data: [
            {
              user_id: user.id,
              document_type: "PAN",
              document_hash: panHash,
              created_at: now,
            },
            {
              user_id: user.id,
              document_type: "AADHAAR",
              document_hash: aadHash,
              created_at: now,
            },
          ],
        });
        const uploadedDocuments = [
          panDocument && {
            user_id: user.id,
            document_type: "PAN" as const,
            storage_path: `identity-documents/${panDocument.filename}`,
            original_name: panDocument.originalname,
            mime_type: panDocument.mimetype,
            size_bytes: panDocument.size,
            created_at: now,
          },
          aadhaarDocument && {
            user_id: user.id,
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
        return {
          id: user.id.toString(),
          userCode: user.user_code,
          name: user.name,
        };
      });
    } catch (error) {
      await removeIdentityUploadFiles(files);
      throw toDownlineRegistrationError(error);
    }
  }

  async createReferral(userId: string) {
    const profile = await this.ownedProfile(userId);
    const token = generateRandomToken(32);
    const tokenHash = sha256(token);
    const expiresAt = addDays(new Date(), 7);
    await this.prisma.$transaction(async (tx) => {
      await tx.broker_referrals.updateMany({
        where: {
          broker_id: profile.id,
          revoked_at: null,
          expires_at: { gt: new Date() },
        },
        data: { revoked_at: new Date() },
      });
      await tx.broker_referrals.create({
        data: {
          broker_id: profile.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
          created_at: new Date(),
        },
      });
    });
    return token;
  }

  async getCurrentReferral(userId: string) {
    const profile = await this.ownedProfile(userId);
    return this.prisma.broker_referrals.findFirst({
      where: {
        broker_id: profile.id,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });
  }

  async getDownline(userId: string, params: any = {}) {
    const { page = 1, limit = 10, search = "" } = params;
    const skip = (page - 1) * limit;
    const profile = await this.ownedProfile(userId);
    const where: any = {
      deleted_at: null,
      broker_profiles: { parent_broker_id: profile.id },
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { user_code: { contains: search } },
      ];
    }
    const [total, users] = await Promise.all([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { created_at: "desc" },
        include: {
          broker_profiles: {
            include: {
              parent: { include: { users: { select: { name: true, user_code: true } } } },
            },
          },
        },
      }),
    ]);
    const items = await Promise.all(
      users.map(async (item) => ({
        ...this.toBrokerListItem(item),
        brokerCount: await this.prisma.broker_profiles.count({
          where: {
            parent_broker_id: item.broker_profiles?.id,
            users: { deleted_at: null },
          },
        }),
      })),
    );
    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async getDownlineBroker(userId: string, id: string) {
    const profile = await this.descendantProfile(userId, id);
    return this.prisma.users.findUniqueOrThrow({
      where: { id: profile.user_id },
    });
  }

  async getDownlineOfBroker(userId: string, id: string, params: any = {}) {
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 10);
    const skip = (page - 1) * limit;
    const child = await this.descendantProfile(userId, id);
    const where: any = {
      deleted_at: null,
      broker_profiles: { parent_broker_id: child.id },
    };
    const [total, users] = await Promise.all([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          broker_profiles: {
            include: {
              parent: { include: { users: { select: { name: true, user_code: true } } } },
            },
          },
        },
      }),
    ]);
    const items = await Promise.all(
      users.map(async (item) => ({
        ...this.toBrokerListItem(item),
        brokerCount: await this.prisma.broker_profiles.count({
          where: {
            parent_broker_id: item.broker_profiles?.id,
            users: { deleted_at: null },
          },
        }),
      })),
    );
    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async setStatus(userId: string, id: string, rawStatus: unknown) {
    const status = normalizeUserStatus(rawStatus);
    const broker = await this.descendantProfile(userId, id);
    const updated = await this.prisma.users.update({
      where: { id: broker.user_id },
      data: { status, session_version: { increment: 1 } },
    });
    return statusToggleResponse(updated.id, status, "Broker");
  }

  async deleteDownlineBroker(userId: string, id: string) {
    const broker = await this.descendantProfile(userId, id);
    await this.prisma.users.update({
      where: { id: broker.user_id },
      data: {
        deleted_at: new Date(),
        status: "INACTIVE",
        session_version: { increment: 1 },
      },
    });
    return true;
  }

  private toBrokerListItem(item: any) {
    return {
      id: item.id.toString(),
      name: item.name,
      user_code: item.user_code,
      email: item.email,
      mobile: item.mobile,
      status: item.status,
      created_at: item.created_at,
      firm_name: item.broker_profiles?.firm_name ?? null,
      parentBroker: item.broker_profiles?.parent?.users
        ? {
            name: item.broker_profiles.parent.users.name,
            userCode: item.broker_profiles.parent.users.user_code,
          }
        : null,
    };
  }
}

function toDownlineRegistrationError(error: unknown): unknown {
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

  if (target.includes("mobile")) {
    return new BadRequestException("Mobile number is already registered.");
  }
  if (target.includes("email")) {
    return new BadRequestException("Email address is already registered.");
  }
  if (target.includes("user_code")) {
    return new BadRequestException(
      "Unable to generate a unique user code. Please try again.",
    );
  }
  return new BadRequestException("These details are already registered.");
}
