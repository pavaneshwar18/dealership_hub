import { NextResponse } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { getSession } from "@/lib/auth";
import { getUploadsDir } from "@/lib/upload-utils";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: segments } = await context.params;
  const filePath = segments.join("/");

  // Prevent directory traversal
  if (filePath.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const absolutePath = path.join(getUploadsDir(), filePath);
  const ext = path.extname(absolutePath).slice(1).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const buffer = await readFile(absolutePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
