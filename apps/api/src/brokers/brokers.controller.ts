import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '@mohan-bagh/shared';

@Controller('broker')
@UseGuards(AuthGuard, PermissionsGuard)
export class BrokersController {
  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.PROFILE_UPDATE_OWN)
  dashboard() {
    return { message: 'Broker dashboard' };
  }
}
