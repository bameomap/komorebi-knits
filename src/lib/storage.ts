/**
 * Storage abstraction layer.
 * Local: public/uploads/ (served as static files)
 * Production (UPLOAD_DIR set): custom dir, served via /api/files/[...slug]
 */

import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const CUSTOM_DIR = process.env.UPLOAD_DIR;
const UPLOAD_DIR = CUSTOM_DIR ?? path.join(process.cwd(), "public", "uploads");
const URL_PREFIX = CUSTOM_DIR ? "/api/files" : "/uploads";

export async function uploadFile(file: File): Promise<string> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${randomUUID()}.${ext}`;
  const dest = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buffer);

  return `${URL_PREFIX}/${filename}`;
}

export async function deleteFile(url: string): Promise<void> {
  const prefix = url.startsWith("/api/files/") ? "/api/files/" : "/uploads/";
  if (!url.startsWith(prefix)) return;
  const filename = url.replace(prefix, "");
  const dest = path.join(UPLOAD_DIR, filename);
  await fs.unlink(dest).catch(() => {});
}
