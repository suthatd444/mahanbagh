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
} from "@nestjs/common";
import type { Response } from "express";
import { streamDocument } from "../common/utils/stream-document";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { AdminService } from "./admin.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@mohan-bagh/shared";
import { RegistrationService } from "../common/registration/registration.service";
import { TeamProfilesService } from "../common/profiles/team-profiles.service";
import {
  IdentityDocumentFiles,
  identityUploadOptions,
} from "../common/uploads/identity-upload";

@Controller("admin")
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private admin: AdminService,
    private registration: RegistrationService,
    private profiles: TeamProfilesService,
  ) {}

  @Get("directory/employees")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  employees(@Query() q: any) {
    return this.admin.directoryEmployees(q);
  }

  @Get("directory/brokers")
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ALL)
  brokers(@Query() q: any) {
    return this.admin.directoryBrokers(q);
  }

  @Get("brokers/:id/downline")
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ALL)
  brokerDownline(@Param("id") id: string, @Query() q: any) {
    return this.admin.directoryBrokerDownline(id, q);
  }

  @Post("employees")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "panDocument", maxCount: 1 },
        { name: "aadhaarDocument", maxCount: 1 },
      ],
      identityUploadOptions,
    ),
  )
  async createEmployee(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: IdentityDocumentFiles,
  ) {
    const user = await this.registration.createEmployee(body, files);
    return {
      status: true,
      message: "Employee created successfully.",
      data: user,
    };
  }

  @Post("brokers")
  @RequirePermissions(PERMISSIONS.BROKER_CREATE)
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
  ) {
    const user = await this.registration.createBroker(body, files);
    return {
      status: true,
      message: "Broker created successfully.",
      data: user,
    };
  }

  @Get("employees/:id")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  getEmployee(@Param("id") id: string) {
    return this.profiles.getDetail("EMPLOYEE", id, { actor: "ADMIN" });
  }

  @Get("users/:id/documents/:type")
  @RequirePermissions(
    PERMISSIONS.EMPLOYEE_MANAGE,
    PERMISSIONS.BROKER_VIEW_ALL,
  )
  async document(
    @Param("id") id: string,
    @Param("type") type: string,
    @Res() res: Response,
  ) {
    const file = await this.profiles.getDocument(id, type, { actor: "ADMIN" });
    return streamDocument(file, res);
  }

  @Patch("employees/:id")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "panDocument", maxCount: 1 },
        { name: "aadhaarDocument", maxCount: 1 },
      ],
      identityUploadOptions,
    ),
  )
  updateEmployee(
    @Param("id") id: string,
    @Body() body: any,
    @UploadedFiles() files?: IdentityDocumentFiles,
  ) {
    return this.profiles.update("EMPLOYEE", id, body, { actor: "ADMIN" }, files);
  }

  @Get("brokers/:id")
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ALL)
  getBroker(@Param("id") id: string) {
    return this.profiles.getDetail("BROKER", id, { actor: "ADMIN" });
  }

  @Patch("brokers/:id")
  @RequirePermissions(PERMISSIONS.BROKER_UPDATE_ALL)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "panDocument", maxCount: 1 },
        { name: "aadhaarDocument", maxCount: 1 },
      ],
      identityUploadOptions,
    ),
  )
  updateBroker(
    @Param("id") id: string,
    @Body() body: any,
    @UploadedFiles() files?: IdentityDocumentFiles,
  ) {
    return this.profiles.update("BROKER", id, body, { actor: "ADMIN" }, files);
  }

  @Patch("employees/:id/status")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  updateEmployeeStatus(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.admin.setEmployeeStatus(id, body?.status, req.user.id);
  }

  @Patch("brokers/:id/status")
  @RequirePermissions(PERMISSIONS.BROKER_UPDATE_ALL)
  updateBrokerStatus(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.admin.setBrokerStatus(id, body?.status, req.user.id);
  }

  @Delete("employees/:id")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  deleteEmployee(@Param("id") id: string) {
    return this.admin.deleteEmployee(id);
  }

  @Delete("brokers/:id")
  @RequirePermissions(PERMISSIONS.BROKER_UPDATE_ALL)
  deleteBroker(@Param("id") id: string) {
    return this.admin.deleteBroker(id);
  }
}
