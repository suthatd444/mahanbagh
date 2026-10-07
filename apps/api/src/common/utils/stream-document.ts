import { Response } from "express";
import { createReadStream } from "fs";
import { join } from "path";

export interface StoredDocument {
  storagePath: string;
  mimeType: string;
  originalName: string;
}

export function streamDocument(file: StoredDocument, res: Response) {
  const safeName = file.originalName.replace(/["\\\r\n]/g, "_");
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);

  const stream = createReadStream(
    join(process.cwd(), "uploads", file.storagePath),
  );
  stream.on("error", () => {
    if (!res.headersSent) res.status(404).end();
    else res.end();
  });
  stream.pipe(res);
}
