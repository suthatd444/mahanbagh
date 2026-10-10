import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../infra/prisma/prisma.service';
import { StoredDocument } from '../common/utils/stream-document';
import { fileStoragePath } from '../common/uploads/project-upload';

type ProjectDocumentKind = 'BROCHURE' | 'PHOTO' | 'SOCIETY_DRAWING';

const PLOT_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'SOLD',
  'BLOCKED',
  'HOLD',
  'NOT_FOR_SALE',
] as const;

const ENQUIRY_STATUSES = [
  'NEW',
  'CONTACTED',
  'VISITED',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;

interface LayoutPlot {
  id?: string;
  blockId?: string;
  plotNo: string;
  status?: string;
  plotType?: string;
  color?: string;
  areaSqft?: number;
  areaSqm?: number;
  perimeterMeters?: number;
  frontageMeters?: number;
  depthMeters?: number;
  sideLengths?: number[];
  facing?: string;
  roadWidthMeters?: number;
  price?: number;
  geometry: unknown;
}

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  private async requireProject(uuid: string) {
    const project = await this.prisma.projects.findFirst({
      where: { uuid, deleted_at: null },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private documentUrl(
    projectUuid: string,
    documentUuid: string,
    base = '/admin/projects',
  ) {
    return `${base}/${projectUuid}/documents/${documentUuid}`;
  }

  async list(params: any) {
    const page = Number(params.page ?? 1);
    const limit = Number(params.limit ?? 20);
    const search = String(params.search ?? '').trim();
    const skip = (page - 1) * limit;

    const where: Prisma.projectsWhereInput = {
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { city: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.projects.count({ where }),
      this.prisma.projects.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          project_documents: true,
          _count: { select: { project_plots: true } },
        },
      }),
    ]);

    return {
      items: items.map((project) => {
        const photos = project.project_documents.filter(
          (document) => document.kind === 'PHOTO',
        );
        const brochure = project.project_documents.find(
          (document) => document.kind === 'BROCHURE',
        );
        return {
          id: project.uuid,
          name: project.name,
          code: project.code,
          description: project.description,
          city: project.city,
          state: project.state,
          latitude: Number(project.latitude),
          longitude: Number(project.longitude),
          plotCount: project._count.project_plots,
          photoCount: photos.length,
          hasBrochure: Boolean(brochure),
          coverPhotoUrl: photos[0]
            ? this.documentUrl(project.uuid, photos[0].uuid)
            : null,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async detail(uuid: string) {
    const project = await this.prisma.projects.findFirst({
      where: { uuid, deleted_at: null },
      include: {
        project_plots: { orderBy: { created_at: 'asc' } },
        project_documents: { orderBy: { sort_order: 'asc' } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.mapProject(project);
  }

  async listForViewer(params: any) {
    const page = Number(params.page ?? 1);
    const limit = Math.min(Number(params.limit ?? 50), 100);
    const search = String(params.search ?? '').trim();
    const skip = (page - 1) * limit;

    const where: Prisma.projectsWhereInput = {
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { code: { contains: search } },
              { city: { contains: search } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.projects.count({ where }),
      this.prisma.projects.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          project_documents: true,
          _count: { select: { project_plots: true } },
        },
      }),
    ]);

    return {
      items: items.map((project) => {
        const photos = project.project_documents.filter(
          (document) => document.kind === 'PHOTO',
        );
        const brochure = project.project_documents.find(
          (document) => document.kind === 'BROCHURE',
        );
        return {
          id: project.uuid,
          name: project.name,
          code: project.code,
          description: project.description,
          city: project.city,
          state: project.state,
          latitude: Number(project.latitude),
          longitude: Number(project.longitude),
          plotCount: project._count.project_plots,
          photoCount: photos.length,
          hasBrochure: Boolean(brochure),
          coverPhotoUrl: photos[0]
            ? this.documentUrl(project.uuid, photos[0].uuid, '/public/projects')
            : null,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async viewerDetail(uuid: string) {
    const project = await this.prisma.projects.findFirst({
      where: { uuid, deleted_at: null },
      include: {
        project_plots: { orderBy: { created_at: 'asc' } },
        project_documents: { orderBy: { sort_order: 'asc' } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.mapProject(project, '/public/projects');
  }

  async create(body: Record<string, string>, files: Express.Multer.File[] = [], actorId?: string) {
    const name = (body.name ?? '').trim();
    if (!name) throw new BadRequestException('Project name is required');

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }

    const now = new Date();
    const documentRows = files.map((file, index) => ({
      uuid: randomUUID(),
      kind: file.fieldname === 'brochure' ? 'BROCHURE' : 'PHOTO',
      storage_path: fileStoragePath(file),
      original_name: file.originalname,
      mime_type: file.mimetype,
      size_bytes: file.size,
      sort_order: index,
      created_at: now,
    })) as Prisma.project_documentsCreateWithoutProjectsInput[];

    const project = await this.prisma.projects.create({
      data: {
        uuid: randomUUID(),
        code: body.code?.trim() || null,
        name,
        description: body.description?.trim() || null,
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        latitude,
        longitude,
        blocks: [],
        created_by_user_id: actorId ? BigInt(actorId) : null,
        created_at: now,
        updated_at: now,
        project_documents: documentRows.length
          ? { create: documentRows }
          : undefined,
      },
      include: { project_documents: true, project_plots: true },
    });

    return this.mapProject(project);
  }

  async updateMeta(uuid: string, body: Record<string, string>) {
    await this.requireProject(uuid);

    const data: Prisma.projectsUpdateInput = { updated_at: new Date() };
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) throw new BadRequestException('Project name is required');
      data.name = name;
    }
    if (body.code !== undefined) data.code = body.code.trim() || null;
    if (body.description !== undefined)
      data.description = body.description.trim() || null;
    if (body.address !== undefined) data.address = body.address.trim() || null;
    if (body.city !== undefined) data.city = body.city.trim() || null;
    if (body.state !== undefined) data.state = body.state.trim() || null;
    if (body.latitude !== undefined) {
      const latitude = Number(body.latitude);
      if (!Number.isFinite(latitude))
        throw new BadRequestException('Valid latitude is required');
      data.latitude = latitude;
    }
    if (body.longitude !== undefined) {
      const longitude = Number(body.longitude);
      if (!Number.isFinite(longitude))
        throw new BadRequestException('Valid longitude is required');
      data.longitude = longitude;
    }

    await this.prisma.projects.update({ where: { uuid }, data });
    return this.detail(uuid);
  }

  async saveLayout(uuid: string, body: any) {
    const project = await this.requireProject(uuid);

    const now = new Date();
    const data: Prisma.projectsUpdateInput = { updated_at: now };

    if (body.name !== undefined && String(body.name).trim())
      data.name = String(body.name).trim();
    if (body.description !== undefined)
      data.description = body.description ? String(body.description) : null;
    if (body.address !== undefined)
      data.address = body.address ? String(body.address) : null;
    if (body.city !== undefined)
      data.city = body.city ? String(body.city) : null;
    if (body.state !== undefined)
      data.state = body.state ? String(body.state) : null;
    if (body.latitude !== undefined) data.latitude = Number(body.latitude);
    if (body.longitude !== undefined) data.longitude = Number(body.longitude);

    if (body.blocks !== undefined)
      data.blocks = (body.blocks ?? []) as Prisma.InputJsonValue;
    if (body.societyDrawing !== undefined)
      data.society_drawing =
        body.societyDrawing === null
          ? Prisma.JsonNull
          : (body.societyDrawing as Prisma.InputJsonValue);
    if (body.societyBoundary !== undefined)
      data.society_boundary =
        body.societyBoundary === null
          ? Prisma.JsonNull
          : (body.societyBoundary as Prisma.InputJsonValue);
    if (body.facilityLabels !== undefined)
      data.facility_labels = (body.facilityLabels ??
        []) as Prisma.InputJsonValue;

    await this.prisma.$transaction(async (tx) => {
      await tx.projects.update({ where: { uuid }, data });

      if (Array.isArray(body.plots)) {
        const plots = body.plots as LayoutPlot[];
        const existing = await tx.project_plots.findMany({
          where: { project_id: project.id },
          select: { id: true, uuid: true },
        });
        const existingByUuid = new Map(
          existing.map((row) => [row.uuid, row.id]),
        );

        const incomingUuids = new Set<string>();
        for (const plot of plots) {
          const plotUuid =
            plot.id && plot.id.length === 36 ? plot.id : randomUUID();
          incomingUuids.add(plotUuid);

          const fields = {
            block_id: plot.blockId ?? null,
            plot_no: String(plot.plotNo),
            status: (plot.status ?? 'AVAILABLE') as any,
            plot_type: (plot.plotType ?? 'NORMAL') as any,
            color: plot.color ?? null,
            area_sqft: plot.areaSqft ?? null,
            area_sqm: plot.areaSqm ?? null,
            perimeter_meters: plot.perimeterMeters ?? null,
            frontage_meters: plot.frontageMeters ?? null,
            depth_meters: plot.depthMeters ?? null,
            side_lengths: (plot.sideLengths ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            facing: plot.facing ?? null,
            road_width_meters: plot.roadWidthMeters ?? null,
            price: plot.price ?? null,
            geometry: (plot.geometry ?? null) as Prisma.InputJsonValue,
            updated_at: now,
          };

          const existingId = existingByUuid.get(plotUuid);
          if (existingId) {
            await tx.project_plots.update({
              where: { id: existingId },
              data: fields,
            });
          } else {
            await tx.project_plots.create({
              data: {
                uuid: plotUuid,
                project_id: project.id,
                created_at: now,
                ...fields,
              },
            });
          }
        }

        const removedIds = existing
          .filter((row) => !incomingUuids.has(row.uuid))
          .map((row) => row.id);
        if (removedIds.length > 0) {
          await tx.project_plots.deleteMany({
            where: { id: { in: removedIds } },
          });
        }
      }
    });

    return this.detail(uuid);
  }

  async addDocument(
    uuid: string,
    kind: ProjectDocumentKind,
    file: Express.Multer.File,
  ) {
    const project = await this.requireProject(uuid);
    const now = new Date();

    if (kind === 'BROCHURE') {
      const existing = await this.prisma.project_documents.findMany({
        where: { project_id: project.id, kind: 'BROCHURE' },
      });
      if (existing.length) {
        await this.prisma.project_documents.deleteMany({
          where: { id: { in: existing.map((document) => document.id) } },
        });
      }
    }

    const document = await this.prisma.project_documents.create({
      data: {
        uuid: randomUUID(),
        project_id: project.id,
        kind,
        storage_path: fileStoragePath(file),
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
        sort_order: 0,
        created_at: now,
      },
    });

    return {
      id: document.uuid,
      kind: document.kind,
      originalName: document.original_name,
      url: this.documentUrl(project.uuid, document.uuid),
    };
  }

  async getDocument(
    uuid: string,
    documentUuid: string,
  ): Promise<StoredDocument> {
    const project = await this.requireProject(uuid);
    const document = await this.prisma.project_documents.findFirst({
      where: { uuid: documentUuid, project_id: project.id },
    });
    if (!document) throw new NotFoundException('Document not found');
    return {
      storagePath: document.storage_path,
      mimeType: document.mime_type,
      originalName: document.original_name,
    };
  }

  async deleteDocument(uuid: string, documentUuid: string) {
    const project = await this.requireProject(uuid);
    const document = await this.prisma.project_documents.findFirst({
      where: { uuid: documentUuid, project_id: project.id },
    });
    if (!document) throw new NotFoundException('Document not found');
    await this.prisma.project_documents.delete({
      where: { id: document.id },
    });
    return { id: documentUuid, deleted: true };
  }

  async updatePlotStatus(uuid: string, plotUuid: string, status: string) {
    const project = await this.requireProject(uuid);
    const normalized = String(status).toUpperCase();
    if (!PLOT_STATUSES.includes(normalized as any)) {
      throw new BadRequestException('Invalid plot status');
    }
    const plot = await this.prisma.project_plots.findFirst({
      where: { uuid: plotUuid, project_id: project.id },
    });
    if (!plot) throw new NotFoundException('Plot not found');

    const updated = await this.prisma.project_plots.update({
      where: { id: plot.id },
      data: { status: normalized as any, updated_at: new Date() },
    });
    return { id: updated.uuid, status: updated.status };
  }

  async listEnquiries(uuid: string, params: any = {}) {
    const project = await this.requireProject(uuid);
    const where: Prisma.plot_enquiriesWhereInput = {
      project_id: project.id,
    };

    if (params.plotId) {
      const plot = await this.prisma.project_plots.findFirst({
        where: { uuid: String(params.plotId), project_id: project.id },
      });
      if (!plot) throw new NotFoundException('Plot not found');
      where.plot_id = plot.id;
    }

    const enquiries = await this.prisma.plot_enquiries.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: { project_plots: true, projects: true },
    });

    return { items: enquiries.map((enquiry) => this.mapEnquiry(enquiry)) };
  }

  async createEnquiry(
    uuid: string,
    plotUuid: string,
    body: any,
    actorId?: string,
  ) {
    const project = await this.requireProject(uuid);
    const plot = await this.prisma.project_plots.findFirst({
      where: { uuid: plotUuid, project_id: project.id },
    });
    if (!plot) throw new NotFoundException('Plot not found');

    const customerName = String(
      body.customerName ?? body.name ?? '',
    ).trim();
    if (!customerName)
      throw new BadRequestException('Customer name is required');

    const phone = String(body.phone ?? '').replace(/\D/g, '');
    if (phone.length < 10)
      throw new BadRequestException('Valid phone number is required');

    const status = String(body.status ?? 'NEW').toUpperCase();
    if (!ENQUIRY_STATUSES.includes(status as any)) {
      throw new BadRequestException('Invalid enquiry status');
    }

    const now = new Date();
    const enquiry = await this.prisma.plot_enquiries.create({
      data: {
        uuid: randomUUID(),
        project_id: project.id,
        plot_id: plot.id,
        customer_name: customerName,
        phone,
        email: body.email ? String(body.email).trim() : null,
        message: body.message ? String(body.message) : null,
        status: status as any,
        created_by_user_id: actorId ? BigInt(actorId) : null,
        created_at: now,
        updated_at: now,
      },
      include: { project_plots: true, projects: true },
    });

    return this.mapEnquiry(enquiry);
  }

  async updateEnquiry(uuid: string, enquiryUuid: string, body: any) {
    const project = await this.requireProject(uuid);
    const enquiry = await this.prisma.plot_enquiries.findFirst({
      where: { uuid: enquiryUuid, project_id: project.id },
    });
    if (!enquiry) throw new NotFoundException('Enquiry not found');

    const data: Prisma.plot_enquiriesUpdateInput = { updated_at: new Date() };
    if (body.customerName !== undefined || body.name !== undefined) {
      const customerName = String(
        body.customerName ?? body.name ?? '',
      ).trim();
      if (!customerName)
        throw new BadRequestException('Customer name is required');
      data.customer_name = customerName;
    }
    if (body.phone !== undefined) {
      const phone = String(body.phone).replace(/\D/g, '');
      if (phone.length < 10)
        throw new BadRequestException('Valid phone number is required');
      data.phone = phone;
    }
    if (body.email !== undefined)
      data.email = body.email ? String(body.email).trim() : null;
    if (body.message !== undefined)
      data.message = body.message ? String(body.message) : null;
    if (body.status !== undefined) {
      const status = String(body.status).toUpperCase();
      if (!ENQUIRY_STATUSES.includes(status as any)) {
        throw new BadRequestException('Invalid enquiry status');
      }
      data.status = status as any;
    }

    const updated = await this.prisma.plot_enquiries.update({
      where: { id: enquiry.id },
      data,
      include: { project_plots: true, projects: true },
    });
    return this.mapEnquiry(updated);
  }

  async deleteEnquiry(uuid: string, enquiryUuid: string) {
    const project = await this.requireProject(uuid);
    const enquiry = await this.prisma.plot_enquiries.findFirst({
      where: { uuid: enquiryUuid, project_id: project.id },
    });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    await this.prisma.plot_enquiries.delete({ where: { id: enquiry.id } });
    return { id: enquiryUuid, deleted: true };
  }

  private mapEnquiry(enquiry: any) {
    return {
      id: enquiry.uuid,
      plotId: enquiry.project_plots?.uuid ?? undefined,
      plotNo: enquiry.project_plots?.plot_no ?? undefined,
      customerName: enquiry.customer_name,
      phone: enquiry.phone,
      email: enquiry.email ?? undefined,
      message: enquiry.message ?? undefined,
      status: enquiry.status,
      createdAt: enquiry.created_at,
      updatedAt: enquiry.updated_at,
    };
  }

  async remove(uuid: string) {
    await this.requireProject(uuid);
    await this.prisma.projects.update({
      where: { uuid },
      data: { deleted_at: new Date() },
    });
    return { id: uuid, deleted: true };
  }

  private mapProject(project: any, base = '/admin/projects') {
    const documents = (project.project_documents ?? []) as any[];
    const brochureDocument = documents.find(
      (document) => document.kind === 'BROCHURE',
    );
    const photos = documents
      .filter((document) => document.kind === 'PHOTO')
      .map((document) => ({
        id: document.uuid,
        originalName: document.original_name,
        url: this.documentUrl(project.uuid, document.uuid, base),
      }));

    const drawing = (project.society_drawing ?? null) as any;
    const societyDrawing = drawing
      ? {
          ...drawing,
          imageUrl: drawing.documentId
            ? this.documentUrl(project.uuid, drawing.documentId, base)
            : undefined,
        }
      : undefined;

    return {
      id: project.uuid,
      name: project.name,
      code: project.code,
      description: project.description,
      address: project.address,
      city: project.city,
      state: project.state,
      latitude: Number(project.latitude),
      longitude: Number(project.longitude),
      blocks: project.blocks ?? [],
      societyDrawing: societyDrawing ?? undefined,
      societyBoundary: project.society_boundary ?? undefined,
      facilityLabels: project.facility_labels ?? [],
      plots: (project.project_plots ?? []).map((plot: any) => ({
        id: plot.uuid,
        projectId: project.uuid,
        blockId: plot.block_id ?? undefined,
        plotNo: plot.plot_no,
        status: plot.status,
        plotType: plot.plot_type,
        color: plot.color ?? undefined,
        areaSqft: plot.area_sqft ? Number(plot.area_sqft) : undefined,
        areaSqm: plot.area_sqm ? Number(plot.area_sqm) : undefined,
        perimeterMeters: plot.perimeter_meters
          ? Number(plot.perimeter_meters)
          : undefined,
        frontageMeters: plot.frontage_meters
          ? Number(plot.frontage_meters)
          : undefined,
        depthMeters: plot.depth_meters ? Number(plot.depth_meters) : undefined,
        sideLengths: plot.side_lengths ?? undefined,
        facing: plot.facing ?? undefined,
        roadWidthMeters: plot.road_width_meters
          ? Number(plot.road_width_meters)
          : undefined,
        price: plot.price ? Number(plot.price) : undefined,
        geometry: plot.geometry,
      })),
      brochure: brochureDocument
        ? {
            id: brochureDocument.uuid,
            originalName: brochureDocument.original_name,
            url: this.documentUrl(project.uuid, brochureDocument.uuid, base),
          }
        : null,
      photos,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };
  }
}
