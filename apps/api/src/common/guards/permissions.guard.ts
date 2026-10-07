import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../infra/prisma/prisma.service";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    const perms = await this.prisma.role_permissions.findMany({
      where: { role_id: user.roleId },
      include: { permissions: true },
    });
    const codes = perms.map((permission) => permission.permissions.code);
    return required.some((r) => codes.includes(r));
  }
}
