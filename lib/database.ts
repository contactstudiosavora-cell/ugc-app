/**
 * MongoDB database layer
 *
 * Collections:
 *   companies   — one doc per website/brand (keyed by domain)
 *   generations — one doc per "Generate" click (scripts embedded)
 *
 * Learning:
 *   When generating for a company that already has validated scripts,
 *   those scripts are fetched and injected as style/tone examples.
 */

import { MongoClient, Db } from "mongodb";
import { randomUUID } from "crypto";

/* ─── Connection caching (Next.js serverless pattern) ──────────── */

const MONGODB_URI = process.env.MONGODB_URI as string;
const DB_NAME = process.env.DB_NAME || "ugc_scripts_db";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!MONGODB_URI) throw new Error("MONGODB_URI environment variable is not set.");
  // Cache the connection promise globally to avoid opening too many connections
  // (important in both dev hot-reload AND serverless environments)
  if (!global._mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      connectTimeoutMS: 10_000,
    });
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
}

async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}

/* ─── Types ──────────────────────────────────────────────────────── */

export interface CompanyDoc {
  _id: string;
  domain: string;
  name: string | null;
  niche: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationDoc {
  _id: string;
  companyId: string | null;
  companyDomain: string | null;
  scriptType: string;
  duration: string;
  inputUrl: string | null;
  inputNiche: string | null;
  inputDescription: string | null;
  inputInstructions: string | null;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  scripts: Record<string, string>;
  validatedAngle: string | null;
  validatedAt: Date | null;
  createdAt: Date;
}

/* ─── Helpers ────────────────────────────────────────────────────── */

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

/* ─── Companies ──────────────────────────────────────────────────── */

export interface CompanyRow {
  id: string;
  domain: string;
  name: string | null;
  niche: string | null;
  createdAt: string;
  updatedAt: string;
  generationCount?: number;
  validatedCount?: number;
}

function docToCompanyRow(doc: CompanyDoc): CompanyRow {
  return {
    id: doc._id,
    domain: doc.domain,
    name: doc.name,
    niche: doc.niche,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Get or create a company row for a domain. */
export async function upsertCompany(
  domain: string,
  niche?: string | null
): Promise<CompanyRow> {
  const db = await getDb();
  const col = db.collection<CompanyDoc>("companies");
  const now = new Date();

  const existing = await col.findOne({ domain });
  if (existing) {
    if (niche && niche !== existing.niche) {
      await col.updateOne({ _id: existing._id }, { $set: { niche, updatedAt: now } });
      return docToCompanyRow({ ...existing, niche, updatedAt: now });
    }
    return docToCompanyRow(existing);
  }

  const id = randomUUID();
  const doc: CompanyDoc = {
    _id: id,
    domain,
    name: domain,
    niche: niche ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return docToCompanyRow(doc);
}

/** List all companies with generation + validation counts. */
export async function listCompanies(): Promise<CompanyRow[]> {
  const db = await getDb();
  const companies = await db
    .collection<CompanyDoc>("companies")
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  // Get counts per company
  const generationCol = db.collection<GenerationDoc>("generations");
  const result: CompanyRow[] = [];

  for (const c of companies) {
    const generationCount = await generationCol.countDocuments({ companyId: c._id });
    const validatedCount = await generationCol.countDocuments({
      companyId: c._id,
      validatedAngle: { $ne: null },
    });
    result.push({ ...docToCompanyRow(c), generationCount, validatedCount });
  }
  return result;
}

/** Update a company's display name. */
export async function updateCompanyName(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db
    .collection<CompanyDoc>("companies")
    .updateOne({ _id: id }, { $set: { name, updatedAt: new Date() } });
}

/* ─── Learning context ───────────────────────────────────────────── */

export interface ValidatedScriptCtx {
  angle: string;
  content: string;
  scriptType: string;
  inputNiche: string | null;
}

/**
 * Return up to `limit` validated scripts for a company.
 * Used as few-shot examples when generating new scripts.
 */
export async function getValidatedScripts(
  companyId: string,
  limit = 4
): Promise<ValidatedScriptCtx[]> {
  const db = await getDb();
  const docs = await db
    .collection<GenerationDoc>("generations")
    .find({ companyId, validatedAngle: { $ne: null } })
    .sort({ validatedAt: -1 })
    .limit(limit)
    .toArray();

  return docs
    .filter((d) => d.validatedAngle && d.scripts[d.validatedAngle])
    .map((d) => ({
      angle: d.validatedAngle!,
      content: d.scripts[d.validatedAngle!],
      scriptType: d.scriptType,
      inputNiche: d.inputNiche,
    }));
}

/**
 * Build the learning context string to inject into the Claude prompt.
 * Returns empty string if no validated scripts exist yet.
 */
export async function buildLearningContext(companyId: string): Promise<string> {
  const validated = await getValidatedScripts(companyId, 4);
  if (validated.length === 0) return "";

  const angleLabels: Record<string, string> = {
    emotional: "ÉMOTIONNEL",
    problem_solution: "PROBLÈME/SOLUTION",
    curiosity: "CURIOSITÉ",
  };

  const examples = validated
    .map(
      (s, i) =>
        `[Exemple validé ${i + 1} — Angle: ${angleLabels[s.angle] ?? s.angle.toUpperCase()}, Type: ${s.scriptType}]\n${s.content}`
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

/* ─── Generations ─────────────────────────────────────────────────── */

export async function insertGeneration(data: {
  id: string;
  companyId: string | null;
  companyDomain: string | null;
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
}): Promise<void> {
  const db = await getDb();
  const now = new Date();

  const doc: GenerationDoc = {
    _id: data.id,
    companyId: data.companyId,
    companyDomain: data.companyDomain,
    scriptType: data.scriptType,
    duration: data.duration,
    inputUrl: data.inputUrl ?? null,
    inputNiche: data.inputNiche ?? null,
    inputDescription: data.inputDescription ?? null,
    inputInstructions: data.inputInstructions ?? null,
    costUsd: data.costUsd,
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    scripts: data.scripts,
    validatedAngle: null,
    validatedAt: null,
    createdAt: now,
  };

  await db.collection<GenerationDoc>("generations").insertOne(doc);

  if (data.companyId) {
    await db
      .collection<CompanyDoc>("companies")
      .updateOne({ _id: data.companyId }, { $set: { updatedAt: now } });
  }
}

/* ─── Validation ──────────────────────────────────────────────────── */

/**
 * Set validated angle for a generation.
 * Passing null removes validation.
 */
export async function setValidation(
  generationId: string,
  angle: string | null
): Promise<boolean> {
  const db = await getDb();
  const update = angle
    ? { $set: { validatedAngle: angle, validatedAt: new Date() } }
    : { $set: { validatedAngle: null, validatedAt: null } };

  const result = await db
    .collection<GenerationDoc>("generations")
    .updateOne({ _id: generationId }, update);

  return result.matchedCount > 0;
}

/* ─── History ─────────────────────────────────────────────────────── */

import type { HistoryEntry } from "./types";

function docToHistoryEntry(doc: GenerationDoc): HistoryEntry {
  return {
    id: doc._id,
    createdAt: doc.createdAt.toISOString(),
    input: {
      url: doc.inputUrl ?? undefined,
      niche: doc.inputNiche ?? undefined,
      description: doc.inputDescription ?? undefined,
      instructions: doc.inputInstructions ?? undefined,
      scriptType: doc.scriptType as import("./types").ScriptType,
      duration: doc.duration as import("./types").Duration,
    },
    scripts: doc.scripts as Record<import("./types").ScriptAngle, string>,
    cost: doc.costUsd,
    validated: (doc.validatedAngle as import("./types").ScriptAngle | null) ?? undefined,
  };
}

/**
 * Return generation history as a flat list, optionally filtered by company.
 */
export async function listHistory(options?: {
  companyId?: string;
  limit?: number;
}): Promise<HistoryEntry[]> {
  const db = await getDb();
  const filter = options?.companyId ? { companyId: options.companyId } : {};

  const docs = await db
    .collection<GenerationDoc>("generations")
    .find(filter)
    .sort({ createdAt: -1 })
    .limit(options?.limit ?? 200)
    .toArray();

  return docs.map(docToHistoryEntry);
}

export async function deleteGeneration(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection<GenerationDoc>("generations")
    .deleteOne({ _id: id });
  return result.deletedCount > 0;
}
