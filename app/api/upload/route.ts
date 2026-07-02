import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// POST /api/upload  multipart/form-data: file, noteId
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const noteId = (form.get("noteId") as string | null)?.trim();
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!noteId) {
      return NextResponse.json({ error: "Missing noteId" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const base64 = buf.toString("base64");

    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const filename = `img-${ts}-${rand}.${ext}`;

    const { url } = await getStore().uploadImage(noteId, filename, base64);
    return NextResponse.json({ url, filename });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
