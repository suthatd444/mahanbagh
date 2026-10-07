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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileFieldsInterceptor } from "@nestjs/platform-express";
import { AdminService } from "./admin.service";
import { AuthGuard } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard"; 
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@mohan-bagh/shared";
import { RegistrationService } from "../common/registration/registration.service";
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
  ) {}

  @Get("directory/employees")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  employees(@Query() q: any) {
    return this.admin.directoryEmployees(q);
  }

  @Get("directory/master-brokers")
  @RequirePermissions(
    PERMISSIONS.EMPLOYEE_MANAGE,
    PERMISSIONS.MASTER_BROKER_MANAGE,
  )
  masterBrokers(@Query() q: any) {
    return this.admin.directoryMasterBrokers(q);
  }

  @Get("directory/brokers")
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ALL)
  brokers(@Query() q: any) {
    return this.admin.directoryBrokers(q);
  }

  @Get("master-brokers/:id/brokers")
  @RequirePermissions(PERMISSIONS.BROKER_VIEW_ALL)
  masterBrokerBrokers(@Param("id") id: string, @Query() q: any) {
    return this.admin.directoryMasterBrokerBrokers(id, q);
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

  @Post("master-brokers")
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
  async createMasterBroker(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: IdentityDocumentFiles,
  ) {
    const user = await this.registration.createMasterBroker(body, files);
    return {
      status: true,
      message: "Master broker created successfully.",
      data: user,
    };
  }

  @Get("employees/:id")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  getEmployee(@Param("id") id: string) {
    return this.admin.getEmployee(id);
  }

  @Patch("employees/:id/status")
  @RequirePermissions(PERMISSIONS.EMPLOYEE_MANAGE)
  updateEmployeeStatus(@Param("id") id: string, @Body() body: any, @Req() req: any) {
    return this.admin.setEmployeeStatus(id, body?.status, req.user.id);
  }

  @Patch("master-brokers/:id/status")
  @RequirePermissions(
    PERMISSIONS.EMPLOYEE_MANAGE,
    PERMISSIONS.MASTER_BROKER_MANAGE,
  )
  updateMasterBrokerStatus(
    @Param("id") id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.admin.setMasterBrokerStatus(id, body?.status, req.user.id);
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

  @Delete("master-brokers/:id")
  @RequirePermissions(
    PERMISSIONS.EMPLOYEE_MANAGE,
    PERMISSIONS.MASTER_BROKER_MANAGE,
  )
  deleteMasterBroker(@Param("id") id: string) {
    return this.admin.deleteMasterBroker(id);
  }

  @Delete("brokers/:id")
  @RequirePermissions(PERMISSIONS.BROKER_UPDATE_ALL)
  deleteBroker(@Param("id") id: string) {
    return this.admin.deleteBroker(id);
  }
}
