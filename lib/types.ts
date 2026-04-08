export type ScriptType = "ugc" | "micro_trottoir" | "face_cam" | "auto";
export type Duration = "0-15" | "15-30" | "30-60" | "60-120";
export type ScriptAngle = "emotional" | "problem_solution" | "curiosity";

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
