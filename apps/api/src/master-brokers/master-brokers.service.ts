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

@Injectable()
export class MasterBrokersService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private enc: EncryptionService,
  ) {}

  async createBrokerByMaster(userId: string, data: any) {
    const panHash = sha256(data.pan.toUpperCase());
    const aadHash = sha256(data.aadhaar);
    const exists = await this.prisma.identity_documents.findFirst({
      where: {
        OR: [
          { document_type: "PAN", document_hash: panHash },
          { document_type: "AADHAAR", document_hash: aadHash },
        ],
      },
    });
    if (exists) throw new BadRequestException("Document already exists");
    return this.prisma.$transaction(async (tx) => {
      const mb = await tx.master_broker_profiles.findUnique({
        where: { user_id: BigInt(userId) },
      });
      if (!mb) throw new ForbiddenException();
      const userCode = await this.users.generateUserCode("BROKER");
      const role = await tx.roles.findUnique({ where: { code: "BROKER" } });
      if (!role) throw new BadRequestException("Role BROKER is not configured");
      const now = new Date();
      const user = await tx.users.create({
        data: {
          uuid: randomUUID(),
          user_code: userCode,
          role_id: role.id,
          name: data.name,
          email: data.email,
          mobile: data.mobile,
          status: "ACTIVE",
          is_verified: true,
          created_at: now,
          updated_at: now,
        },
      });
      await tx.broker_profiles.create({
        data: {
          user_id: user.id,
          master_broker_id: mb.id,
          address: data.address,
          city: data.city,
          firm_name: data.firmName,
          rera_number: data.reraNumber,
          bank_holder_name: data.bankHolderName,
          bank_name: data.bankName,
          bank_ifsc: data.bankIfsc,
          pan_encrypted: this.enc.encrypt(data.pan),
          aadhaar_encrypted: this.enc.encrypt(data.aadhaar),
          bank_account_encrypted: this.enc.encrypt(data.bankAccount),
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
      return {
        id: user.id.toString(),
        userCode: user.user_code,
        name: user.name,
      };
    });
  }

  async createReferral(userId: string) {
    const mb = await this.prisma.master_broker_profiles.findUnique({
      where: { user_id: BigInt(userId) },
    });
    if (!mb) throw new ForbiddenException();
    const token = generateRandomToken(32);
    const tokenHash = sha256(token);
    const expiresAt = addDays(new Date(), 7);
    await this.prisma.$transaction(async (tx) => {
      await tx.broker_referrals.updateMany({
        where: {
          master_broker_id: mb.id,
          revoked_at: null,
          expires_at: { gt: new Date() },
        },
        data: { revoked_at: new Date() },
      });
      await tx.broker_referrals.create({
        data: {
          master_broker_id: mb.id,
          token_hash: tokenHash,
          expires_at: expiresAt,
          created_at: new Date(),
        },
      });
    });
    return token;
  }

  async getCurrentReferral(userId: string) {
    const mb = await this.prisma.master_broker_profiles.findUnique({
      where: { user_id: BigInt(userId) },
    });
    if (!mb) throw new ForbiddenException();
    return this.prisma.broker_referrals.findFirst({
      where: {
        master_broker_id: mb.id,
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: "desc" },
    });
  }

  private async ownedProfileId(userId: string) {
    const mb = await this.prisma.master_broker_profiles.findUnique({
      where: { user_id: BigInt(userId) },
    });
    return mb?.id ?? null;
  }

  async getAssignedBrokers(userId: string, params: any = {}) {
    const { page = 1, limit = 10, search = "" } = params;
    const skip = (page - 1) * limit;
    const profileId = await this.ownedProfileId(userId);
    if (profileId === null) {
      return {
        items: [],
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: 0,
          totalPages: 0,
        },
      };
    }
    const where: any = {
      deleted_at: null,
      broker_profiles: { master_broker_id: profileId },
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { user_code: { contains: search } },
      ];
    }
    const [total, items] = await Promise.all([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        skip,
        take: Number(limit),
        include: { broker_profiles: true },
      }),
    ]);
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

  async getAssignedBroker(userId: string, id: string) {
    const profileId = await this.ownedProfileId(userId);
    if (profileId === null) throw new NotFoundException();
    return this.prisma.users.findFirst({
      where: {
        id: BigInt(id),
        deleted_at: null,
        broker_profiles: { master_broker_id: profileId },
      },
      include: { broker_profiles: true },
    });
  }

  async setStatus(userId: string, id: string, rawStatus: unknown) {
    const status = normalizeUserStatus(rawStatus);
    const profileId = await this.ownedProfileId(userId);
    if (profileId === null) throw new NotFoundException();
    const broker = await this.prisma.users.findFirst({
      where: {
        id: BigInt(id),
        deleted_at: null,
        broker_profiles: { master_broker_id: profileId },
      },
      select: { id: true },
    });
    if (!broker) throw new NotFoundException();
    const updated = await this.prisma.users.update({
      where: { id: broker.id },
      data: { status, session_version: { increment: 1 } },
    });
    return statusToggleResponse(updated.id, status, "Broker");
  }

  async deleteAssignedBroker(userId: string, id: string) {
    const profileId = await this.ownedProfileId(userId);
    if (profileId === null) throw new NotFoundException();
    const broker = await this.prisma.users.findFirst({
      where: {
        id: BigInt(id),
        broker_profiles: { master_broker_id: profileId },
      },
    });
    if (!broker) throw new NotFoundException();
    await this.prisma.users.update({
      where: { id: broker.id },
      data: {
        deleted_at: new Date(),
        status: "INACTIVE",
        session_version: { increment: 1 },
      },
    });
    return true;
  }
}
