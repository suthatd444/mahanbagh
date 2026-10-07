import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../infra/prisma/prisma.service";
import { RegistrationService } from "../common/registration/registration.service";
import { IdentityDocumentFiles } from "../common/uploads/identity-upload";
import { sha256 } from "../common/utils/crypto.util";
import { verifyEmployeeReferralToken } from "../common/utils/employee-referral.util";

@Injectable()
export class PublicService {
  constructor(
    private prisma: PrismaService,
    private registration: RegistrationService,
  ) {}

  async getReferral(token: string) {
    const employeeId = verifyEmployeeReferralToken(token);
    if (employeeId) return { targetRole: "MASTER_BROKER" };

    const referral = await this.prisma.broker_referrals.findFirst({
      where: { token_hash: sha256(token), revoked_at: null, expires_at: { gt: new Date() } },
      include: { master_broker_profiles: { include: { users_master_broker_profiles_user_idTousers: true } } },
    });
    if (!referral) throw new NotFoundException("Invalid or expired referral");
    return {
      targetRole: "BROKER",
      masterBrokerName: referral.master_broker_profiles.users_master_broker_profiles_user_idTousers.name,
    };
  }

  async registerViaReferral(token: string, data: Record<string, string>, files: IdentityDocumentFiles) {
    const employeeId = verifyEmployeeReferralToken(token);
    if (employeeId) {
      return this.registration.createMasterBroker(data, files, employeeId);
    }
    const referral = await this.prisma.broker_referrals.findFirst({
      where: { token_hash: sha256(token), revoked_at: null, expires_at: { gt: new Date() } },
    });
    if (!referral) throw new BadRequestException("Invalid or expired referral");
    return this.registration.createBroker(data, files, referral.master_broker_id);
  }
}
