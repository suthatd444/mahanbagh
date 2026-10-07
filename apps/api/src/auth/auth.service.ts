import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../infra/prisma/prisma.service";
import { RedisService } from "../infra/redis/redis.service";
import { sha256 } from "../common/utils/crypto.util";
import { randomInt, randomUUID, timingSafeEqual } from "crypto";

const LOGIN_OTP_TTL_SECONDS = 10 * 60;
const MAX_LOGIN_OTP_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) { }

  async requestMobileOtp(mobile: string) {
    const deliveryMode =
      process.env.OTP_DELIVERY_MODE ??
      (process.env.NODE_ENV === "development" ? "development" : undefined);
    if (deliveryMode !== "development") {
      throw new ServiceUnavailableException(
        "An SMS provider must be configured for OTP delivery",
      );
    }
    if (!/^[0-9]{10,15}$/.test(mobile)) {
      throw new BadRequestException("Enter a valid mobile number");
    }

    const user = await this.prisma.users.findFirst({
      where: { mobile, deleted_at: null, status: "ACTIVE" },
    });
    if (!user) return;

    const otp = randomInt(100000, 1000000).toString();
    await this.redis.setLoginOtp(
      mobile,
      sha256(`${mobile}:${otp}`),
      LOGIN_OTP_TTL_SECONDS,
    );
    await this.sendOtpSms(mobile, otp);
    console.info(`[development] Login OTP for ${mobile}: ${otp}`);
  }

  async sendOtpSms(mobile: string, otp: string): Promise<any> {
    const message = `Dear User, ${otp} is the OTP for your mobile number verification. PLS DO NOT SHARE WITH ANYONE. iAgency By Bima House`;

    const apiUrl =
      `http://msg.mtalkz.com/V2/http-api.php` +
      `?apikey=${encodeURIComponent('E3NPvOoPG6NXUwIT')}` +
      `&senderid=${encodeURIComponent('BIMIAG')}` +
      `&number=${encodeURIComponent(mobile)}` +
      `&message=${encodeURIComponent(message)}` +
      `&format=json`;

    try {
      const response = await fetch(apiUrl);
   
      if (!response.ok) {
        throw new Error(`SMS API returned HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('SMS API response status:', response.status,data);
      return data;
    } catch (error) {
      console.error('Failed to send OTP SMS:', error);
      throw new Error('Unable to send OTP SMS');
    }
  }

  async verifyMobileOtp(
    mobile: string,
    otp: string,
    ip?: string,
    userAgent?: string,
  ) {
    const identifierHash = sha256(mobile);
    const user = await this.prisma.users.findFirst({ where: { mobile } });
    const otpData = await this.redis.getLoginOtp(mobile);
    const submittedHash = sha256(`${mobile}:${otp}`);
    const validOtp =
      otpData &&
      otpData.hash.length === submittedHash.length &&
      timingSafeEqual(Buffer.from(otpData.hash), Buffer.from(submittedHash));

    if (!validOtp) {
      const attempts = await this.redis.incrementLoginOtpAttempts(
        mobile,
        LOGIN_OTP_TTL_SECONDS,
      );
      if (attempts >= MAX_LOGIN_OTP_ATTEMPTS)
        await this.redis.clearLoginOtp(mobile);
      await this.recordLoginAttempt(
        identifierHash,
        attempts >= MAX_LOGIN_OTP_ATTEMPTS ? "LOCKED" : "FAILURE",
        "invalid_otp",
        ip,
        userAgent,
        user?.id,
      );
      throw new UnauthorizedException("Invalid or expired OTP");
    }

    await this.redis.clearLoginOtp(mobile);
    if (!user || user.status !== "ACTIVE" || user.deleted_at) {
      await this.recordLoginAttempt(
        identifierHash,
        "FAILURE",
        "inactive",
        ip,
        userAgent,
        user?.id,
      );
      throw new UnauthorizedException("Invalid or expired OTP");
    }
    if (user.locked_until && user.locked_until > new Date()) {
      await this.recordLoginAttempt(
        identifierHash,
        "LOCKED",
        "account_locked",
        ip,
        userAgent,
        user.id,
      );
      throw new UnauthorizedException("Account is locked");
    }

    await this.prisma.users.update({
      where: { id: user.id },
      data: { failed_login_attempts: 0, locked_until: null },
    });
    await this.recordLoginAttempt(
      identifierHash,
      "SUCCESS",
      undefined,
      ip,
      userAgent,
      user.id,
    );
    return this.createSession(user);
  }

  private async createSession(user: {
    id: bigint;
    name: string;
    email: string | null;
    mobile: string;
    user_code: string | null;
    role_id: bigint;
    session_version: number;
  }) {
    const sessionId = randomUUID();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    await this.redis.setSession(
      sessionId,
      {
        userId: user.id.toString(),
        sessionVersion: user.session_version,
        expiresAt,
      },
      7 * 24 * 60 * 60,
    );
    return {
      sessionId,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        userCode: user.user_code,
        roleId: user.role_id.toString(),
      },
    };
  }

  private async recordLoginAttempt(
    identifierHash: string,
    status: "SUCCESS" | "FAILURE" | "LOCKED",
    failureReason: string | undefined,
    ip: string | undefined,
    userAgent: string | undefined,
    userId?: bigint,
  ) {
    await this.prisma.login_attempts.create({
      data: {
        user_id: userId,
        identifier_hash: identifierHash,
        ip_address: ip ?? "",
        user_agent: userAgent ?? "",
        status,
        failure_reason: failureReason,
        created_at: new Date(),
      },
    });
  }

  async logout(sessionId: string) {
    await this.redis.delSession(sessionId);
  }
}
