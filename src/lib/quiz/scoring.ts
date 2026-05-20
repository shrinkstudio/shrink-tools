import { QUESTIONS, type Answers, type Dimension } from "./schema";

export type ResultState = "ready" | "close" | "not_yet";

export type ScoreBreakdown = {
  moment: number;
  clarity: number;
  team: number;
  gapExternal: number;
  gapInternal: number;
  readiness: number;
  urgency: number;
};

export type QuizResult = {
  state: ResultState;
  scores: ScoreBreakdown;
  jtbd: string[];
  shape: string | null;
  headline: string;
  diagnosis: string;
  recommendedEngagement: {
    id: "seed-website" | "clarity-sprint" | "discovery" | "audit" | "resource";
    label: string;
    href: string;
    cta: string;
  };
};

function scoreOf(questionId: string, answers: Answers): number {
  const q = QUESTIONS.find((q) => q.id === questionId);
  if (!q) return 0;
  const ans = answers[questionId];
  if (typeof ans !== "string") return 0;
  const opt = q.options.find((o) => o.id === ans);
  return opt?.score ?? 0;
}

function dimensionScore(dim: Dimension, answers: Answers): number {
  const q = QUESTIONS.find((q) => q.dimension === dim);
  if (!q) return 0;
  return scoreOf(q.id, answers);
}

export function computeScores(answers: Answers): ScoreBreakdown {
  const moment = dimensionScore("moment", answers);
  const clarity = dimensionScore("clarity", answers);
  const team = dimensionScore("team", answers);
  const gapExternal = dimensionScore("gapExternal", answers);
  const gapInternal = dimensionScore("gapInternal", answers);
  return {
    moment,
    clarity,
    team,
    gapExternal,
    gapInternal,
    readiness: moment + clarity + team,
    urgency: gapExternal + gapInternal,
  };
}

function deriveState(s: ScoreBreakdown): ResultState {
  if (s.moment < 2) return "not_yet";
  if (s.clarity >= 2 && s.team >= 2) return "ready";
  return "close";
}

function buildDiagnosis(state: ResultState, s: ScoreBreakdown, urgent: boolean): string {
  if (state === "ready") {
    if (urgent) {
      return "You're at the moment. The brief is there, the team's there, and the gap between where you are and what's expected is wide enough that moving sooner pays off.";
    }
    return "You're at the moment. Clarity, team, and timing all line up — this is the point where briefing a build pays the most.";
  }
  if (state === "close") {
    const weakClarity = s.clarity < 2;
    const weakTeam = s.team < 2;
    if (weakClarity && weakTeam) {
      return "The funding's there, but the brief isn't yet. Positioning and team ownership need to land before a build is worth briefing.";
    }
    if (weakClarity) {
      return "The timing and team are there. What's missing is the clarity — whose homepage you're writing and what it has to say.";
    }
    return "The thinking is there. What's missing is someone inside the company who owns the build with real time to give it.";
  }
  return "Now isn't the moment for a full rebuild — but there's groundwork worth doing so you're ready when it is.";
}

function buildHeadline(state: ResultState): string {
  if (state === "ready") return "You're ready to brief a build.";
  if (state === "close") return "Close — but the brief isn't there yet.";
  return "Not the moment yet — but worth laying the groundwork.";
}

function recommendEngagement(
  state: ResultState,
  s: ScoreBreakdown,
  shape: string | null
): QuizResult["recommendedEngagement"] {
  if (state === "ready") {
    if (shape === "sprint") {
      return {
        id: "clarity-sprint",
        label: "Clarity Sprint",
        href: "https://shrink.studio",
        cta: "Send us the brief",
      };
    }
    if (shape === "discovery") {
      return {
        id: "discovery",
        label: "Discovery",
        href: "https://shrink.studio",
        cta: "Send us the brief",
      };
    }
    return {
      id: "seed-website",
      label: "Seed Website",
      href: "https://shrink.studio",
      cta: "Send us the brief",
    };
  }
  if (state === "close") {
    if (s.clarity < 2) {
      return {
        id: "clarity-sprint",
        label: "Clarity Sprint",
        href: "https://shrink.studio",
        cta: "Book a free audit",
      };
    }
    return {
      id: "discovery",
      label: "Discovery",
      href: "https://shrink.studio",
      cta: "Book a free audit",
    };
  }
  return {
    id: "resource",
    label: "The funding moment article",
    href: "https://shrink.studio",
    cta: "Read the article",
  };
}

export function computeResult(answers: Answers): QuizResult {
  const scores = computeScores(answers);
  const state = deriveState(scores);
  const urgent = scores.urgency >= 4;
  const jtbdRaw = answers["jtbd"];
  const jtbd = Array.isArray(jtbdRaw) ? jtbdRaw : [];
  const shapeRaw = answers["shape"];
  const shape = typeof shapeRaw === "string" ? shapeRaw : null;

  return {
    state,
    scores,
    jtbd,
    shape,
    headline: buildHeadline(state),
    diagnosis: buildDiagnosis(state, scores, urgent),
    recommendedEngagement: recommendEngagement(state, scores, shape),
  };
}
