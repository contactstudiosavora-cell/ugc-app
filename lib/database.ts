/**
 * SQLite database layer — powered by better-sqlite3
 *
 * Schema:
 *   companies   — one row per website/brand (keyed by domain)
 *   generations — one row per "Generate" click
 *   scripts     — three rows per generation (one per angle)
 *
 * Learning:
 *   When generating for a company that already has validated scripts,
 *   those scripts are fetched and injected as style/tone examples.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

/* ─── Init ───────────────────────────────────────────────────── */

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(path.join(DATA_DIR, "ugc-scripts.db"));
  _db.pragma("journal_mode = WAL"); // better concurrent perf
  _db.pragma("foreign_keys = ON");
  initSchema(_db);
  return _db;
}

/* ─── Schema ─────────────────────────────────────────────────── */

function initSchema(db: Database.Database) {
  db.exec(`
    -- One row per unique website / brand
    CREATE TABLE IF NOT EXISTS companies (
      id          TEXT PRIMARY KEY,
      domain      TEXT UNIQUE NOT NULL,
      name        TEXT,
      niche       TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    -- One row per "Generate" click
    CREATE TABLE IF NOT EXISTS generations (
      id                  TEXT PRIMARY KEY,
      company_id          TEXT REFERENCES companies(id),
      script_type         TEXT NOT NULL,
      duration            TEXT NOT NULL,
      input_url           TEXT,
      input_niche         TEXT,
      input_description   TEXT,
      input_instructions  TEXT,
      cost_usd            REAL NOT NULL DEFAULT 0,
      input_tokens        INTEGER DEFAULT 0,
      output_tokens       INTEGER DEFAULT 0,
      created_at          TEXT NOT NULL
    );

    -- Three rows per generation (one per angle: emotional / problem_solution / curiosity)
    CREATE TABLE IF NOT EXISTS scripts (
      id            TEXT PRIMARY KEY,
      generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
      company_id    TEXT REFERENCES companies(id),
      angle         TEXT NOT NULL,
      content       TEXT NOT NULL,
      is_validated  INTEGER NOT NULL DEFAULT 0,
      validated_at  TEXT,
      created_at    TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_gen_company  ON generations(company_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_scr_company  ON scripts(company_id, is_validated);
    CREATE INDEX IF NOT EXISTS idx_scr_gen      ON scripts(generation_id);
  `);
}

/* ─── Row types ──────────────────────────────────────────────── */

export interface CompanyRow {
  id: string;
  domain: string;
  name: string | null;
  niche: string | null;
  created_at: string;
  updated_at: string;
  generation_count?: number;
  validated_count?: number;
}

export interface GenerationRow {
  id: string;
  company_id: string | null;
  company_domain: string | null;
  script_type: string;
  duration: string;
  input_url: string | null;
  input_niche: string | null;
  input_description: string | null;
  input_instructions: string | null;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
  validated_angle: string | null;
  scripts: Record<string, string>;
}

/* ─── Companies ──────────────────────────────────────────────── */

/** Extract root domain from a URL string. Returns null if unparseable. */
export function extractDomain(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Get or create a company row for a domain. */
export function upsertCompany(
  domain: string,
  niche?: string | null
): CompanyRow {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db
    .prepare("SELECT * FROM companies WHERE domain = ?")
    .get(domain) as CompanyRow | undefined;

  if (existing) {
    if (niche && niche !== existing.niche) {
      db.prepare(
        "UPDATE companies SET niche = ?, updated_at = ? WHERE id = ?"
      ).run(niche, now, existing.id);
      return { ...existing, niche, updated_at: now };
    }
    return existing;
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO companies (id, domain, name, niche, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, domain, domain, niche ?? null, now, now);

  return db
    .prepare("SELECT * FROM companies WHERE id = ?")
    .get(id) as CompanyRow;
}

/** List all companies with generation + validation counts. */
export function listCompanies(): CompanyRow[] {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT
      c.*,
      COUNT(DISTINCT g.id)                                       AS generation_count,
      COUNT(DISTINCT CASE WHEN s.is_validated = 1 THEN s.id END) AS validated_count
    FROM companies c
    LEFT JOIN generations g ON g.company_id = c.id
    LEFT JOIN scripts     s ON s.company_id = c.id
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `
    )
    .all() as CompanyRow[];
}

/** Update a company's display name. */
export function updateCompanyName(id: string, name: string): void {
  const db = getDb();
  db.prepare(
    "UPDATE companies SET name = ?, updated_at = ? WHERE id = ?"
  ).run(name, new Date().toISOString(), id);
}

/* ─── Learning context ───────────────────────────────────────── */

export interface ValidatedScriptCtx {
  angle: string;
  content: string;
  script_type: string;
  input_niche: string | null;
}

/**
 * Return up to `limit` validated scripts for a company.
 * Used as few-shot examples when generating new scripts.
 */
export function getValidatedScripts(
  companyId: string,
  limit = 4
): ValidatedScriptCtx[] {
  const db = getDb();
  return db
    .prepare(
      `
    SELECT s.angle, s.content, g.script_type, g.input_niche
    FROM scripts s
    JOIN generations g ON s.generation_id = g.id
    WHERE s.company_id = ? AND s.is_validated = 1
    ORDER BY s.validated_at DESC
    LIMIT ?
  `
    )
    .all(companyId, limit) as ValidatedScriptCtx[];
}

/**
 * Build the learning context string to inject into the Claude prompt.
 * Returns empty string if no validated scripts exist yet.
 */
export function buildLearningContext(companyId: string): string {
  const validated = getValidatedScripts(companyId, 4);
  if (validated.length === 0) return "";

  const angleLabels: Record<string, string> = {
    emotional: "ÉMOTIONNEL",
    problem_solution: "PROBLÈME/SOLUTION",
    curiosity: "CURIOSITÉ",
  };

  const examples = validated
    .map(
      (s, i) =>
        `[Exemple validé ${i + 1} — Angle: ${angleLabels[s.angle] ?? s.angle.toUpperCase()}, Type: ${s.script_type}]\n${s.content}`
    )
    .join("\n\n---\n\n");

  return (
    `\n\n` +
    `╔══════════════════════════════════════════════════════╗\n` +
    `  SCRIPTS DÉJÀ VALIDÉS POUR CETTE MARQUE\n` +
    `  Utilise-les comme RÉFÉRENCE de ton, style, vocabulaire et structure.\n` +
    `  Ne les copie pas mot pour mot — inspire-toi pour créer quelque chose de nouveau.\n` +
    `╚══════════════════════════════════════════════════════╝\n\n` +
    examples
  );
}

/* ─── Generations ────────────────────────────────────────────── */

export function insertGeneration(data: {
  id: string;
  companyId: string | null;
  scriptType: string;
  duration: string;
  inputUrl?: string | null;
  inputNiche?: string | null;
  inputDescription?: string | null;
  inputInstructions?: string | null;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  scripts: Record<string, string>;
}): void {
  const db = getDb();
  const now = new Date().toISOString();

  db.transaction(() => {
    db.prepare(`
      INSERT INTO generations (
        id, company_id, script_type, duration,
        input_url, input_niche, input_description, input_instructions,
        cost_usd, input_tokens, output_tokens, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id,
      data.companyId,
      data.scriptType,
      data.duration,
      data.inputUrl ?? null,
      data.inputNiche ?? null,
      data.inputDescription ?? null,
      data.inputInstructions ?? null,
      data.costUsd,
      data.inputTokens,
      data.outputTokens,
      now
    );

    for (const [angle, content] of Object.entries(data.scripts)) {
      db.prepare(`
        INSERT INTO scripts (id, generation_id, company_id, angle, content, is_validated, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
      `).run(
        crypto.randomUUID(),
        data.id,
        data.companyId,
        angle,
        content,
        now
      );
    }

    if (data.companyId) {
      db.prepare(
        "UPDATE companies SET updated_at = ? WHERE id = ?"
      ).run(now, data.companyId);
    }
  })();
}

/* ─── Validation ─────────────────────────────────────────────── */

/**
 * Set validated angle for a generation.
 * Passing null removes validation.
 * Only one angle per generation can be validated at a time.
 */
export function setValidation(
  generationId: string,
  angle: string | null
): boolean {
  const db = getDb();
  const now = new Date().toISOString();

  // Reset all scripts in this generation first
  db.prepare(
    "UPDATE scripts SET is_validated = 0, validated_at = NULL WHERE generation_id = ?"
  ).run(generationId);

  if (!angle) return true;

  const result = db
    .prepare(
      "UPDATE scripts SET is_validated = 1, validated_at = ? WHERE generation_id = ? AND angle = ?"
    )
    .run(now, generationId, angle);

  return result.changes > 0;
}

/* ─── History ────────────────────────────────────────────────── */

/**
 * Return generation history as a flat list, optionally filtered by company.
 * Scripts are joined and returned as a Record<angle, content>.
 */
export function listHistory(options?: {
  companyId?: string;
  limit?: number;
}): GenerationRow[] {
  const db = getDb();

  const conditions = options?.companyId ? "WHERE g.company_id = ?" : "";
  const params: (string | number)[] = options?.companyId
    ? [options.companyId]
    : [];

  if (options?.limit) params.push(options.limit);

  const rows = db
    .prepare(
      `
    SELECT
      g.*,
      c.domain AS company_domain,
      (
        SELECT angle FROM scripts
        WHERE generation_id = g.id AND is_validated = 1
        LIMIT 1
      ) AS validated_angle
    FROM generations g
    LEFT JOIN companies c ON g.company_id = c.id
    ${conditions}
    ORDER BY g.created_at DESC
    ${options?.limit ? "LIMIT ?" : ""}
  `
    )
    .all(...params) as (GenerationRow & { validated_angle: string | null })[];

  // Attach scripts to each generation
  const stmt = db.prepare(
    "SELECT angle, content FROM scripts WHERE generation_id = ?"
  );

  return rows.map((row) => {
    const scriptRows = stmt.all(row.id) as { angle: string; content: string }[];
    const scripts: Record<string, string> = {};
    for (const s of scriptRows) scripts[s.angle] = s.content;
    return { ...row, scripts };
  });
}

export function deleteGeneration(id: string): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM generations WHERE id = ?").run(id).changes > 0;
}
