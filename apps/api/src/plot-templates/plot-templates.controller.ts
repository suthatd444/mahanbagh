import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '@mohan-bagh/shared';
import { PlotTemplatesService } from './plot-templates.service';

@Controller('admin/plot-templates')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.PROJECT_MANAGE)
export class PlotTemplatesController {
  constructor(private templates: PlotTemplatesService) {}

  @Get()
  list() {
    return this.templates.list();
  }

  @Put()
  replace(@Body() body: { templates?: unknown }) {
    return this.templates.replaceAll(body?.templates ?? []);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.templates.remove(id);
  }
}
