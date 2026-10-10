import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { randomInt, randomUUID } from "crypto";
import { PrismaService } from "../infra/prisma/prisma.service";
import { RedisService } from "../infra/redis/redis.service";
import { AuthService } from "../auth/auth.service";
import { sha256 } from "../common/utils/crypto.util";

const ENQUIRY_OTP_TTL_SECONDS = 10 * 60;
const ENQUIRY_OTP_MAX_ATTEMPTS = 5;
const ENQUIRY_VERIFIED_TTL_SECONDS = 30 * 60;
const DUPLICATE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const ENQUIRY_STATUSES = [
  "NEW",
  "CONTACTED",
  "VISITED",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const ASSIGNABLE_ROLES = ["EMPLOYEE", "BROKER"];

interface Actor {
  id: string;
  role: string;
}

@Injectable()
export class EnquiriesService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private auth: AuthService,
  ) {}

  private normalizePhone(value: unknown): string {
    return String(value ?? "").replace(/\D/g, "");
  }

  private assertValidPhone(phone: string) {
    if (!/^[0-9]{10,15}$/.test(phone)) {
      throw new BadRequestException("Enter a valid mobile number");
    }
  }

  async requestOtp(mobileRaw: unknown) {
    const phone = this.normalizePhone(mobileRaw);
    this.assertValidPhone(phone);

    const deliveryMode =
      process.env.OTP_DELIVERY_MODE ??
      (process.env.NODE_ENV === "development" ? "development" : undefined);
    if (deliveryMode !== "development") {
      throw new ServiceUnavailableException(
        "An SMS provider must be configured for OTP delivery",
      );
    }

    const otp = randomInt(100000, 1000000).toString();
    await this.redis.setEnquiryOtp(
      phone,
      sha256(`${phone}:${otp}`),
      ENQUIRY_OTP_TTL_SECONDS,
    );
    await this.auth.sendOtpSms(phone, otp);
    console.info(`[development] Enquiry OTP for ${phone}: ${otp}`);
    return { sent: true };
  }

  async verifyOtp(mobileRaw: unknown, otpRaw: unknown) {
    const phone = this.normalizePhone(mobileRaw);
    this.assertValidPhone(phone);

    const otp = String(otpRaw ?? "");
    const otpData = await this.redis.getEnquiryOtp(phone);
    const submittedHash = sha256(`${phone}:${otp}`);
    const validOtp =
      otpData &&
      otpData.hash.length === submittedHash.length &&
      timingSafeEqual(Buffer.from(otpData.hash), Buffer.from(submittedHash));

    if (!validOtp) {
      const attempts = await this.redis.incrementEnquiryOtpAttempts(
        phone,
        ENQUIRY_OTP_TTL_SECONDS,
      );
      if (attempts >= ENQUIRY_OTP_MAX_ATTEMPTS)
        await this.redis.clearEnquiryOtp(phone);
      throw new BadRequestException("Invalid or expired OTP");
    }

    await this.redis.clearEnquiryOtp(phone);
    await this.redis.setEnquiryMobileVerified(
      phone,
      ENQUIRY_VERIFIED_TTL_SECONDS,
    );
    return { verified: true };
  }

  async create(actor: Actor, body: any) {
    const phone = this.normalizePhone(body.phone);
    this.assertValidPhone(phone);

    const customerName = String(body.customerName ?? "").trim();
    if (!customerName)
      throw new BadRequestException("Customer name is required");

    const verified = await this.redis.isEnquiryMobileVerified(phone);
    if (!verified) {
      throw new BadRequestException(
        "Verify the customer's mobile number before adding the enquiry.",
      );
    }

    const status = String(body.status ?? "NEW").toUpperCase();
    if (!ENQUIRY_STATUSES.includes(status as any)) {
      throw new BadRequestException("Invalid enquiry status");
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - DUPLICATE_WINDOW_MS);

    const existing = await this.prisma.enquiries.findFirst({
      where: { phone, hidden_at: null },
      orderBy: { created_at: "desc" },
      select: { created_at: true },
    });
    if (existing && existing.created_at >= windowStart) {
      throw new BadRequestException(
        "An enquiry for this customer already exists in the system.",
      );
    }

    let assignedToUserId = BigInt(actor.id);
    if (actor.role === "ADMIN" && body.assignedToUserId) {
      const target = await this.prisma.users.findFirst({
        where: {
          id: BigInt(String(body.assignedToUserId)),
          deleted_at: null,
          status: "ACTIVE",
          roles: { code: { in: ASSIGNABLE_ROLES } },
        },
      });
      if (!target) throw new BadRequestException("Invalid assignee selected");
      assignedToUserId = target.id;
    }

    // The most recent active enquiry is older than 30 days, so it can be
    // replaced. Hidden (archived) instead of deleted to keep history.
    if (existing) {
      await this.prisma.enquiries.updateMany({
        where: { phone, hidden_at: null },
        data: { hidden_at: now, updated_at: now },
      });
    }

    const email = body.email ? String(body.email).trim() || null : null;
    const remarks = body.remarks ? String(body.remarks).trim() || null : null;

    const enquiry = await this.prisma.enquiries.create({
      data: {
        uuid: randomUUID(),
        customer_name: customerName,
        phone,
        email,
        remarks,
        status: status as any,
        created_by_user_id: BigInt(actor.id),
        assigned_to_user_id: assignedToUserId,
        mobile_verified_at: now,
        created_at: now,
        updated_at: now,
      },
      include: {
        creator: { include: { roles: true } },
        assignee: { include: { roles: true } },
      },
    });

    await this.redis.clearEnquiryMobileVerified(phone);
    return this.mapEnquiry(enquiry);
  }

  async list(actor: Actor, query: any = {}) {
    const role = actor.role;
    const where: any = {};

    const includeHidden =
      query.includeHidden === "true" || query.includeHidden === "1";
    if (!includeHidden) where.hidden_at = null;

    if (role !== "ADMIN") where.assigned_to_user_id = BigInt(actor.id);

    if (query.status) {
      const status = String(query.status).toUpperCase();
      if (!ENQUIRY_STATUSES.includes(status as any)) {
        throw new BadRequestException("Invalid enquiry status");
      }
      where.status = status as any;
    }

    if (query.assigneeId && role === "ADMIN") {
      where.assigned_to_user_id = BigInt(String(query.assigneeId));
    }

    const search = String(query.search ?? "").trim();
    if (search) {
      where.OR = [
        { customer_name: { contains: search, mode: "insensitive" as any } },
        { phone: { contains: search } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

    const [total, items] = await Promise.all([
      this.prisma.enquiries.count({ where }),
      this.prisma.enquiries.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          creator: { include: { roles: true } },
          assignee: { include: { roles: true } },
        },
      }),
    ]);

    return {
      items: items.map((enquiry) => this.mapEnquiry(enquiry)),
      total,
      page,
      limit,
    };
  }

  async update(actor: Actor, uuid: string, body: any) {
    const enquiry = await this.prisma.enquiries.findFirst({
      where: { uuid, hidden_at: null },
    });
    if (!enquiry) throw new NotFoundException("Enquiry not found");

    if (
      actor.role !== "ADMIN" &&
      enquiry.assigned_to_user_id?.toString() !== actor.id
    ) {
      throw new ForbiddenException(
        "You can only manage enquiries assigned to you.",
      );
    }

    const data: any = { updated_at: new Date() };

    if (body.status !== undefined) {
      const status = String(body.status).toUpperCase();
      if (!ENQUIRY_STATUSES.includes(status as any)) {
        throw new BadRequestException("Invalid enquiry status");
      }
      data.status = status as any;
    }

    if (body.customerName !== undefined) {
      const customerName = String(body.customerName).trim();
      if (!customerName)
        throw new BadRequestException("Customer name is required");
      data.customer_name = customerName;
    }

    if (body.phone !== undefined) {
      const phone = this.normalizePhone(body.phone);
      this.assertValidPhone(phone);
      data.phone = phone;
    }

    if (body.email !== undefined)
      data.email = body.email ? String(body.email).trim() : null;
    if (body.remarks !== undefined)
      data.remarks = body.remarks ? String(body.remarks).trim() : null;

    if (actor.role === "ADMIN" && body.assignedToUserId !== undefined) {
      if (body.assignedToUserId === null) {
        data.assigned_to_user_id = null;
      } else {
        const target = await this.prisma.users.findFirst({
          where: {
            id: BigInt(String(body.assignedToUserId)),
            deleted_at: null,
            status: "ACTIVE",
            roles: { code: { in: ASSIGNABLE_ROLES } },
          },
        });
        if (!target)
          throw new BadRequestException("Invalid assignee selected");
        data.assigned_to_user_id = target.id;
      }
    }

    const updated = await this.prisma.enquiries.update({
      where: { id: enquiry.id },
      data,
      include: {
        creator: { include: { roles: true } },
        assignee: { include: { roles: true } },
      },
    });

    return this.mapEnquiry(updated);
  }

  async assignees(actor: Actor) {
    if (actor.role !== "ADMIN") {
      throw new ForbiddenException("Only admin can assign enquiries");
    }
    const users = await this.prisma.users.findMany({
      where: {
        deleted_at: null,
        status: "ACTIVE",
        roles: { code: { in: ASSIGNABLE_ROLES } },
      },
      orderBy: [{ roles: { code: "asc" as any } }, { name: "asc" }],
      include: { roles: true },
    });
    return users.map((user) => ({
      id: user.id.toString(),
      name: user.name,
      userCode: user.user_code,
      mobile: user.mobile,
      role: user.roles?.code ?? user.roles?.name ?? "",
    }));
  }

  private mapEnquiry(enquiry: any) {
    return {
      id: enquiry.uuid,
      customerName: enquiry.customer_name,
      phone: enquiry.phone,
      email: enquiry.email,
      remarks: enquiry.remarks,
      status: enquiry.status,
      assignedTo: enquiry.assignee
        ? {
            id: enquiry.assignee.id.toString(),
            name: enquiry.assignee.name,
            userCode: enquiry.assignee.user_code,
            role: enquiry.assignee.roles?.code ?? enquiry.assignee.roles?.name,
          }
        : null,
      createdBy: enquiry.creator
        ? {
            id: enquiry.creator.id.toString(),
            name: enquiry.creator.name,
            userCode: enquiry.creator.user_code,
            role: enquiry.creator.roles?.code ?? enquiry.creator.roles?.name,
          }
        : null,
      mobileVerifiedAt: enquiry.mobile_verified_at,
      hiddenAt: enquiry.hidden_at,
      createdAt: enquiry.created_at,
      updatedAt: enquiry.updated_at,
    };
  }
}