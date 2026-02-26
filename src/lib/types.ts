export interface CategoryScore {
  name: string;
  score: number;
  description: string;
}

export interface Strength {
  title: string;
  impact: "HIGH" | "MEDIUM";
  description: string;
}

export interface Improvement {
  title: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  recommendation: string;
}

export interface AnalysisResult {
  overallScore: number;
  summary: string;
  categories: CategoryScore[];
  strengths: Strength[];
  improvements: Improvement[];
  reportId?: string | null;
}

export type AppState = "idle" | "loading" | "gated" | "results";
