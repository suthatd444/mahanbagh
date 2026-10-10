import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(AuthGuard)
export class BrowseProjectsController {
  constructor(private projects: ProjectsService) {}

  @Get()
  list(@Query() query: any) {
    return this.projects.listForViewer(query);
  }
}
