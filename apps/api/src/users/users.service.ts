import { Injectable } from "@nestjs/common";
import { PrismaService } from "../infra/prisma/prisma.service";
import { formatCode } from "../common/utils/code.util";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async generateUserCode(
    roleName: "EMPLOYEE" | "BROKER",
  ): Promise<string> {
    const prefix =
      roleName === "EMPLOYEE"
        ? "EMP"
        : "BRK";
    const existingCodes = await this.prisma.users.findMany({
      where: { user_code: { startsWith: `${prefix}-` } },
      select: { user_code: true },
    });
    const largestCode = existingCodes.reduce((largest, { user_code }) => {
      const suffix = Number(user_code?.slice(prefix.length + 1));
      return Number.isInteger(suffix) && suffix > largest ? suffix : largest;
    }, 0);

    return formatCode(prefix, largestCode + 1);
  }
}
