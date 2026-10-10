import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { streamDocument } from '../common/utils/stream-document';
import { ProjectsService } from './projects.service';

@Controller('public/projects')
export class PublicProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.projects.viewerDetail(id);
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
}
