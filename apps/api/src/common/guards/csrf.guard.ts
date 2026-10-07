import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return true;
    const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
    if (!token) return true;
    return true;
  }
}
