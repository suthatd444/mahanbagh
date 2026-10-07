import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { EmployeesService } from "./employees.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@mohan-bagh/shared";
import { RegistrationService } from "../common/registration/registration.service";
import {
  IdentityDocumentFiles,
  identityUploadOptions,
} from "../common/uploads/identity-upload";

@Controller("employee")
@UseGuards(AuthGuard, PermissionsGuard)
export class EmployeesController {
  constructor(
    private emp: EmployeesService,
    private registration: RegistrationService,
  ) {}

  @Get("downline")
  @RequirePermissions(PERMISSIONS.MASTER_BROKER_MANAGE)
  downline(@Req() req: any, @Query() q: any) {
    return this.emp.downline(req.user.id, q);
  }

  @Post("referrals")
  @RequirePermissions(PERMISSIONS.MASTER_BROKER_MANAGE)
  createReferral(@Req() req: { user: { id: string } }) {
    const token = this.emp.createMasterBrokerReferral(req.user.id);
    return {
      status: true,
      message: "Master broker referral link created.",
      data: { token },
    };
  }

  @Get("brokers")
  @RequirePermissions(
    PERMISSIONS.MASTER_BROKER_MANAGE,
    PERMISSIONS.BROKER_CREATE,
  )
  allBrokers(@Req() req: any, @Query() q: any) {
    return this.emp.allBrokers(req.user.id, q);
  }

  @Get("master-brokers/:id/brokers")
  @RequirePermissions(PERMISSIONS.MASTER_BROKER_MANAGE)
  brokers(@Req() req: any, @Param("id") id: string, @Query() q: any) {
    return this.emp.brokers(req.user.id, id, q);
  }

  @Patch("master-brokers/:id/status")
  @RequirePermissions(PERMISSIONS.MASTER_BROKER_MANAGE)
  updateMasterBrokerStatus(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: { user: { id: string } },
  ) {
    return this.emp.setMasterBrokerStatus(req.user.id, id, body?.status);
  }

  @Patch("brokers/:id/status")
  @RequirePermissions(PERMISSIONS.MASTER_BROKER_MANAGE)
  updateBrokerStatus(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: { user: { id: string } },
  ) {
    return this.emp.setBrokerStatus(req.user.id, id, body?.status);
  }

  @Post("master-brokers")
  @RequirePermissions(PERMISSIONS.MASTER_BROKER_MANAGE)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "panDocument", maxCount: 1 },
        { name: "aadhaarDocument", maxCount: 1 },
      ],
      identityUploadOptions,
    ),
  )
  createMB(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: IdentityDocumentFiles,
    @Req() req: { user: { id: string } },
  ) {
    return this.registration.createMasterBroker(body, files, req.user.id);
  }

  @Post("brokers")
  @RequirePermissions(
    PERMISSIONS.MASTER_BROKER_MANAGE,
    PERMISSIONS.BROKER_CREATE,
  )
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "panDocument", maxCount: 1 },
        { name: "aadhaarDocument", maxCount: 1 },
      ],
      identityUploadOptions,
    ),
  )
  async createBroker(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: IdentityDocumentFiles,
    @Req() req: { user: { id: string } },
  ) {
    const masterBrokerProfileId = await this.emp.ownedMasterBrokerProfileId(
      req.user.id,
      body.masterBrokerId,
    );
    const user = await this.registration.createBroker(
      body,
      files,
      masterBrokerProfileId,
    );
    return {
      status: true,
      message: "Broker created successfully.",
      data: user,
    };
  }
}
