import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../infra/prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { EncryptionService } from "../common/encryption/encryption.service";
import { sha256 } from "../common/utils/crypto.util";
import {
  normalizeUserStatus,
  statusToggleResponse,
} from "../common/utils/user-status.util";
import * as argon2 from "argon2";

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private enc: EncryptionService,
  ) {}

  async createEmployee(data: any) {
    const panHash = sha256(data.pan.toUpperCase());
    const aadHash = sha256(data.aadhaar);
    const exists = await this.prisma.identityDocument.findFirst({
      where: {
        OR: [
          { documentType: "PAN", documentHash: panHash },
          { documentType: "AADHAAR", documentHash: aadHash },
        ],
      },
    });
    if (exists) throw new BadRequestException("Document already exists");
    return this.prisma.$transaction(async (tx) => {
      const userCode = await this.users.generateUserCode("EMPLOYEE");
      const role = await tx.role.findUnique({ where: { name: "EMPLOYEE" } });
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          mobile: data.mobile,
          passwordHash: await argon2.hash(data.password),
          roleId: role!.id,
          userCode,
          status: "ACTIVE",
          isVerified: true,
        },
      });
      await tx.employeeProfile.create({
        data: {
          userId: user.id,
          address: data.address,
          city: data.city,
          designation: data.designation,
          joiningDate: new Date(data.joiningDate),
          bankHolderName: data.bankHolderName,
          bankName: data.bankName,
          bankIfsc: data.bankIfsc,
          panEncrypted: this.enc.encrypt(data.pan),
          aadhaarEncrypted: this.enc.encrypt(data.aadhaar),
          bankAccountEncrypted: this.enc.encrypt(data.bankAccount),
        },
      });
      await tx.identityDocument.createMany({
        data: [
          { userId: user.id, documentType: "PAN", documentHash: panHash },
          { userId: user.id, documentType: "AADHAAR", documentHash: aadHash },
        ],
      });
      return user;
    });
  }

  async createMasterBroker(data: any) {
    const panHash = sha256(data.pan.toUpperCase());
    const aadHash = sha256(data.aadhaar);
    const exists = await this.prisma.identityDocument.findFirst({
      where: {
        OR: [
          { documentType: "PAN", documentHash: panHash },
          { documentType: "AADHAAR", documentHash: aadHash },
        ],
      },
    });
    if (exists) throw new BadRequestException("Document already exists");
    return this.prisma.$transaction(async (tx) => {
      const userCode = await this.users.generateUserCode("MASTER_BROKER");
      const role = await tx.role.findUnique({
        where: { name: "MASTER_BROKER" },
      });
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          mobile: data.mobile,
          passwordHash: await argon2.hash(data.password),
          roleId: role!.id,
          userCode,
          status: "ACTIVE",
          isVerified: true,
        },
      });
      await tx.masterBrokerProfile.create({
        data: {
          userId: user.id,
          createdByUserId: data.createdByUserId || null,
          address: data.address,
          city: data.city,
          firmName: data.firmName,
          commissionPercentage: data.commissionPercentage,
          bankHolderName: data.bankHolderName,
          bankName: data.bankName,
          bankIfsc: data.bankIfsc,
          panEncrypted: this.enc.encrypt(data.pan),
          aadhaarEncrypted: this.enc.encrypt(data.aadhaar),
          bankAccountEncrypted: this.enc.encrypt(data.bankAccount),
        },
      });
      await tx.identityDocument.createMany({
        data: [
          { userId: user.id, documentType: "PAN", documentHash: panHash },
          { userId: user.id, documentType: "AADHAAR", documentHash: aadHash },
        ],
      });
      return user;
    });
  }

  async directoryEmployees(params: any) {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;
    const skip = (page - 1) * limit;
    const where: any = { deleted_at: null, roles: { code: "EMPLOYEE" } };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
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
        orderBy: { created_at: "desc" },
        include: { employee_profiles: true },
      }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id.toString(),
        name: item.name,
        user_code: item.user_code,
        email: item.email,
        mobile: item.mobile,
        status: item.status,
        created_at: item.created_at,
        employee_profiles: item.employee_profiles
          ? { designation: item.employee_profiles.designation }
          : null,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async directoryMasterBrokers(params: any) {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;
    const skip = (page - 1) * limit;
    const where: any = { deleted_at: null, roles: { code: "MASTER_BROKER" } };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
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
        orderBy: { created_at: "desc" },
      }),
    ]);
    const itemsWithBrokerCount = await Promise.all(
      items.map(async (item) => {
        const profile = await this.prisma.master_broker_profiles.findUnique({
          where: { user_id: item.id },
          select: { id: true },
        });
        const brokerCount = profile
          ? await this.prisma.broker_profiles.count({
              where: {
                master_broker_id: profile.id,
                users: { deleted_at: null },
              },
            })
          : 0;

        return {
          id: item.id.toString(),
          name: item.name,
          user_code: item.user_code,
          email: item.email,
          mobile: item.mobile,
          status: item.status,
          created_at: item.created_at,
          brokerCount,
        };
      }),
    );
    return {
      items: itemsWithBrokerCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async directoryMasterBrokerBrokers(masterBrokerId: string, params: any) {
    let masterBrokerIdValue: bigint;
    try {
      masterBrokerIdValue = BigInt(masterBrokerId);
    } catch {
      throw new BadRequestException("Invalid master broker ID");
    }
    const masterBrokerProfile =
      await this.prisma.master_broker_profiles.findUnique({
        where: { user_id: masterBrokerIdValue },
        select: { id: true },
      });
    if (!masterBrokerProfile) {
      throw new NotFoundException("Master broker not found");
    }
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;
    const skip = (page - 1) * limit;
    const where: any = {
      deleted_at: null,
      roles: { code: "BROKER" },
      broker_profiles: { master_broker_id: masterBrokerProfile.id },
    };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
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
        orderBy: { created_at: "desc" },
      }),
    ]);
    return {
      items: items.map((item) => ({
        id: item.id.toString(),
        name: item.name,
        user_code: item.user_code,
        email: item.email,
        mobile: item.mobile,
        status: item.status,
        created_at: item.created_at,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async directoryBrokers(params: any) {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null, role: { name: "BROKER" } };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { userCode: { contains: search } },
      ];
    }
    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { [sortBy]: sortOrder },
        include: { brokerProfile: true },
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

  async getEmployee(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null, role: { name: "EMPLOYEE" } },
      include: { employeeProfile: true },
    });
  }

  async deleteEmployee(id: string) {
    const hasMBs = await this.prisma.masterBrokerProfile.findFirst({
      where: { createdByUserId: id, user: { deletedAt: null } },
    });
    if (hasMBs)
      throw new ForbiddenException(
        "Cannot delete employee with active master brokers",
      );
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
        sessionVersion: { increment: 1 },
      },
    });
    return true;
  }

  async deleteMasterBroker(id: string) {
    const hasBrokers = await this.prisma.brokerProfile.findFirst({
      where: { masterBrokerId: id, user: { deletedAt: null } },
    });
    if (hasBrokers)
      throw new ForbiddenException(
        "Cannot delete master broker with active brokers",
      );
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
        sessionVersion: { increment: 1 },
      },
    });
    return true;
  }

  async deleteBroker(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "INACTIVE",
        sessionVersion: { increment: 1 },
      },
    });
    return true;
  }

  async setEmployeeStatus(id: string, rawStatus: unknown, actorId?: string) {
    return this.toggleUserStatus(id, rawStatus, "EMPLOYEE", "Employee", actorId);
  }

  async setMasterBrokerStatus(
    id: string,
    rawStatus: unknown,
    actorId?: string,
  ) {
    return this.toggleUserStatus(
      id,
      rawStatus,
      "MASTER_BROKER",
      "Master broker",
      actorId,
    );
  }

  async setBrokerStatus(id: string, rawStatus: unknown, actorId?: string) {
    return this.toggleUserStatus(id, rawStatus, "BROKER", "Broker", actorId);
  }

  private async toggleUserStatus(
    id: string,
    rawStatus: unknown,
    roleCode: string,
    entity: string,
    actorId?: string,
  ) {
    const status = normalizeUserStatus(rawStatus);
    if (
      status === "INACTIVE" &&
      actorId &&
      String(actorId) === String(id)
    ) {
      throw new BadRequestException(
        "You cannot deactivate your own account",
      );
    }
    let userId: bigint;
    try {
      userId = BigInt(id);
    } catch {
      throw new BadRequestException("Invalid user ID");
    }
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null, roles: { code: roleCode } },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`${entity} not found`);
    const updated = await this.prisma.users.update({
      where: { id: user.id },
      data: { status, session_version: { increment: 1 } },
    });
    return statusToggleResponse(updated.id, status, entity);
  }
}
