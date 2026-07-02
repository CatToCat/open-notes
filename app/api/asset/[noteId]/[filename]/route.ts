import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
};

// GET /api/asset/:noteId/:filename -> read an image from a note's attachment/ folder
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ noteId: string; filename: string }> }
) {
  const { noteId, filename } = await params;
  // Prevent directory traversal
  const safeNote = path.basename(noteId);
  const safe = path.basename(filename);

  try {
    const buf = await getStore().getImage(safeNote, safe);
    if (!buf) return NextResponse.json({ error: "not found" }, { status: 404 });
    const ext = (safe.split(".").pop() || "").toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
