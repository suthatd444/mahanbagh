import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { AuthGuard } from '../common/guards/auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '@mohan-bagh/shared';
import { streamDocument } from '../common/utils/stream-document';
import {
  ProjectUploadFiles,
  projectUploadOptions,
} from '../common/uploads/project-upload';
import { ProjectsService } from './projects.service';

const projectFileFields = [
  { name: 'brochure', maxCount: 1 },
  { name: 'photos', maxCount: 12 },
];

function flattenFiles(files?: ProjectUploadFiles): Express.Multer.File[] {
  if (!files) return [];
  return Object.values(files).flat().filter(Boolean) as Express.Multer.File[];
}

@Controller('admin/projects')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.PROJECT_MANAGE)
export class ProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  list(@Query() query: any) {
    return this.projects.list(query);
  }

  @Post()
  @UseInterceptors(FileFieldsInterceptor(projectFileFields, projectUploadOptions))
  create(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: ProjectUploadFiles,
    @Req() req: any,
  ) {
    return this.projects.create(body, flattenFiles(files), req.user?.id);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.projects.detail(id);
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor(projectFileFields, projectUploadOptions))
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, string>,
    @UploadedFiles() files: ProjectUploadFiles,
  ) {
    const updated = await this.projects.updateMeta(id, body);
    const uploads = flattenFiles(files);
    for (const file of uploads) {
      await this.projects.addDocument(
        id,
        file.fieldname === 'brochure' ? 'BROCHURE' : 'PHOTO',
        file,
      );
    }
    return uploads.length ? this.projects.detail(id) : updated;
  }

  @Put(':id/layout')
  saveLayout(@Param('id') id: string, @Body() body: any) {
    return this.projects.saveLayout(id, body);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', projectUploadOptions))
  addDocument(
    @Param('id') id: string,
    @Body() body: Record<string, string>,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const kind = (body.kind ?? 'PHOTO').toUpperCase();
    const allowed = ['BROCHURE', 'PHOTO', 'SOCIETY_DRAWING'];
    return this.projects.addDocument(
      id,
      (allowed.includes(kind) ? kind : 'PHOTO') as any,
      file,
    );
  }

  @Get(':id/documents/:documentId')
  async document(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Res() res: Response,
  ) {
    const file = await this.projects.getDocument(id, documentId);
    return streamDocument(file, res);
  }

  @Delete(':id/documents/:documentId')
  deleteDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    return this.projects.deleteDocument(id, documentId);
  }

  @Patch(':id/plots/:plotId')
  updatePlotStatus(
    @Param('id') id: string,
    @Param('plotId') plotId: string,
    @Body() body: Record<string, string>,
  ) {
    return this.projects.updatePlotStatus(id, plotId, body.status);
  }

  @Get(':id/enquiries')
  listEnquiries(@Param('id') id: string, @Query() query: any) {
    return this.projects.listEnquiries(id, query);
  }

  @Post(':id/plots/:plotId/enquiries')
  createEnquiry(
    @Param('id') id: string,
    @Param('plotId') plotId: string,
    @Body() body: Record<string, string>,
    @Req() req: any,
  ) {
    return this.projects.createEnquiry(id, plotId, body, req.user?.id);
  }

  @Patch(':id/enquiries/:enquiryId')
  updateEnquiry(
    @Param('id') id: string,
    @Param('enquiryId') enquiryId: string,
    @Body() body: Record<string, string>,
  ) {
    return this.projects.updateEnquiry(id, enquiryId, body);
  }

  @Delete(':id/enquiries/:enquiryId')
  deleteEnquiry(
    @Param('id') id: string,
    @Param('enquiryId') enquiryId: string,
  ) {
    return this.projects.deleteEnquiry(id, enquiryId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projects.remove(id);
  }
}
