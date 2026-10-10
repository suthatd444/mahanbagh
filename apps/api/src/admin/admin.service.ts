import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../infra/prisma/prisma.service";
import {
  normalizeUserStatus,
  statusToggleResponse,
} from "../common/utils/user-status.util";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private toUserId(id: string): bigint {
    try {
      const userId = BigInt(id);
      if (userId <= 0n) throw new Error("invalid");
      return userId;
    } catch {
      throw new BadRequestException("Invalid user ID");
    }
  }

  private async requireUser(id: string, roleCode: string, entity: string) {
    const userId = this.toUserId(id);
    const user = await this.prisma.users.findFirst({
      where: { id: userId, deleted_at: null, roles: { code: roleCode } },
      select: { id: true },
    });
    if (!user) throw new NotFoundException(`${entity} not found`);
    return user;
  }

  private async softDeleteUser(userId: bigint) {
    const now = new Date();
    await this.prisma.users.update({
      where: { id: userId },
      data: {
        deleted_at: now,
        status: "INACTIVE",
        session_version: { increment: 1 },
        updated_at: now,
      },
    });
    return true;
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

  async directoryBrokerDownline(brokerUserId: string, params: any) {
    let brokerIdValue: bigint;
    try {
      brokerIdValue = BigInt(brokerUserId);
    } catch {
      throw new BadRequestException("Invalid broker ID");
    }
    const brokerProfile = await this.prisma.broker_profiles.findUnique({
      where: { user_id: brokerIdValue },
      select: { id: true },
    });
    if (!brokerProfile) {
      throw new NotFoundException("Broker not found");
    }
    const { page = 1, limit = 10, search = "" } = params;
    const skip = (page - 1) * limit;
    const where: any = {
      deleted_at: null,
      roles: { code: "BROKER" },
      broker_profiles: { parent_broker_id: brokerProfile.id },
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
    return {
      items: await Promise.all(
        items.map((item) => this.toBrokerDirectoryItem(item)),
      ),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async directoryBrokers(params: any) {
    const { page = 1, limit = 10, search = "" } = params;
    const skip = (page - 1) * limit;
    const where: any = {
      deleted_at: null,
      roles: { code: "BROKER" },
      broker_profiles: { parent_broker_id: null },
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
    return {
      items: await Promise.all(
        items.map((item) => this.toBrokerDirectoryItem(item)),
      ),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  async deleteEmployee(id: string) {
    const user = await this.requireUser(id, "EMPLOYEE", "Employee");
    const hasBrokers = await this.prisma.broker_profiles.findFirst({
      where: {
        created_by_user_id: user.id,
        users: { deleted_at: null },
      },
      select: { id: true },
    });
    if (hasBrokers)
      throw new ForbiddenException(
        "Cannot delete employee with active brokers",
      );
    return this.softDeleteUser(user.id);
  }

  async deleteBroker(id: string) {
    const user = await this.requireUser(id, "BROKER", "Broker");
    const profile = await this.prisma.broker_profiles.findUnique({
      where: { user_id: user.id },
      select: { id: true },
    });
    if (profile) {
      const hasDownline = await this.prisma.broker_profiles.findFirst({
        where: {
          parent_broker_id: profile.id,
          users: { deleted_at: null },
        },
        select: { id: true },
      });
      if (hasDownline)
        throw new ForbiddenException(
          "Cannot delete broker with active downline brokers",
        );
    }
    return this.softDeleteUser(user.id);
  }

  async setEmployeeStatus(id: string, rawStatus: unknown, actorId?: string) {
    return this.toggleUserStatus(id, rawStatus, "EMPLOYEE", "Employee", actorId);
  }

  async setBrokerStatus(id: string, rawStatus: unknown, actorId?: string) {
    return this.toggleUserStatus(id, rawStatus, "BROKER", "Broker", actorId);
  }

  private async toBrokerDirectoryItem(item: any) {
    const parent = item.broker_profiles?.parent?.users;
    return {
      id: item.id.toString(),
      name: item.name,
      user_code: item.user_code,
      email: item.email,
      mobile: item.mobile,
      status: item.status,
      created_at: item.created_at,
      firm_name: item.broker_profiles?.firm_name ?? null,
      rera_number: item.broker_profiles?.rera_number ?? null,
      parentBroker: parent
        ? { name: parent.name, userCode: parent.user_code }
        : null,
      brokerCount: await this.prisma.broker_profiles.count({
        where: {
          parent_broker_id: item.broker_profiles?.id,
          users: { deleted_at: null },
        },
      }),
    };
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
