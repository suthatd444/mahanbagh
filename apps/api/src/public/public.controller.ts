import { Body, Controller, Get, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PublicService } from './public.service';
import { IdentityDocumentFiles, identityUploadOptions } from '../common/uploads/identity-upload';

@Controller('public')
export class PublicController {
  constructor(private pub: PublicService) {}

  @Get('referrals/:token')
  async getReferral(@Param('token') token: string) {
    return this.pub.getReferral(token);
  }

  @Post('referrals/:token/register')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'panDocument', maxCount: 1 }, { name: 'aadhaarDocument', maxCount: 1 }], identityUploadOptions))
  async register(@Param('token') token: string, @Body() body: Record<string, string>, @UploadedFiles() files: IdentityDocumentFiles) {
    const user = await this.pub.registerViaReferral(token, body, files);
    return { status: true, message: 'Registration successful.', data: user };
  }
}
