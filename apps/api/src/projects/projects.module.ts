import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { PublicProjectsController } from './public-projects.controller';
import { BrowseProjectsController } from './browse-projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [
    ProjectsController,
    PublicProjectsController,
    BrowseProjectsController,
  ],
  providers: [ProjectsService],
})
export class ProjectsModule {}
