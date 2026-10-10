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
    if (employeeId) return { targetRole: "BROKER", parentBrokerName: null };

    const referral = await this.prisma.broker_referrals.findFirst({
      where: {
        token_hash: sha256(token),
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      include: { broker_profiles: { include: { users: true } } },
    });
    if (!referral) throw new NotFoundException("Invalid or expired referral");
    return {
      targetRole: "BROKER",
      parentBrokerName: referral.broker_profiles.users.name,
    };
  }

  async registerViaReferral(
    token: string,
    data: Record<string, string>,
    files: IdentityDocumentFiles,
  ) {
    const employeeId = verifyEmployeeReferralToken(token);
    if (employeeId) {
      return this.registration.createBroker(data, files, {
        createdByUserId: employeeId,
      });
    }
    const referral = await this.prisma.broker_referrals.findFirst({
      where: {
        token_hash: sha256(token),
        revoked_at: null,
        expires_at: { gt: new Date() },
      },
      include: { broker_profiles: { select: { created_by_user_id: true } } },
    });
    if (!referral) throw new BadRequestException("Invalid or expired referral");
    return this.registration.createBroker(data, files, {
      parentBrokerProfileId: referral.broker_id,
      createdByUserId: referral.broker_profiles.created_by_user_id
        ? referral.broker_profiles.created_by_user_id.toString()
        : undefined,
    });
  }
}
