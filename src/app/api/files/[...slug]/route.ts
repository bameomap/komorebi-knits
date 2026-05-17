import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const filename = slug.join("/");

  // Block path traversal
  const filePath = path.resolve(UPLOAD_DIR, filename);
  if (!filePath.startsWith(path.resolve(UPLOAD_DIR))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const data = await fs.readFile(filePath).catch(() => null);
  if (!data) return new NextResponse("Not Found", { status: 404 });

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const mime: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", pdf: "application/pdf",
  };

  return new NextResponse(data, {
    headers: {
      "Content-Type": mime[ext] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
