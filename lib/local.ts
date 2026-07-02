import { promises as fs } from "fs";
import path from "path";
import type { Note, NoteMeta, NoteStore } from "./types";

function cfg() {
  const notesDir = process.env.NOTES_DIR || "notes";
  const attachDir = process.env.ATTACH_DIR || "attachment";
  // Local data root, defaults to data/ under the project
  const dataRoot = process.env.LOCAL_DATA_DIR || "data";
  const root = path.join(process.cwd(), dataRoot);
  return {
    root,
    notesPath: path.join(root, notesDir),
    notesDir,
    attachDir,
    dataRoot,
  };
}

// Directory and file paths for a single note
function notePaths(id: string) {
  const { notesPath, attachDir } = cfg();
  const dir = path.join(notesPath, id);
  return {
    dir,
    md: path.join(dir, `${id}.md`),
    hidden: path.join(dir, ".hidden"),
    attachPath: path.join(dir, attachDir),
  };
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export const localStore: NoteStore = {
  async listNotes(): Promise<NoteMeta[]> {
    const { notesPath, notesDir } = cfg();
    try {
      const entries = await fs.readdir(notesPath, { withFileTypes: true });
      const dirs = entries.filter((e) => e.isDirectory());
      const metas: NoteMeta[] = [];
      for (const d of dirs) {
        const { md, hidden } = notePaths(d.name);
        // Skip hidden notes and directories without a markdown file
        if (await exists(hidden)) continue;
        if (!(await exists(md))) continue;
        metas.push({
          id: d.name,
          path: `${notesDir}/${d.name}/${d.name}.md`,
        });
      }
      return metas.sort((a, b) => (a.id < b.id ? 1 : -1));
    } catch (e: any) {
      if (e.code === "ENOENT") return [];
      throw e;
    }
  },

  async getNote(id: string): Promise<Note | null> {
    const { notesDir } = cfg();
    const { md } = notePaths(id);
    try {
      const content = await fs.readFile(md, "utf-8");
      return { id, path: `${notesDir}/${id}/${id}.md`, content };
    } catch (e: any) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  },

  async putNote(id: string, content: string): Promise<{ sha?: string }> {
    const { dir, md } = notePaths(id);
    await ensureDir(dir);
    await fs.writeFile(md, content, "utf-8");
    return {};
  },

  async hideNote(id: string): Promise<void> {
    const { dir, hidden } = notePaths(id);
    // Ignore if the directory does not exist
    if (!(await exists(dir))) return;
    await fs.writeFile(hidden, "", "utf-8");
  },

  async uploadImage(
    noteId: string,
    filename: string,
    base64Content: string
  ): Promise<{ path: string; url: string }> {
    const { attachPath } = notePaths(noteId);
    const { attachDir, notesDir } = cfg();
    await ensureDir(attachPath);
    const safe = path.basename(filename);
    const buf = Buffer.from(base64Content, "base64");
    await fs.writeFile(path.join(attachPath, safe), buf);
    return {
      path: `${notesDir}/${noteId}/${attachDir}/${safe}`,
      // Served through /api/asset/<noteId>/<filename>
      url: `/api/asset/${encodeURIComponent(noteId)}/${encodeURIComponent(
        safe
      )}`,
    };
  },

  async getImage(noteId: string, filename: string): Promise<Buffer | null> {
    const { attachPath } = notePaths(noteId);
    const safe = path.basename(filename);
    try {
      return await fs.readFile(path.join(attachPath, safe));
    } catch (e: any) {
      if (e.code === "ENOENT") return null;
      throw e;
    }
  },
};
