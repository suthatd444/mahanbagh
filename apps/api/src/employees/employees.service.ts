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

  createBrokerReferral(employeeId: string) {
    return createEmployeeReferralToken(employeeId);
  }

  async downline(
    employeeId: string,
    params: { page?: number; limit?: number; search?: string } = {},
  ) {
    const employeeUserId = this.toUserId(employeeId);
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 10);
    const skip = (page - 1) * limit;
    const search = String(params.search ?? "").trim();
    const where: any = {
      deleted_at: null,
      roles: { code: "BROKER" },
      broker_profiles: {
        created_by_user_id: employeeUserId,
        parent_broker_id: null,
      },
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { user_code: { contains: search } },
      ];
    }
    const [total, brokers] = await Promise.all([
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
      brokers.map(async (broker) => ({
        id: broker.id.toString(),
        name: broker.name,
        user_code: broker.user_code,
        email: broker.email,
        mobile: broker.mobile,
        status: broker.status,
        created_at: broker.created_at,
        firm_name: broker.broker_profiles?.firm_name ?? null,
        parentBroker: broker.broker_profiles?.parent?.users
          ? {
              name: broker.broker_profiles.parent.users.name,
              userCode: broker.broker_profiles.parent.users.user_code,
            }
          : null,
        brokerCount: await this.prisma.broker_profiles.count({
          where: {
            parent_broker_id: broker.broker_profiles?.id,
            users: { deleted_at: null },
          },
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
    parentBrokerUserId: string,
    params: { page?: number; limit?: number; search?: string } = {},
  ) {
    const employeeUserId = this.toUserId(employeeId);
    const parentUserId = this.toUserId(parentBrokerUserId);
    const parentProfile = await this.prisma.broker_profiles.findFirst({
      where: {
        user_id: parentUserId,
        created_by_user_id: employeeUserId,
      },
      select: { id: true },
    });
    if (!parentProfile) throw new NotFoundException("Broker not found");

    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 10);
    const skip = (page - 1) * limit;
    const search = String(params.search ?? "").trim();
    const where: any = {
      deleted_at: null,
      roles: { code: "BROKER" },
      broker_profiles: { parent_broker_id: parentProfile.id },
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { user_code: { contains: search } },
      ];
    }
    const [total, brokers] = await Promise.all([
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
    return {
      items: await Promise.all(brokers.map(async (broker) => ({
        id: broker.id.toString(),
        name: broker.name,
        user_code: broker.user_code,
        email: broker.email,
        mobile: broker.mobile,
        status: broker.status,
        created_at: broker.created_at,
        firm_name: broker.broker_profiles?.firm_name ?? null,
        parentBroker: broker.broker_profiles?.parent?.users
          ? {
              name: broker.broker_profiles.parent.users.name,
              userCode: broker.broker_profiles.parent.users.user_code,
            }
          : null,
        brokerCount: await this.prisma.broker_profiles.count({
          where: {
            parent_broker_id: broker.broker_profiles?.id,
            users: { deleted_at: null },
          },
        }),
      }))),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async allBrokers(
    employeeId: string,
    params: { page?: number; limit?: number; search?: string } = {},
  ) {
    const employeeUserId = this.toUserId(employeeId);
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 10);
    const skip = (page - 1) * limit;
    const search = String(params.search ?? "").trim();
    const where: any = {
      deleted_at: null,
      roles: { code: "BROKER" },
      broker_profiles: { created_by_user_id: employeeUserId },
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { mobile: { contains: search } },
        { user_code: { contains: search } },
      ];
    }
    const [total, brokers] = await Promise.all([
      this.prisma.users.count({ where }),
      this.prisma.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: { broker_profiles: true },
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
        firm_name: broker.broker_profiles?.firm_name ?? null,
        commission_percentage: broker.broker_profiles?.commission_percentage
          ? String(broker.broker_profiles.commission_percentage)
          : "0",
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
        broker_profiles: { created_by_user_id: this.toUserId(employeeId) },
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

  private toUserId(value: string) {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException("Invalid user ID");
    }
  }
}
