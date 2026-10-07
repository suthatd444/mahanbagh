import { Body, Controller, Delete, Get, Param, Patch, Post, Req, Res, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { MasterBrokersService } from './master-brokers.service';
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

@Controller('master-broker')
@UseGuards(AuthGuard, PermissionsGuard)
export class MasterBrokersController {
  constructor(
    private mb: MasterBrokersService,
    private profiles: TeamProfilesService,
  ) {}

  @Get('brokers')
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ASSIGNED)
  getBrokers(@Req() req: any) {
    return this.mb.getAssignedBrokers(req.user.id);
  }

  @Post('brokers')
  @RequirePermissions(PERMISSIONS.BROKER_CREATE)
  async createBroker(@Body() body: any, @Req() req: any) {
    const user = await this.mb.createBrokerByMaster(req.user.id, body);
    return { status: true, message: 'Broker created successfully.', data: user };
  }

  @Get('brokers/:id')
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ASSIGNED)
  getBroker(@Param('id') id: string, @Req() req: any) {
    return this.profiles.getDetail('BROKER', id, {
      actor: 'MASTER_BROKER',
      userId: BigInt(req.user.id),
    });
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
      actor: 'MASTER_BROKER',
      userId: BigInt(req.user.id),
    });
    return streamDocument(file, res);
  }

  @Patch('brokers/:id')
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
  updateBroker(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
    @UploadedFiles() files?: IdentityDocumentFiles,
  ) {
    return this.profiles.update(
      'BROKER',
      id,
      body,
      { actor: 'MASTER_BROKER', userId: BigInt(req.user.id) },
      files,
    );
  }

  @Patch('brokers/:id/status')
  @RequirePermissions(PERMISSIONS.BROKER_UPDATE_ASSIGNED)
  updateBrokerStatus(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.mb.setStatus(req.user.id, id, body?.status);
  }

  @Delete('brokers/:id')
  @RequirePermissions(PERMISSIONS.BROKER_UPDATE_ASSIGNED)
  deleteBroker(@Param('id') id: string, @Req() req: any) {
    return this.mb.deleteAssignedBroker(req.user.id, id);
  }

  @Post('referrals')
  @RequirePermissions(PERMISSIONS.BROKER_CREATE)
  async createReferral(@Req() req: any) {
    const token = await this.mb.createReferral(req.user.id);
    return { status: true, message: 'Referral created successfully.', data: { token } };
  }

  @Get('referrals/current')
  @RequirePermissions(PERMISSIONS.BROKER_CREATE)
  async currentReferral(@Req() req: any) {
    const ref = await this.mb.getCurrentReferral(req.user.id);
    return ref;
  }
}
