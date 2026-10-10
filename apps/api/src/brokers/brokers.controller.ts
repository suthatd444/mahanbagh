import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { BrokersService } from './brokers.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '@mohan-bagh/shared';
import { TeamProfilesService } from '../common/profiles/team-profiles.service';
import {
  IdentityDocumentFiles,
  identityUploadOptions,
} from '../common/uploads/identity-upload';
import { streamDocument } from '../common/utils/stream-document';

@Controller('broker')
@UseGuards(AuthGuard, PermissionsGuard)
export class BrokersController {
  constructor(
    private brokers: BrokersService,
    private profiles: TeamProfilesService,
  ) {}

  @Get('dashboard')
  @RequirePermissions(PERMISSIONS.PROFILE_UPDATE_OWN)
  dashboard() {
    return { message: 'Broker dashboard' };
  }

  @Get('downline')
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ASSIGNED)
  getDownline(@Req() req: any, @Query() query: any) {
    return this.brokers.getDownline(req.user.id, query);
  }

  @Post('downline')
  @RequirePermissions(PERMISSIONS.BROKER_CREATE)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'panDocument', maxCount: 1 },
        { name: 'aadhaarDocument', maxCount: 1 },
      ],
      identityUploadOptions,
    ),
  )
  async createDownline(
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles() files?: IdentityDocumentFiles,
  ) {
    const user = await this.brokers.createDownlineBroker(
      req.user.id,
      body,
      files ?? {},
    );
    return {
      status: true,
      message: 'Broker created successfully.',
      data: user,
    };
  }

  @Get('downline/:id')
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ASSIGNED)
  getDownlineBroker(@Param('id') id: string, @Req() req: any) {
    return this.profiles.getDetail('BROKER', id, {
      actor: 'BROKER',
      userId: BigInt(req.user.id),
    });
  }

  @Get('downline/:id/downline')
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ASSIGNED)
  getDownlineOfBroker(@Param('id') id: string, @Req() req: any, @Query() query: any) {
    return this.brokers.getDownlineOfBroker(req.user.id, id, query);
  }

  @Get('users/:id/documents/:type')
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ASSIGNED)
  async document(
    @Param('id') id: string,
    @Param('type') type: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const file = await this.profiles.getDocument(id, type, {
      actor: 'BROKER',
      userId: BigInt(req.user.id),
    });
    return streamDocument(file, res);
  }

  @Patch('downline/:id')
  @RequirePermissions(PERMISSIONS.BROKER_UPDATE_ASSIGNED)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'panDocument', maxCount: 1 },
        { name: 'aadhaarDocument', maxCount: 1 },
      ],
      identityUploadOptions,
    ),
  )
  updateDownline(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles() files?: IdentityDocumentFiles,
  ) {
    return this.profiles.update(
      'BROKER',
      id,
      body,
      { actor: 'BROKER', userId: BigInt(req.user.id) },
      files,
    );
  }

  @Patch('downline/:id/status')
  @RequirePermissions(PERMISSIONS.BROKER_UPDATE_ASSIGNED)
  updateDownlineStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.brokers.setStatus(req.user.id, id, body?.status);
  }

  @Delete('downline/:id')
  @RequirePermissions(PERMISSIONS.BROKER_UPDATE_ASSIGNED)
  deleteDownline(@Param('id') id: string, @Req() req: any) {
    return this.brokers.deleteDownlineBroker(req.user.id, id);
  }

  @Post('referrals')
  @RequirePermissions(PERMISSIONS.BROKER_CREATE)
  async createReferral(@Req() req: any) {
    const token = await this.brokers.createReferral(req.user.id);
    return {
      status: true,
      message: 'Referral created successfully.',
      data: { token },
    };
  }

  @Get('referrals/current')
  @RequirePermissions(PERMISSIONS.BROKER_CREATE)
  async currentReferral(@Req() req: any) {
    const ref = await this.brokers.getCurrentReferral(req.user.id);
    return ref;
  }
}
