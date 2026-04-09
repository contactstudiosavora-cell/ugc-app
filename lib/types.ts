export type ScriptType = "ugc" | "micro_trottoir" | "face_cam" | "auto";
export type Duration = "0-15" | "15-30" | "30-60" | "60-120";
export type ScriptAngle = "emotional" | "problem_solution" | "curiosity";
export type PackageStatus = "active" | "filming" | "completed";
export type ScriptStatus = "generated" | "validated" | "in_production" | "filmed";

/* ─── Legacy (kept for backward compat with history) ──────────── */

export interface GenerationInput {
  url?: string;
  niche?: string;
  description?: string;
  instructions?: string;
  scriptType: ScriptType;
  duration: Duration;
}

export interface HistoryEntry {
  id: string;
  createdAt: string;
  input: GenerationInput;
  scripts: Record<ScriptAngle, string>;
  cost: number;
  validated?: ScriptAngle | null;
  companyId?: string | null;
  companyName?: string | null;
  packageId?: string | null;
  packageName?: string | null;
}

export interface CostInfo {
  thisRequest: number;
  totalThisMonth: number;
  remainingBudget: number;
  percentUsed: number;
  inputTokens: number;
  outputTokens: number;
}

export interface BudgetStats {
  budget: number;
  remaining: number;
  percentUsed: number;
  usage: {
    totalRequests: number;
    totalCostUSD: number;
  };
}

/* ─── Company ──────────────────────────────────────────────────── */

export interface CompanyDoc {
  _id: string;
  domain: string;
  name: string | null;
  niche: string | null;
  /** Full brand description (what they do, who they are) */
  description: string | null;
  /** Communication style: "casual et engagé", "expert et sérieux"… */
  communicationStyle: string | null;
  /** Target audience: "femmes 25-45 ans, sportives"… */
  targetAudience: string | null;
  /** What they sell: services, products description */
  servicesProducts: string | null;
  /** Brand voice / personality traits */
  brandVoice: string | null;
  /** Preferred content types */
  contentTypes: ScriptType[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyRow {
  id: string;
  domain: string;
  name: string | null;
  niche: string | null;
  description: string | null;
  communicationStyle: string | null;
  targetAudience: string | null;
  servicesProducts: string | null;
  brandVoice: string | null;
  contentTypes: ScriptType[];
  createdAt: string;
  updatedAt: string;
  generationCount?: number;
  validatedCount?: number;
  packageCount?: number;
}

/* ─── Package ──────────────────────────────────────────────────── */

export interface PackageDoc {
  _id: string;
  companyId: string;
  name: string;
  scriptType: ScriptType;
  status: PackageStatus;
  /** Target number of scripts in this package */
  scriptCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackageRow {
  id: string;
  companyId: string;
  companyName?: string | null;
  name: string;
  scriptType: ScriptType;
  status: PackageStatus;
  scriptCount: number;
  createdAt: string;
  updatedAt: string;
  validatedCount?: number;
  filmedCount?: number;
  totalScripts?: number;
}

/* ─── Script ───────────────────────────────────────────────────── */

export interface ScriptDoc {
  _id: string;
  companyId: string;
  packageId: string | null;
  generationId: string | null;
  angle: ScriptAngle;
  content: string;
  status: ScriptStatus;
  validatedAt: Date | null;
  inProductionAt: Date | null;
  filmedAt: Date | null;
  notes: string;
  createdAt: Date;
}

export interface ScriptRow {
  id: string;
  companyId: string;
  companyName?: string | null;
  packageId: string | null;
  packageName?: string | null;
  generationId: string | null;
  angle: ScriptAngle;
  content: string;
  status: ScriptStatus;
  validatedAt: string | null;
  inProductionAt: string | null;
  filmedAt: string | null;
  notes: string;
  createdAt: string;
}

/* ─── Generation (existing, extended) ─────────────────────────── */

export interface GenerationDoc {
  _id: string;
  companyId: string | null;
  companyDomain: string | null;
  packageId: string | null;
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

/* ─── Reference Scripts ────────────────────────────────────────── */

export interface ReferenceScriptDoc {
  _id: string;
  companyId: string;
  title: string;
  content: string;
  scriptType: ScriptType | null;
  sourceType: "manual" | "file";
  createdAt: Date;
}

export interface ReferenceScriptRow {
  id: string;
  companyId: string;
  title: string;
  content: string;
  scriptType: ScriptType | null;
  sourceType: "manual" | "file";
  createdAt: string;
}

export interface GlobalReferenceScriptDoc {
  _id: string;
  title: string;
  content: string;
  scriptType: ScriptType | null;
  sourceType: "manual" | "file";
  createdAt: Date;
}

export interface GlobalReferenceScriptRow {
  id: string;
  title: string;
  content: string;
  scriptType: ScriptType | null;
  sourceType: "manual" | "file";
  createdAt: string;
}
