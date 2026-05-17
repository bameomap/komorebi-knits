import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/storage";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
  if (!allowed.includes(file.type) && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Max file size is 10MB" }, { status: 400 });
  }

  const url = await uploadFile(file);
  return NextResponse.json({ url });
}
