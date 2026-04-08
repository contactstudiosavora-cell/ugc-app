import fs from "fs";
import path from "path";
import { HistoryEntry } from "./types";

// Note: file-based storage works perfectly for local use.
// For production deployment (Vercel etc.), migrate to a database like Supabase/PostgreSQL.
const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readHistory(): HistoryEntry[] {
  ensureDataDir();
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    const content = fs.readFileSync(HISTORY_FILE, "utf-8");
    return JSON.parse(content) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function writeHistory(entries: HistoryEntry[]): void {
  ensureDataDir();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export function addHistoryEntry(entry: HistoryEntry): void {
  const history = readHistory();
  history.unshift(entry);
  if (history.length > 200) history.splice(200);
  writeHistory(history);
}

export function updateHistoryEntry(
  id: string,
  update: Partial<HistoryEntry>
): boolean {
  const history = readHistory();
  const idx = history.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  history[idx] = { ...history[idx], ...update };
  writeHistory(history);
  return true;
}

export function deleteHistoryEntry(id: string): boolean {
  const history = readHistory();
  const idx = history.findIndex((e) => e.id === id);
  if (idx === -1) return false;
  history.splice(idx, 1);
  writeHistory(history);
  return true;
}
