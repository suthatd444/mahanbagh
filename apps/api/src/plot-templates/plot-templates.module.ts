import { Module } from '@nestjs/common';
import { PlotTemplatesController } from './plot-templates.controller';
import { PlotTemplatesService } from './plot-templates.service';

@Module({
  controllers: [PlotTemplatesController],
  providers: [PlotTemplatesService],
})
export class PlotTemplatesModule {}
