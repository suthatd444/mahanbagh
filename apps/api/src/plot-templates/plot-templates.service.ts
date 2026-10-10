import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../infra/prisma/prisma.service';

interface TemplateInput {
  id?: string;
  name?: string;
  shape?: string;
  [key: string]: unknown;
}

@Injectable()
export class PlotTemplatesService {
  constructor(private prisma: PrismaService) {}

  private mapTemplate(row: any) {
    const dimensions = (row.dimensions ?? {}) as Record<string, unknown>;
    return {
      id: row.uuid,
      name: row.name,
      shape: row.shape,
      ...dimensions,
    };
  }

  async list() {
    const rows = await this.prisma.plot_templates.findMany({
      orderBy: { created_at: 'asc' },
    });
    return rows.map((row) => this.mapTemplate(row));
  }

  async replaceAll(input: unknown) {
    if (!Array.isArray(input)) {
      throw new BadRequestException('Templates must be an array');
    }

    const now = new Date();
    const rows = input.map((template) =>
      this.toRow(template as TemplateInput, now),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.plot_templates.deleteMany({});
      if (rows.length) {
        await tx.plot_templates.createMany({ data: rows });
      }
    });

    return this.list();
  }

  async remove(uuid: string) {
    await this.prisma.plot_templates.deleteMany({ where: { uuid } });
    return { id: uuid, deleted: true };
  }

  private toRow(template: TemplateInput, now: Date) {
    const shape = String(template.shape ?? '').toUpperCase();
    if (shape !== 'RECTANGLE' && shape !== 'TRAPEZOID') {
      throw new BadRequestException('Unsupported plot template shape');
    }

    const { id, name, shape: _shape, ...rest } = template;
    const dimensions: Record<string, number> = {};
    for (const [key, value] of Object.entries(rest)) {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) dimensions[key] = numeric;
    }

    const trimmedName = (name ?? '').toString().trim();

    return {
      uuid: typeof id === 'string' && id.length === 36 ? id : randomUUID(),
      name: trimmedName || this.defaultName(shape, dimensions),
      shape: shape as Prisma.plot_templatesCreateManyInput['shape'],
      dimensions: dimensions as Prisma.InputJsonValue,
      created_at: now,
      updated_at: now,
    };
  }

  private defaultName(shape: string, dimensions: Record<string, number>) {
    if (shape === 'RECTANGLE') {
      return `${dimensions.frontageFeet ?? 0} x ${dimensions.depthFeet ?? 0} ft`;
    }
    return `${dimensions.frontFeet ?? 0}/${dimensions.backFeet ?? 0} ft trapezoid`;
  }
}
