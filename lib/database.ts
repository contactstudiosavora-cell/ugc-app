/**
 * MongoDB database layer — UGC Script Production Platform
 *
 * Collections:
 *   companies   — client brands with full profile
 *   packages    — script packages per company
 *   scripts     — individual validated/produced scripts
 *   generations — one doc per "Generate" click
 */

import { MongoClient, Db } from "mongodb";
import { randomUUID } from "crypto";
import type {
  CompanyDoc,
  CompanyRow,
  PackageDoc,
  PackageRow,
  ScriptDoc,
  ScriptRow,
  GenerationDoc,
  ScriptType,
  ScriptAngle,
  PackageStatus,
  ScriptStatus,
  HistoryEntry,
  ReferenceScriptDoc,
  ReferenceScriptRow,
  GlobalReferenceScriptDoc,
  GlobalReferenceScriptRow,
  ShareTokenDoc,
  ShareTokenRow,
} from "./types";

/* ─── Connection caching (Next.js serverless pattern) ──────────── */

const MONGODB_URI = process.env.MONGODB_URI as string;
const DB_NAME = process.env.DB_NAME || "ugc_scripts_db";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!MONGODB_URI) throw new Error("MONGODB_URI environment variable is not set.");
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

/* ─── Helpers ────────────────────────────────────────────────────── */

export function extractDomain(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function toISOSafe(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString();
  if (typeof d === "string") return d;
  return d.toISOString();
}

/* ═══════════════════════════════════════════════════════════════════
   COMPANIES
═══════════════════════════════════════════════════════════════════ */

function docToCompanyRow(doc: CompanyDoc): CompanyRow {
  return {
    id: doc._id,
    domain: doc.domain,
    name: doc.name,
    niche: doc.niche,
    description: doc.description ?? null,
    communicationStyle: doc.communicationStyle ?? null,
    targetAudience: doc.targetAudience ?? null,
    servicesProducts: doc.servicesProducts ?? null,
    brandVoice: doc.brandVoice ?? null,
    contentTypes: doc.contentTypes ?? [],
    createdAt: toISOSafe(doc.createdAt),
    updatedAt: toISOSafe(doc.updatedAt),
  };
}

/** Get or create a company row for a domain (used by generate route). */
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
    description: null,
    communicationStyle: null,
    targetAudience: null,
    servicesProducts: null,
    brandVoice: null,
    contentTypes: [],
    createdAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  return docToCompanyRow(doc);
}

/** List all companies with counts. */
export async function listCompanies(): Promise<CompanyRow[]> {
  const db = await getDb();
  const companies = await db
    .collection<CompanyDoc>("companies")
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  const result: CompanyRow[] = [];
  for (const c of companies) {
    const generationCount = await db
      .collection<GenerationDoc>("generations")
      .countDocuments({ companyId: c._id });
    const validatedCount = await db
      .collection<GenerationDoc>("generations")
      .countDocuments({ companyId: c._id, validatedAngle: { $ne: null } });
    const packageCount = await db
      .collection<PackageDoc>("packages")
      .countDocuments({ companyId: c._id });
    result.push({ ...docToCompanyRow(c), generationCount, validatedCount, packageCount });
  }
  return result;
}

/** Get a single company by ID. */
export async function getCompanyById(id: string): Promise<CompanyRow | null> {
  const db = await getDb();
  const doc = await db.collection<CompanyDoc>("companies").findOne({ _id: id });
  if (!doc) return null;
  return docToCompanyRow(doc);
}

/** Create a new company manually (from the companies page). */
export async function createCompany(data: {
  name: string;
  domain?: string;
  niche?: string;
  description?: string;
  communicationStyle?: string;
  targetAudience?: string;
  servicesProducts?: string;
  brandVoice?: string;
  contentTypes?: ScriptType[];
}): Promise<CompanyRow> {
  const db = await getDb();
  const now = new Date();
  const domain = data.domain?.trim() || slugify(data.name);

  // Check if domain already exists
  const existing = await db.collection<CompanyDoc>("companies").findOne({ domain });
  if (existing) return docToCompanyRow(existing);

  const id = randomUUID();
  const doc: CompanyDoc = {
    _id: id,
    domain,
    name: data.name,
    niche: data.niche ?? null,
    description: data.description ?? null,
    communicationStyle: data.communicationStyle ?? null,
    targetAudience: data.targetAudience ?? null,
    servicesProducts: data.servicesProducts ?? null,
    brandVoice: data.brandVoice ?? null,
    contentTypes: data.contentTypes ?? [],
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<CompanyDoc>("companies").insertOne(doc);
  return docToCompanyRow(doc);
}

/** Update a company's full profile. */
export async function updateCompany(
  id: string,
  data: Partial<{
    name: string;
    niche: string;
    description: string;
    communicationStyle: string;
    targetAudience: string;
    servicesProducts: string;
    brandVoice: string;
    contentTypes: ScriptType[];
  }>
): Promise<CompanyRow | null> {
  const db = await getDb();
  const now = new Date();
  await db
    .collection<CompanyDoc>("companies")
    .updateOne({ _id: id }, { $set: { ...data, updatedAt: now } });
  return getCompanyById(id);
}

/** Update a company's display name (legacy helper). */
export async function updateCompanyName(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db
    .collection<CompanyDoc>("companies")
    .updateOne({ _id: id }, { $set: { name, updatedAt: new Date() } });
}

/** Delete a company (and optionally cascade). */
export async function deleteCompany(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<CompanyDoc>("companies").deleteOne({ _id: id });
  return result.deletedCount > 0;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
}

/* ═══════════════════════════════════════════════════════════════════
   PACKAGES
═══════════════════════════════════════════════════════════════════ */

function docToPackageRow(doc: PackageDoc, companyName?: string | null): PackageRow {
  return {
    id: doc._id,
    companyId: doc.companyId,
    companyName: companyName ?? null,
    name: doc.name,
    scriptType: doc.scriptType,
    status: doc.status,
    scriptCount: doc.scriptCount,
    createdAt: toISOSafe(doc.createdAt),
    updatedAt: toISOSafe(doc.updatedAt),
  };
}

/** List packages, optionally filtered by company. */
export async function listPackages(companyId?: string): Promise<PackageRow[]> {
  const db = await getDb();
  const filter = companyId ? { companyId } : {};
  const docs = await db
    .collection<PackageDoc>("packages")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  const rows: PackageRow[] = [];
  for (const doc of docs) {
    const company = await db.collection<CompanyDoc>("companies").findOne({ _id: doc.companyId });
    const scripts = await db
      .collection<ScriptDoc>("scripts")
      .find({ packageId: doc._id })
      .toArray();
    const validatedCount = scripts.filter((s) =>
      ["validated", "in_production", "filmed"].includes(s.status)
    ).length;
    const filmedCount = scripts.filter((s) => s.status === "filmed").length;

    rows.push({
      ...docToPackageRow(doc, company?.name),
      validatedCount,
      filmedCount,
      totalScripts: scripts.length,
    });
  }
  return rows;
}

/** Get a single package by ID. */
export async function getPackageById(id: string): Promise<PackageRow | null> {
  const db = await getDb();
  const doc = await db.collection<PackageDoc>("packages").findOne({ _id: id });
  if (!doc) return null;
  const company = await db.collection<CompanyDoc>("companies").findOne({ _id: doc.companyId });
  return docToPackageRow(doc, company?.name);
}

/** Create a new package. */
export async function createPackage(data: {
  companyId: string;
  name: string;
  scriptType: ScriptType;
  scriptCount?: number;
}): Promise<PackageRow> {
  const db = await getDb();
  const now = new Date();
  const id = randomUUID();
  const doc: PackageDoc = {
    _id: id,
    companyId: data.companyId,
    name: data.name,
    scriptType: data.scriptType,
    status: "active",
    scriptCount: data.scriptCount ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.collection<PackageDoc>("packages").insertOne(doc);
  const company = await db.collection<CompanyDoc>("companies").findOne({ _id: data.companyId });
  return docToPackageRow(doc, company?.name);
}

/** Update a package. */
export async function updatePackage(
  id: string,
  data: Partial<{ name: string; scriptType: ScriptType; status: PackageStatus; scriptCount: number }>
): Promise<PackageRow | null> {
  const db = await getDb();
  await db
    .collection<PackageDoc>("packages")
    .updateOne({ _id: id }, { $set: { ...data, updatedAt: new Date() } });
  return getPackageById(id);
}

/** Delete a package. */
export async function deletePackage(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<PackageDoc>("packages").deleteOne({ _id: id });
  return result.deletedCount > 0;
}

/* ═══════════════════════════════════════════════════════════════════
   SCRIPTS
═══════════════════════════════════════════════════════════════════ */

function docToScriptRow(
  doc: ScriptDoc,
  companyName?: string | null,
  packageName?: string | null
): ScriptRow {
  return {
    id: doc._id,
    companyId: doc.companyId,
    companyName: companyName ?? null,
    packageId: doc.packageId,
    packageName: packageName ?? null,
    generationId: doc.generationId,
    angle: doc.angle ?? "emotional",
    content: doc.content ?? "",
    status: doc.status ?? "generated",
    validatedAt: doc.validatedAt ? toISOSafe(doc.validatedAt) : null,
    inProductionAt: doc.inProductionAt ? toISOSafe(doc.inProductionAt) : null,
    filmedAt: doc.filmedAt ? toISOSafe(doc.filmedAt) : null,
    notes: doc.notes ?? "",
    createdAt: toISOSafe(doc.createdAt),
  };
}

/** Create scripts for a generation (3 angles at once). */
export async function createScripts(data: {
  companyId: string;
  packageId: string | null;
  generationId: string;
  scripts: Record<ScriptAngle, string>;
}): Promise<ScriptRow[]> {
  const db = await getDb();
  const now = new Date();
  const angles: ScriptAngle[] = ["emotional", "problem_solution", "curiosity"];
  const docs: ScriptDoc[] = angles.map((angle) => ({
    _id: randomUUID(),
    companyId: data.companyId,
    packageId: data.packageId,
    generationId: data.generationId,
    angle,
    content: data.scripts[angle] || "",
    status: "generated" as ScriptStatus,
    validatedAt: null,
    inProductionAt: null,
    filmedAt: null,
    notes: "",
    createdAt: now,
  }));

  await db.collection<ScriptDoc>("scripts").insertMany(docs);
  const company = await db.collection<CompanyDoc>("companies").findOne({ _id: data.companyId });
  const pkg = data.packageId
    ? await db.collection<PackageDoc>("packages").findOne({ _id: data.packageId })
    : null;

  return docs.map((d) => docToScriptRow(d, company?.name, pkg?.name));
}

/** List scripts with optional filters. */
export async function listScripts(filters?: {
  companyId?: string;
  packageId?: string;
  status?: ScriptStatus | ScriptStatus[];
}): Promise<ScriptRow[]> {
  const db = await getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: any = {};
  if (filters?.companyId) filter.companyId = filters.companyId;
  if (filters?.packageId) filter.packageId = filters.packageId;
  if (filters?.status) {
    filter.status = Array.isArray(filters.status)
      ? { $in: filters.status }
      : filters.status;
  }

  const docs = await db
    .collection<ScriptDoc>("scripts")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  if (docs.length === 0) return [];

  // Batch-fetch companies and packages (avoid N+1 queries)
  const companyIds = [...new Set(docs.map((d) => d.companyId).filter(Boolean))];
  const packageIds = [...new Set(docs.map((d) => d.packageId).filter(Boolean) as string[])];

  const [companies, packages] = await Promise.all([
    companyIds.length
      ? db.collection<CompanyDoc>("companies").find({ _id: { $in: companyIds } }).toArray()
      : Promise.resolve([]),
    packageIds.length
      ? db.collection<PackageDoc>("packages").find({ _id: { $in: packageIds } }).toArray()
      : Promise.resolve([]),
  ]);

  const companyMap = Object.fromEntries(companies.map((c) => [c._id, c.name]));
  const packageMap = Object.fromEntries(packages.map((p) => [p._id, p.name]));

  return docs.map((doc) =>
    docToScriptRow(doc, companyMap[doc.companyId] ?? null, doc.packageId ? packageMap[doc.packageId] ?? null : null)
  );
}

/** Get a single script by ID. */
export async function getScriptById(id: string): Promise<ScriptRow | null> {
  const db = await getDb();
  const doc = await db.collection<ScriptDoc>("scripts").findOne({ _id: id });
  if (!doc) return null;
  const company = await db.collection<CompanyDoc>("companies").findOne({ _id: doc.companyId });
  const pkg = doc.packageId
    ? await db.collection<PackageDoc>("packages").findOne({ _id: doc.packageId })
    : null;
  return docToScriptRow(doc, company?.name, pkg?.name);
}

/** Update a script's status. */
export async function updateScriptStatus(
  id: string,
  status: ScriptStatus,
  meta?: { notes?: string }
): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { status };
  if (status === "validated") update.validatedAt = now;
  if (status === "in_production") update.inProductionAt = now;
  if (status === "filmed") update.filmedAt = now;
  if (status === "generated") {
    update.validatedAt = null;
    update.inProductionAt = null;
    update.filmedAt = null;
  }
  if (meta?.notes !== undefined) update.notes = meta.notes;

  const result = await db
    .collection<ScriptDoc>("scripts")
    .updateOne({ _id: id }, { $set: update });
  return result.matchedCount > 0;
}

/** Update a script's content or notes. */
export async function updateScript(
  id: string,
  data: Partial<{ content: string; notes: string; packageId: string | null }>
): Promise<ScriptRow | null> {
  const db = await getDb();
  await db.collection<ScriptDoc>("scripts").updateOne({ _id: id }, { $set: data });
  return getScriptById(id);
}

/** Bulk update status for multiple scripts. */
export async function bulkUpdateScriptStatus(
  scriptIds: string[],
  status: ScriptStatus
): Promise<number> {
  const db = await getDb();
  const now = new Date();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: any = { status };
  if (status === "validated") update.validatedAt = now;
  if (status === "in_production") update.inProductionAt = now;
  if (status === "filmed") update.filmedAt = now;

  const result = await db
    .collection<ScriptDoc>("scripts")
    .updateMany({ _id: { $in: scriptIds } }, { $set: update });
  return result.modifiedCount;
}

/** Delete a script. */
export async function deleteScript(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<ScriptDoc>("scripts").deleteOne({ _id: id });
  return result.deletedCount > 0;
}

/* ═══════════════════════════════════════════════════════════════════
   REFERENCE SCRIPTS
═══════════════════════════════════════════════════════════════════ */

function docToReferenceScriptRow(doc: ReferenceScriptDoc): ReferenceScriptRow {
  return {
    id: doc._id,
    companyId: doc.companyId,
    title: doc.title,
    content: doc.content,
    scriptType: doc.scriptType,
    sourceType: doc.sourceType,
    createdAt: toISOSafe(doc.createdAt),
  };
}

export async function listReferenceScripts(companyId: string): Promise<ReferenceScriptRow[]> {
  const db = await getDb();
  const docs = await db
    .collection<ReferenceScriptDoc>("reference_scripts")
    .find({ companyId })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(docToReferenceScriptRow);
}

export async function createReferenceScript(data: {
  companyId: string;
  title: string;
  content: string;
  scriptType?: ScriptType | null;
  sourceType?: "manual" | "file";
}): Promise<ReferenceScriptRow> {
  const db = await getDb();
  const now = new Date();
  const doc: ReferenceScriptDoc = {
    _id: randomUUID(),
    companyId: data.companyId,
    title: data.title,
    content: data.content,
    scriptType: data.scriptType ?? null,
    sourceType: data.sourceType ?? "manual",
    createdAt: now,
  };
  await db.collection<ReferenceScriptDoc>("reference_scripts").insertOne(doc);
  return docToReferenceScriptRow(doc);
}

export async function deleteReferenceScript(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<ReferenceScriptDoc>("reference_scripts").deleteOne({ _id: id });
  return result.deletedCount > 0;
}

/* ═══════════════════════════════════════════════════════════════════
   LEARNING CONTEXT (for generation intelligence)
═══════════════════════════════════════════════════════════════════ */

export interface ValidatedScriptCtx {
  angle: string;
  content: string;
  scriptType: string;
  inputNiche: string | null;
}

/**
 * Return up to `limit` validated scripts for a company (from scripts collection).
 * Falls back to legacy generation-based validated scripts.
 */
export async function getValidatedScriptsForCompany(
  companyId: string,
  limit = 5
): Promise<ValidatedScriptCtx[]> {
  const db = await getDb();

  // First try the scripts collection
  const scriptDocs = await db
    .collection<ScriptDoc>("scripts")
    .find({
      companyId,
      status: { $in: ["validated", "in_production", "filmed"] },
    })
    .sort({ validatedAt: -1 })
    .limit(limit)
    .toArray();

  if (scriptDocs.length > 0) {
    return scriptDocs.map((s) => ({
      angle: s.angle,
      content: s.content,
      scriptType: "ugc",
      inputNiche: null,
    }));
  }

  // Fallback: legacy generations collection
  const genDocs = await db
    .collection<GenerationDoc>("generations")
    .find({ companyId, validatedAngle: { $ne: null } })
    .sort({ validatedAt: -1 })
    .limit(limit)
    .toArray();

  return genDocs
    .filter((d) => d.validatedAngle && d.scripts[d.validatedAngle])
    .map((d) => ({
      angle: d.validatedAngle!,
      content: d.scripts[d.validatedAngle!],
      scriptType: d.scriptType,
      inputNiche: d.inputNiche,
    }));
}

/**
 * Return validated scripts from OTHER companies (to avoid pattern repetition).
 */
export async function getGlobalValidatedScripts(
  excludeCompanyId: string,
  limit = 3
): Promise<ValidatedScriptCtx[]> {
  const db = await getDb();

  const scriptDocs = await db
    .collection<ScriptDoc>("scripts")
    .find({
      companyId: { $ne: excludeCompanyId },
      status: { $in: ["validated", "in_production", "filmed"] },
    })
    .sort({ validatedAt: -1 })
    .limit(limit)
    .toArray();

  return scriptDocs.map((s) => ({
    angle: s.angle,
    content: s.content.slice(0, 120),
    scriptType: "ugc",
    inputNiche: null,
  }));
}

/**
 * Build the full learning context string for Claude prompt injection.
 */
export async function buildLearningContext(
  companyId: string,
  company?: CompanyRow | null
): Promise<string> {
  const fewShot = await getValidatedScriptsForCompany(companyId, 5);
  const globalPatterns = companyId ? await getGlobalValidatedScripts(companyId, 3) : [];
  const referenceScripts = await listReferenceScripts(companyId);

  const angleLabels: Record<string, string> = {
    emotional: "ÉMOTIONNEL",
    problem_solution: "PROBLÈME/SOLUTION",
    curiosity: "CURIOSITÉ",
  };

  let context = "";

  // Company profile injection
  if (company) {
    const profileLines: string[] = [];
    if (company.description) profileLines.push(`Description : ${company.description}`);
    if (company.communicationStyle) profileLines.push(`Style de communication : ${company.communicationStyle}`);
    if (company.targetAudience) profileLines.push(`Cible : ${company.targetAudience}`);
    if (company.servicesProducts) profileLines.push(`Produits/Services : ${company.servicesProducts}`);
    if (company.brandVoice) profileLines.push(`Personnalité de marque : ${company.brandVoice}`);

    if (profileLines.length > 0) {
      context +=
        `\n\n╔══════════════════════════════════════════════════════╗\n` +
        `  PROFIL DE LA MARQUE : ${company.name ?? company.domain}\n` +
        `╚══════════════════════════════════════════════════════╝\n` +
        profileLines.join("\n");
    }
  }

  // Few-shot examples from this company
  if (fewShot.length > 0) {
    const examples = fewShot
      .map(
        (s, i) =>
          `[Script validé ${i + 1} — ${angleLabels[s.angle] ?? s.angle.toUpperCase()}]\n${s.content}`
      )
      .join("\n\n---\n\n");

    context +=
      `\n\n╔══════════════════════════════════════════════════════╗\n` +
      `  SCRIPTS DÉJÀ VALIDÉS POUR CETTE MARQUE (${fewShot.length} exemple${fewShot.length > 1 ? "s" : ""})\n` +
      `  → Inspire-toi du TON, du STYLE et du VOCABULAIRE.\n` +
      `  → Ne copie pas mot pour mot — crée quelque chose de nouveau.\n` +
      `╚══════════════════════════════════════════════════════╝\n\n` +
      examples;
  }

  // Reference scripts provided by the client
  if (referenceScripts.length > 0) {
    const refs = referenceScripts
      .slice(0, 3)
      .map((r, i) => `[Modèle de référence ${i + 1}${r.title ? ` — "${r.title}"` : ""}]\n${r.content.slice(0, 800)}`)
      .join("\n\n---\n\n");

    context +=
      `\n\n╔══════════════════════════════════════════════════════╗\n` +
      `  MODÈLES DE SCRIPTS FOURNIS PAR LE CLIENT (${referenceScripts.length})\n` +
      `  → Ces scripts définissent le FORMAT, le TON et le STYLE attendus.\n` +
      `  → Adapte-toi à leur façon d'écrire, leur vocabulaire, leur rythme.\n` +
      `╚══════════════════════════════════════════════════════╝\n\n` +
      refs;
  }

  // Global reference scripts (apply to all companies)
  const globalRefScripts = await listGlobalReferenceScripts();
  if (globalRefScripts.length > 0) {
    const globalRefs = globalRefScripts
      .slice(0, 3)
      .map((r, i) => `[Modèle global ${i + 1}${r.title ? ` — "${r.title}"` : ""}]\n${r.content.slice(0, 800)}`)
      .join("\n\n---\n\n");

    context +=
      `\n\n╔══════════════════════════════════════════════════════╗\n` +
      `  MODÈLES GLOBAUX DE RÉFÉRENCE (${globalRefScripts.length})\n` +
      `  → Ces scripts définissent les BEST PRACTICES générales du format UGC.\n` +
      `  → Adapte leur structure et rythme à chaque nouveau script.\n` +
      `╚══════════════════════════════════════════════════════╝\n\n` +
      globalRefs;
  }

  // Patterns to avoid from other companies
  if (globalPatterns.length > 0) {
    const patterns = globalPatterns
      .map((s) => `- "${s.content.trim().substring(0, 100)}…"`)
      .join("\n");

    context +=
      `\n\n╔══════════════════════════════════════════════════════╗\n` +
      `  STRUCTURES DÉJÀ UTILISÉES — À NE PAS RÉPÉTER\n` +
      `  Ces hooks/structures ont été utilisés pour d'autres marques.\n` +
      `  Évite de les reproduire — sois original.\n` +
      `╚══════════════════════════════════════════════════════╝\n` +
      patterns;
  }

  return context;
}

/* ═══════════════════════════════════════════════════════════════════
   GLOBAL REFERENCE SCRIPTS (apply to all companies)
═══════════════════════════════════════════════════════════════════ */

function docToGlobalReferenceScriptRow(doc: GlobalReferenceScriptDoc): GlobalReferenceScriptRow {
  return {
    id: doc._id,
    title: doc.title,
    content: doc.content,
    scriptType: doc.scriptType,
    sourceType: doc.sourceType,
    createdAt: toISOSafe(doc.createdAt),
  };
}

export async function listGlobalReferenceScripts(): Promise<GlobalReferenceScriptRow[]> {
  const db = await getDb();
  const docs = await db
    .collection<GlobalReferenceScriptDoc>("global_reference_scripts")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(docToGlobalReferenceScriptRow);
}

export async function createGlobalReferenceScript(data: {
  title: string;
  content: string;
  scriptType: ScriptType | null;
  sourceType: "manual" | "file";
}): Promise<GlobalReferenceScriptRow> {
  const db = await getDb();
  const doc: GlobalReferenceScriptDoc = {
    _id: randomUUID(),
    title: data.title,
    content: data.content,
    scriptType: data.scriptType,
    sourceType: data.sourceType,
    createdAt: new Date(),
  };
  await db.collection<GlobalReferenceScriptDoc>("global_reference_scripts").insertOne(doc);
  return docToGlobalReferenceScriptRow(doc);
}

export async function deleteGlobalReferenceScript(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection<GlobalReferenceScriptDoc>("global_reference_scripts")
    .deleteOne({ _id: id });
  return result.deletedCount > 0;
}

/* ═══════════════════════════════════════════════════════════════════
   GENERATIONS
═══════════════════════════════════════════════════════════════════ */

export async function insertGeneration(data: {
  id: string;
  companyId: string | null;
  companyDomain: string | null;
  packageId?: string | null;
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
    packageId: data.packageId ?? null,
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

/* ─── Validation (legacy — operates on generations) ─────────────── */

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

/**
 * Update the content of a specific angle's script inside a generation document.
 */
export async function updateGenerationScript(
  generationId: string,
  angle: string,
  content: string
): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection<GenerationDoc>("generations")
    .updateOne(
      { _id: generationId },
      { $set: { [`scripts.${angle}`]: content } }
    );
  return result.matchedCount > 0;
}

/* ─── History ─────────────────────────────────────────────────────── */

function docToHistoryEntry(doc: GenerationDoc, companyName?: string | null, packageName?: string | null): HistoryEntry {
  return {
    id: doc._id,
    createdAt: toISOSafe(doc.createdAt),
    input: {
      url: doc.inputUrl ?? undefined,
      niche: doc.inputNiche ?? undefined,
      description: doc.inputDescription ?? undefined,
      instructions: doc.inputInstructions ?? undefined,
      scriptType: doc.scriptType as import("./types").ScriptType,
      duration: doc.duration as import("./types").Duration,
    },
    scripts: doc.scripts as Record<import("./types").ScriptAngle, string>,
    cost: doc.costUsd ?? 0,
    validated: (doc.validatedAngle as import("./types").ScriptAngle | null) ?? undefined,
    companyId: doc.companyId,
    packageId: doc.packageId,
    companyName: companyName ?? null,
    packageName: packageName ?? null,
  };
}

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

  if (docs.length === 0) return [];

  // Batch-fetch companies and packages (avoid N+1 queries)
  const companyIds = [...new Set(docs.map((d) => d.companyId).filter(Boolean) as string[])];
  const packageIds = [...new Set(docs.map((d) => d.packageId).filter(Boolean) as string[])];

  const [companies, packages] = await Promise.all([
    companyIds.length
      ? db.collection<CompanyDoc>("companies").find({ _id: { $in: companyIds } }).toArray()
      : Promise.resolve([]),
    packageIds.length
      ? db.collection<PackageDoc>("packages").find({ _id: { $in: packageIds } }).toArray()
      : Promise.resolve([]),
  ]);

  const companyMap = Object.fromEntries(companies.map((c) => [c._id, c.name]));
  const packageMap = Object.fromEntries(packages.map((p) => [p._id, p.name]));

  return docs.map((doc) =>
    docToHistoryEntry(
      doc,
      doc.companyId ? companyMap[doc.companyId] ?? null : null,
      doc.packageId ? packageMap[doc.packageId] ?? null : null
    )
  );
}

export async function deleteGeneration(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .collection<GenerationDoc>("generations")
    .deleteOne({ _id: id });
  return result.deletedCount > 0;
}

/* ═══════════════════════════════════════════════════════════════════
   SHARE TOKENS — client review links
═══════════════════════════════════════════════════════════════════ */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://ugc-app-akow.vercel.app";

function docToShareTokenRow(doc: ShareTokenDoc): ShareTokenRow {
  return {
    token: doc._id,
    scriptId: doc.scriptId,
    companyId: doc.companyId,
    companyName: doc.companyName,
    createdAt: toISOSafe(doc.createdAt),
    expiresAt: doc.expiresAt ? toISOSafe(doc.expiresAt) : null,
    clientName: doc.clientName,
    clientContent: doc.clientContent,
    clientComment: doc.clientComment,
    clientStatus: doc.clientStatus,
    clientRespondedAt: doc.clientRespondedAt ? toISOSafe(doc.clientRespondedAt) : null,
    shareUrl: `${APP_URL}/share/${doc._id}`,
  };
}

export async function createShareToken(data: {
  scriptId: string;
  companyId: string;
  companyName: string | null;
  clientName?: string | null;
  expiresInDays?: number;
}): Promise<ShareTokenRow> {
  const db = await getDb();
  const token = randomUUID();
  const now = new Date();
  const expiresAt = data.expiresInDays
    ? new Date(now.getTime() + data.expiresInDays * 86400000)
    : null;

  const doc: ShareTokenDoc = {
    _id: token,
    scriptId: data.scriptId,
    companyId: data.companyId,
    companyName: data.companyName ?? null,
    createdAt: now,
    expiresAt,
    clientName: data.clientName ?? null,
    clientContent: null,
    clientComment: null,
    clientStatus: "pending",
    clientRespondedAt: null,
  };

  await db.collection<ShareTokenDoc>("share_tokens").insertOne(doc);
  return docToShareTokenRow(doc);
}

export async function getShareToken(token: string): Promise<ShareTokenRow | null> {
  const db = await getDb();
  const doc = await db.collection<ShareTokenDoc>("share_tokens").findOne({ _id: token });
  if (!doc) return null;
  return docToShareTokenRow(doc);
}

export async function listShareTokensForScript(scriptId: string): Promise<ShareTokenRow[]> {
  const db = await getDb();
  const docs = await db
    .collection<ShareTokenDoc>("share_tokens")
    .find({ scriptId })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map(docToShareTokenRow);
}

export async function updateShareTokenClientResponse(
  token: string,
  data: {
    clientName?: string;
    clientContent?: string | null;
    clientComment?: string | null;
    clientStatus: "pending" | "approved" | "changes_requested";
  }
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<ShareTokenDoc>("share_tokens").updateOne(
    { _id: token },
    {
      $set: {
        ...(data.clientName !== undefined ? { clientName: data.clientName } : {}),
        ...(data.clientContent !== undefined ? { clientContent: data.clientContent } : {}),
        ...(data.clientComment !== undefined ? { clientComment: data.clientComment } : {}),
        clientStatus: data.clientStatus,
        clientRespondedAt: new Date(),
      },
    }
  );
  return result.matchedCount > 0;
}

export async function deleteShareToken(token: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<ShareTokenDoc>("share_tokens").deleteOne({ _id: token });
  return result.deletedCount > 0;
}
