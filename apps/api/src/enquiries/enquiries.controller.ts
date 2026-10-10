import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../common/guards/auth.guard";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { PERMISSIONS } from "@mohan-bagh/shared";
import { EnquiriesService } from "./enquiries.service";

@Controller("enquiries")
@UseGuards(AuthGuard, PermissionsGuard)
export class EnquiriesController {
  constructor(private enquiries: EnquiriesService) {}

  @Post("otp/request")
  @RequirePermissions(PERMISSIONS.ENQUIRY_CREATE)
  requestOtp(@Body() body: { mobile?: string }) {
    return this.enquiries.requestOtp(body.mobile);
  }

  @Post("otp/verify")
  @RequirePermissions(PERMISSIONS.ENQUIRY_CREATE)
  verifyOtp(@Body() body: { mobile?: string; otp?: string }) {
    return this.enquiries.verifyOtp(body.mobile, body.otp);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.ENQUIRY_VIEW_OWN)
  list(@Req() req: any, @Query() query: any) {
    return this.enquiries.list(req.user, query);
  }

  @Get("assignees")
  @RequirePermissions(PERMISSIONS.ENQUIRY_MANAGE)
  assignees(@Req() req: any) {
    return this.enquiries.assignees(req.user);
  }

  @Post()
  @RequirePermissions(PERMISSIONS.ENQUIRY_CREATE)
  create(@Req() req: any, @Body() body: any) {
    return this.enquiries.create(req.user, body);
  }

  @Patch(":id")
  @RequirePermissions(PERMISSIONS.ENQUIRY_UPDATE_OWN)
  update(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.enquiries.update(req.user, id, body);
  }
}