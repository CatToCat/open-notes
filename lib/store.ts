import type { NoteStore } from "./types";
import { localStore } from "./local";
import { githubStore } from "./github";

// Backend selection:
// - If STORAGE_BACKEND is set explicitly (local | github), it takes precedence.
// - Otherwise: use github when GITHUB_TOKEN + GITHUB_REPO are set (or running on
//   Vercel), and local for local development.
export function getStore(): NoteStore {
  const backend = process.env.STORAGE_BACKEND;
  if (backend === "local") return localStore;
  if (backend === "github") return githubStore;

  const hasGithub = !!process.env.GITHUB_TOKEN && !!process.env.GITHUB_REPO;
  const onVercel = !!process.env.VERCEL;
  if (hasGithub || onVercel) return githubStore;
  return localStore;
}

// Identifier of the active backend (for frontend/debugging: local vs github)
export function currentBackend(): "local" | "github" {
  const s = getStore();
  return s === localStore ? "local" : "github";
}
