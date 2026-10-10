import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

export interface SessionData {
  userId: string;
  sessionVersion: number;
  expiresAt: number;
}

interface LoginOtpData {
  hash: string;
}

interface EnquiryOtpData {
  hash: string;
}

@Injectable()
export class RedisService {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  }

  async setSession(sessionId: string, data: SessionData, ttlSeconds: number) {
    await this.redis.set(
      `sess:${sessionId}`,
      JSON.stringify(data),
      "EX",
      ttlSeconds,
    );
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    const val = await this.redis.get(`sess:${sessionId}`);
    if (!val) return null;
    return JSON.parse(val);
  }

  async delSession(sessionId: string) {
    await this.redis.del(`sess:${sessionId}`);
  }

  async setLoginOtp(mobile: string, hash: string, ttlSeconds: number) {
    await this.redis
      .multi()
      .set(
        `login-otp:${mobile}`,
        JSON.stringify({ hash } satisfies LoginOtpData),
        "EX",
        ttlSeconds,
      )
      .del(`login-otp-attempts:${mobile}`)
      .exec();
  }

  async getLoginOtp(mobile: string): Promise<LoginOtpData | null> {
    const value = await this.redis.get(`login-otp:${mobile}`);
    return value ? JSON.parse(value) : null;
  }

  async incrementLoginOtpAttempts(mobile: string, ttlSeconds: number) {
    const attemptsKey = `login-otp-attempts:${mobile}`;
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) await this.redis.expire(attemptsKey, ttlSeconds);
    return attempts;
  }

  async clearLoginOtp(mobile: string) {
    await this.redis.del(`login-otp:${mobile}`, `login-otp-attempts:${mobile}`);
  }

  async setEnquiryOtp(mobile: string, hash: string, ttlSeconds: number) {
    await this.redis
      .multi()
      .set(
        `enquiry-otp:${mobile}`,
        JSON.stringify({ hash } satisfies EnquiryOtpData),
        "EX",
        ttlSeconds,
      )
      .del(`enquiry-otp-attempts:${mobile}`)
      .exec();
  }

  async getEnquiryOtp(mobile: string): Promise<EnquiryOtpData | null> {
    const value = await this.redis.get(`enquiry-otp:${mobile}`);
    return value ? JSON.parse(value) : null;
  }

  async incrementEnquiryOtpAttempts(mobile: string, ttlSeconds: number) {
    const attemptsKey = `enquiry-otp-attempts:${mobile}`;
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) await this.redis.expire(attemptsKey, ttlSeconds);
    return attempts;
  }

  async clearEnquiryOtp(mobile: string) {
    await this.redis.del(
      `enquiry-otp:${mobile}`,
      `enquiry-otp-attempts:${mobile}`,
    );
  }

  async setEnquiryMobileVerified(mobile: string, ttlSeconds: number) {
    await this.redis.set(`enquiry-verified:${mobile}`, "1", "EX", ttlSeconds);
  }

  async isEnquiryMobileVerified(mobile: string): Promise<boolean> {
    return (await this.redis.exists(`enquiry-verified:${mobile}`)) === 1;
  }

  async clearEnquiryMobileVerified(mobile: string) {
    await this.redis.del(`enquiry-verified:${mobile}`);
  }
}
