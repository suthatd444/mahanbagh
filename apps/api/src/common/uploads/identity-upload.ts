import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdir, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';

const uploadDirectory = join(process.cwd(), 'uploads', 'identity-documents');
const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export type IdentityDocumentFiles = {
  panDocument?: Express.Multer.File[];
  aadhaarDocument?: Express.Multer.File[];
};

export const identityUploadOptions = {
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
  limits: { fileSize: 5 * 1024 * 1024, files: 2 },
  fileFilter: (
    _request: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    callback(
      allowedMimeTypes.has(file.mimetype)
        ? null
        : new BadRequestException('Only PDF, JPEG, and PNG identity documents are allowed'),
      allowedMimeTypes.has(file.mimetype),
    );
  },
};

export function getIdentityUploadFiles(files: IdentityDocumentFiles) {
  const panDocument = files.panDocument?.[0];
  const aadhaarDocument = files.aadhaarDocument?.[0];
  if (!panDocument || !aadhaarDocument) {
    throw new BadRequestException('PAN and Aadhaar documents are required');
  }
  return { panDocument, aadhaarDocument };
}

export async function removeIdentityUploadFiles(files: IdentityDocumentFiles) {
  await Promise.all(
    Object.values(files)
      .flat()
      .map(async (file) => {
        try {
          await unlink(file.path);
        } catch (error: unknown) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        }
      }),
  );
}
