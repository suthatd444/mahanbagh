import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdir, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';

const uploadDirectory = join(process.cwd(), 'uploads', 'projects');

const brochureMimeTypes = new Set(['application/pdf']);
const photoMimeTypes = new Set(['image/jpeg', 'image/png']);
const drawingMimeTypes = new Set([
  'image/png',
  'image/svg+xml',
  'image/jpeg',
]);

export type ProjectUploadFiles = {
  brochure?: Express.Multer.File[];
  photos?: Express.Multer.File[];
  drawing?: Express.Multer.File[];
  file?: Express.Multer.File[];
};

function isAllowed(fieldname: string, mimetype: string): boolean {
  if (fieldname === 'brochure') return brochureMimeTypes.has(mimetype);
  if (fieldname === 'photos') return photoMimeTypes.has(mimetype);
  if (fieldname === 'drawing') return drawingMimeTypes.has(mimetype);
  // Generic single-file upload endpoint.
  return (
    brochureMimeTypes.has(mimetype) ||
    photoMimeTypes.has(mimetype) ||
    drawingMimeTypes.has(mimetype)
  );
}

export const projectUploadOptions = {
  storage: diskStorage({
    destination: async (_request, _file, callback) => {
      try {
        await mkdir(uploadDirectory, { recursive: true });
        callback(null, uploadDirectory);
      } catch (error) {
        callback(error as Error, uploadDirectory);
      }
    },
    filename: (_request, file, callback) => {
      callback(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 15 },
  fileFilter: (
    _request: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowed = isAllowed(file.fieldname, file.mimetype);
    callback(
      allowed
        ? null
        : new BadRequestException(
            'Unsupported file type for this upload field',
          ),
      allowed,
    );
  },
};

export async function removeProjectUploadFiles(files?: Express.Multer.File[]) {
  if (!files || files.length === 0) return;
  await Promise.all(
    files.map(async (file) => {
      try {
        await unlink(file.path);
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }),
  );
}

export function fileStoragePath(file: Express.Multer.File): string {
  return join('projects', file.filename);
}
