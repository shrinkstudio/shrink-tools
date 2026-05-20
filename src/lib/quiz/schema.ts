export type Dimension =
  | "moment"
  | "clarity"
  | "gapExternal"
  | "gapInternal"
  | "jtbd"
  | "team"
  | "shape";

export type QuestionType = "single" | "multi";

export type QuestionOption = {
  id: string;
  label: string;
  score?: number;
};

export type Question = {
  id: string;
  dimension: Dimension;
  type: QuestionType;
  prompt: string;
  helper?: string;
  options: QuestionOption[];
  maxSelections?: number;
};

export const QUESTIONS: Question[] = [
  {
    id: "moment",
    dimension: "moment",
    type: "single",
    prompt: "Where are you in the funding journey?",
    helper: "We work with venture-backed teams. This helps us tell you if now is the moment.",
    options: [
      { id: "pre-raise", label: "Pre-seed, or haven't raised yet", score: 0 },
      { id: "recent-seed", label: "Recently raised seed (within 6 months)", score: 3 },
      { id: "mid-cycle", label: "Raised seed or Series A 6–18 months ago", score: 3 },
      { id: "post-cycle", label: "Raised over 18 months ago", score: 2 },
      { id: "bootstrapped", label: "Bootstrapped, post-revenue", score: 1 },
    ],
  },
  {
    id: "clarity",
    dimension: "clarity",
    type: "single",
    prompt: "Whose homepage are you writing — yours, or your customer's?",
    helper: "The sharpest sites are written from the customer's point of view, not the product's.",
    options: [
      { id: "customer", label: "Our customer's — their problems, their world", score: 3 },
      { id: "mixed", label: "A mix, depending where you look", score: 2 },
      { id: "ours", label: "Ours — our product, our story", score: 1 },
      { id: "unclear", label: "Honestly, we haven't worked that out yet", score: 0 },
    ],
  },
  {
    id: "gap-external",
    dimension: "gapExternal",
    type: "single",
    prompt: "When an investor or enterprise prospect Googles you, does the site hold up?",
    options: [
      { id: "confident", label: "Confidently — we'd point them straight at it", score: 0 },
      { id: "does-job", label: "It does the job", score: 1 },
      { id: "rather-not", label: "We'd rather they didn't look too hard", score: 2 },
      { id: "hurts", label: "It actively hurts us", score: 3 },
    ],
  },
  {
    id: "gap-internal",
    dimension: "gapInternal",
    type: "single",
    prompt: "Does your marketing team have somewhere to point campaigns?",
    options: [
      { id: "yes-kit", label: "Yes — landing pages, sector pages, the full kit", score: 0 },
      { id: "sort-of", label: "Sort of — they make it work", score: 1 },
      { id: "work-around", label: "They mostly work around the site", score: 2 },
      { id: "no-team", label: "There isn't really a marketing team yet", score: 3 },
    ],
  },
  {
    id: "jtbd",
    dimension: "jtbd",
    type: "multi",
    prompt: "What does the next site need to do? (Pick up to three.)",
    helper: "We'll play these back as the priorities your build has to deliver on.",
    maxSelections: 3,
    options: [
      { id: "convert-demos", label: "Convert demo or trial requests" },
      { id: "land-enterprise", label: "Land enterprise prospects" },
      { id: "support-recruiting", label: "Support hiring and recruiting" },
      { id: "brief-investors", label: "Brief investors on the next round" },
      { id: "launch-narratives", label: "Launch new product narratives" },
      { id: "marketing-experiments", label: "Let marketing experiment fast" },
      { id: "company-story", label: "Tell the company story properly" },
    ],
  },
  {
    id: "team",
    dimension: "team",
    type: "single",
    prompt: "Who owns this internally — and have they got the time?",
    options: [
      { id: "named-time", label: "Named owner with time carved out", score: 3 },
      { id: "named-no-time", label: "Named owner, but no real time", score: 2 },
      { id: "whoever", label: "Whoever's free that week", score: 1 },
      { id: "no-one", label: "No one yet", score: 0 },
    ],
  },
  {
    id: "shape",
    dimension: "shape",
    type: "single",
    prompt: "What feels closest to what you need?",
    helper: "There are no wrong answers — we use this to point you at the right starting point.",
    options: [
      { id: "rebuild", label: "A full rebuild" },
      { id: "sprint", label: "A targeted sprint on specific gaps" },
      { id: "discovery", label: "Discovery first, build later" },
      { id: "unsure", label: "Honestly, not sure" },
    ],
  },
];

export const QUESTION_COUNT = QUESTIONS.length;

export type Answers = Record<string, string | string[]>;
