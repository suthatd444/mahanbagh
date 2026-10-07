import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../infra/prisma/prisma.service";
import { createEmployeeReferralToken } from "../common/utils/employee-referral.util";
import {
  normalizeUserStatus,
  statusToggleResponse,
} from "../common/utils/user-status.util";

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  createMasterBrokerReferral(employeeId: string) {
    return createEmployeeReferralToken(employeeId);
  }

  async downline(
    employeeId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    const employeeUserId = this.toUserId(employeeId);
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 10);
    const skip = (page - 1) * limit;
    const where = { created_by_user_id: employeeUserId };
    const [total, profiles] = await Promise.all([
      this.prisma.master_broker_profiles.count({ where }),
      this.prisma.master_broker_profiles.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { users_master_broker_profiles_user_idTousers: true },
      }),
    ]);

    const items = await Promise.all(
      profiles.map(async (profile) => ({
        id: profile.users_master_broker_profiles_user_idTousers.id.toString(),
        name: profile.users_master_broker_profiles_user_idTousers.name,
        user_code:
          profile.users_master_broker_profiles_user_idTousers.user_code,
        email: profile.users_master_broker_profiles_user_idTousers.email,
        mobile: profile.users_master_broker_profiles_user_idTousers.mobile,
        status: profile.users_master_broker_profiles_user_idTousers.status,
        created_at:
          profile.users_master_broker_profiles_user_idTousers.created_at,
        brokerCount: await this.prisma.broker_profiles.count({
          where: { master_broker_id: profile.id, users: { deleted_at: null } },
        }),
      })),
    );
    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async brokers(
    employeeId: string,
    masterBrokerUserId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    const employeeUserId = this.toUserId(employeeId);
    const masterBrokerId = this.toUserId(masterBrokerUserId);
    const masterBrokerProfile =
      await this.prisma.master_broker_profiles.findFirst({
        where: { user_id: masterBrokerId, created_by_user_id: employeeUserId },
        select: { id: true },
      });
    if (!masterBrokerProfile)
      throw new NotFoundException("Master broker not found");

    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 10);
    const skip = (page - 1) * limit;
    const where = {
      deleted_at: null,
      roles: { code: "BROKER" },
      broker_profiles: { master_broker_id: masterBrokerProfile.id },
    };
    const [total, brokers] = await Promise.all([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);
    return {
      items: brokers.map((broker) => ({
        id: broker.id.toString(),
        name: broker.name,
        user_code: broker.user_code,
        email: broker.email,
        mobile: broker.mobile,
        status: broker.status,
        created_at: broker.created_at,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async allBrokers(
    employeeId: string,
    params: { page?: number; limit?: number } = {},
  ) {
    const employeeUserId = this.toUserId(employeeId);
    const profiles = await this.prisma.master_broker_profiles.findMany({
      where: { created_by_user_id: employeeUserId },
      select: { id: true },
    });
    const masterBrokerIds = profiles.map((profile) => profile.id);
    if (masterBrokerIds.length === 0) {
      return {
        items: [],
        pagination: {
          page: 1,
          limit: Number(params.limit ?? 10),
          total: 0,
          totalPages: 0,
        },
      };
    }

    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 10);
    const skip = (page - 1) * limit;
    const where = {
      deleted_at: null,
      roles: { code: "BROKER" },
      broker_profiles: { master_broker_id: { in: masterBrokerIds } },
    };
    const [total, brokers] = await Promise.all([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
    ]);
    return {
      items: brokers.map((broker) => ({
        id: broker.id.toString(),
        name: broker.name,
        user_code: broker.user_code,
        email: broker.email,
        mobile: broker.mobile,
        status: broker.status,
        created_at: broker.created_at,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async setMasterBrokerStatus(
    employeeId: string,
    masterBrokerUserId: string,
    rawStatus: unknown,
  ) {
    const status = normalizeUserStatus(rawStatus);
    const profile = await this.prisma.master_broker_profiles.findFirst({
      where: {
        user_id: this.toUserId(masterBrokerUserId),
        created_by_user_id: this.toUserId(employeeId),
      },
      select: { user_id: true },
    });
    if (!profile) throw new NotFoundException("Master broker not found");
    const updated = await this.prisma.users.update({
      where: { id: profile.user_id },
      data: { status, session_version: { increment: 1 } },
    });
    return statusToggleResponse(updated.id, status, "Master broker");
  }

  async setBrokerStatus(
    employeeId: string,
    brokerUserId: string,
    rawStatus: unknown,
  ) {
    const status = normalizeUserStatus(rawStatus);
    const broker = await this.prisma.users.findFirst({
      where: {
        id: this.toUserId(brokerUserId),
        deleted_at: null,
        broker_profiles: {
          master_broker_profiles: {
            created_by_user_id: this.toUserId(employeeId),
          },
        },
      },
      select: { id: true },
    });
    if (!broker) throw new NotFoundException("Broker not found");
    const updated = await this.prisma.users.update({
      where: { id: broker.id },
      data: { status, session_version: { increment: 1 } },
    });
    return statusToggleResponse(updated.id, status, "Broker");
  }

  async ownedMasterBrokerProfileId(
    employeeId: string,
    masterBrokerUserId: string,
  ) {
    const profile = await this.prisma.master_broker_profiles.findFirst({
      where: {
        user_id: this.toUserId(masterBrokerUserId),
        created_by_user_id: this.toUserId(employeeId),
      },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException("Master broker not found");
    return profile.id;
  }

  private toUserId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException("Invalid user ID");
    }
  }
}
