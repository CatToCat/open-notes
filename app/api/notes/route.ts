import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/notes -> list of notes
export async function GET() {
  try {
    const notes = await getStore().listNotes();
    return NextResponse.json({ notes });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/notes -> create a note, body: { title?, content? }
export async function POST(req: NextRequest) {
  try {
    const { title, content } = await req.json().catch(() => ({}));
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][ts.getDay()];
    // File id format: YYYYMMDDHHmm + weekday, e.g. 202606301010Tue
    const id =
      `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}` +
      `${pad(ts.getHours())}${pad(ts.getMinutes())}${week}`;
    const heading = title ? `# ${title}\n\n` : "";
    const { sha } = await getStore().putNote(id, heading + (content || ""));
    return NextResponse.json({ id, sha });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/notes -> bulk delete (hide from list, files kept), body: { ids: string[] }
export async function PATCH(req: NextRequest) {
  try {
    const { ids } = await req.json().catch(() => ({ ids: [] }));
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 });
    }
    const store = getStore();
    // Hide each note, collecting failures
    const failed: { id: string; error: string }[] = [];
    for (const id of ids) {
      try {
        await store.hideNote(String(id));
      } catch (e: any) {
        failed.push({ id: String(id), error: e.message });
      }
    }
    if (failed.length) {
      return NextResponse.json({ ok: false, failed }, { status: 500 });
    }
    return NextResponse.json({ ok: true, hidden: ids.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
