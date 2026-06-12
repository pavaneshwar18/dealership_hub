import { NextResponse } from "next/server";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
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

  const ext = path.extname(filePath).slice(1).toLowerCase();
  const mimeType = MIME_TYPES[ext];

  if (!mimeType) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.storage
      .from("dealership-uploads")
      .download(filePath);

    if (error || !data) {
      console.error("Supabase Storage download error:", error);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Failed to read file from Supabase:", err);
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
