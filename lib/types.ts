export interface NoteMeta {
  id: string; // Directory name and file stem (without .md)
  path: string; // Storage path (relative)
  sha?: string; // Required by GitHub, empty for local
}

export interface Note extends NoteMeta {
  content: string;
}

// Unified storage interface implemented by both the local file and GitHub backends.
// Storage layout: notes/<id>/<id>.md + notes/<id>/attachment/*
export interface NoteStore {
  listNotes(): Promise<NoteMeta[]>;
  getNote(id: string): Promise<Note | null>;
  // sha is only needed by GitHub when updating
  putNote(id: string, content: string, sha?: string): Promise<{ sha?: string }>;
  // Hide a note from the list (files are kept on disk)
  hideNote(id: string): Promise<void>;
  // Upload an image into a note's attachment/ folder; returns a URL usable in markdown
  uploadImage(
    noteId: string,
    filename: string,
    base64Content: string
  ): Promise<{ path: string; url: string }>;
  // Read image bytes from a note's attachment/ folder, used by the /api/asset route
  getImage(noteId: string, filename: string): Promise<Buffer | null>;
}
