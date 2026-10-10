import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../../infra/redis/redis.service';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private redis: RedisService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const sessionId = req.cookies?.sessionId;
    if (!sessionId) throw new UnauthorizedException();
    const session = await this.redis.getSession(sessionId);
    if (!session || session.expiresAt < Date.now()) throw new UnauthorizedException();
    const user = await this.prisma.users.findUnique({
      where: { id: BigInt(session.userId) },
      include: { roles: true },
    });
    if (!user || user.deleted_at || user.status !== 'ACTIVE' || user.session_version !== session.sessionVersion) {
      throw new UnauthorizedException();
    }
    req.user = {
      id: user.id.toString(),
      roleId: user.role_id,
      role: user.roles?.code || '',
      userCode: user.user_code,
      name: user.name,
    };
    req.sessionId = sessionId;
    return true;
  }
}
