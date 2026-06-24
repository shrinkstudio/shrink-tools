// -----------------------------------------------------------------------------
// PROJECT CALCULATOR — abstract question model + pricing
//
// Plain-language questions ("need design? how many pages?") that map to real
// effort, priced off the Shrink rate card recovered in src/lib/estimator-data/
// config.json (same roles + overhead/day the internal scoping tool uses).
//
// The questions and effort weights below are the ONLY things to tune — the UI
// renders generically from QUESTIONS and the result comes from computeEstimate.
// -----------------------------------------------------------------------------

import rawConfig from "@/lib/estimator-data/config.json";
import { calculateClientDayRate, type Role } from "@/lib/estimator";

const config = rawConfig as unknown as {
  overheadPerDay: number;
  roles: Role[];
};

const ROLES = config.roles;
const OVERHEAD = config.overheadPerDay;

function rate(roleId: string): number {
  const r = ROLES.find((x) => x.id === roleId);
  if (!r) return 0;
  return calculateClientDayRate(r.baseCostDay, OVERHEAD, r.markupPct);
}

// --- Question model ----------------------------------------------------------
export type Option = { value: string; label: string; hint?: string };

export type Question = {
  id: string;
  kind: "single" | "multi";
  title: string;
  subtitle?: string;
  options: Option[];
  // Only show this question when the predicate passes.
  visibleWhen?: (a: Answers) => boolean;
};

export type Answers = Record<string, string | string[]>;

export const QUESTIONS: Question[] = [
  {
    id: "type",
    kind: "single",
    title: "What are you looking to build?",
    subtitle: "We'll tailor the questions from here.",
    options: [
      { value: "marketing-site", label: "A new marketing website", hint: "Brochure / product site" },
      { value: "redesign", label: "A redesign of our existing site", hint: "Rebuild, same content shape" },
      { value: "web-app", label: "A web app or product", hint: "Logins, data, custom logic" },
      { value: "optimisation", label: "Ongoing growth & optimisation", hint: "A monthly retainer" },
    ],
  },
  // --- Website branch --------------------------------------------------------
  {
    id: "pages",
    kind: "single",
    title: "Roughly how big is the site?",
    subtitle: "A rough count of unique page designs — not every blog post.",
    visibleWhen: (a) => a.type === "marketing-site" || a.type === "redesign",
    options: [
      { value: "small", label: "1–5 pages", hint: "Landing or compact site" },
      { value: "medium", label: "6–12 pages", hint: "Typical company site" },
      { value: "large", label: "13–25 pages", hint: "Content-rich" },
      { value: "xl", label: "25+ pages", hint: "Large / multi-section" },
    ],
  },
  {
    id: "design",
    kind: "single",
    title: "How much design do you need?",
    visibleWhen: (a) => a.type === "marketing-site" || a.type === "redesign",
    options: [
      { value: "full", label: "Design it from scratch", hint: "New look, built around your brand" },
      { value: "partial", label: "We have a brand — apply it", hint: "Style guide exists, no UI yet" },
      { value: "none", label: "We'll provide finished designs", hint: "Build only" },
    ],
  },
  {
    id: "cms",
    kind: "single",
    title: "Will it have content you update regularly?",
    subtitle: "Blog, case studies, careers, resources — anything CMS-driven.",
    visibleWhen: (a) => a.type === "marketing-site" || a.type === "redesign",
    options: [
      { value: "yes", label: "Yes — we'll publish often", hint: "CMS collections + templates" },
      { value: "no", label: "No — mostly static", hint: "Fixed pages" },
    ],
  },
  // --- Web app branch --------------------------------------------------------
  {
    id: "appSize",
    kind: "single",
    title: "How big is the product?",
    subtitle: "Roughly how much there is to design and build.",
    visibleWhen: (a) => a.type === "web-app",
    options: [
      { value: "mvp", label: "An MVP / first version", hint: "Prove the core idea" },
      { value: "standard", label: "A full v1 product", hint: "Several connected features" },
      { value: "large", label: "A large platform", hint: "Many roles & workflows" },
    ],
  },
  {
    id: "appModules",
    kind: "multi",
    title: "Which of these does it need?",
    subtitle: "Pick all that apply.",
    visibleWhen: (a) => a.type === "web-app",
    options: [
      { value: "auth", label: "User accounts & logins" },
      { value: "payments", label: "Payments / billing" },
      { value: "dashboard", label: "Dashboards & data views" },
      { value: "integrations", label: "Third-party integrations" },
      { value: "admin", label: "Admin / back-office tools" },
    ],
  },
  // --- Optimisation branch ---------------------------------------------------
  {
    id: "optIntensity",
    kind: "single",
    title: "How hands-on should we be?",
    visibleWhen: (a) => a.type === "optimisation",
    options: [
      { value: "light", label: "Light touch", hint: "Monthly reviews + small tweaks" },
      { value: "standard", label: "Active programme", hint: "CRO, SEO & ongoing dev" },
      { value: "compound", label: "Shrink Compound", hint: "Full AEO + CRO + dev retainer" },
    ],
  },
  // --- Shared extras (websites + apps) ---------------------------------------
  {
    id: "extras",
    kind: "multi",
    title: "Anything else to factor in?",
    subtitle: "Optional — pick any that apply.",
    visibleWhen: (a) => a.type !== "optimisation",
    options: [
      { value: "interactions", label: "Rich animation & interaction" },
      { value: "integrations", label: "CRM / marketing integrations" },
      { value: "migration", label: "Migrate existing content" },
      { value: "copywriting", label: "Copywriting help" },
      { value: "a11y", label: "Accessibility audit (WCAG)" },
    ],
  },
  {
    id: "discovery",
    kind: "single",
    title: "Do you want a discovery phase first?",
    subtitle: "Where we pin down strategy, structure and goals before building.",
    visibleWhen: (a) => a.type !== "optimisation",
    options: [
      { value: "none", label: "No — we know what we want" },
      { value: "focused", label: "A focused discovery", hint: "Workshop + strategy doc" },
      { value: "deep", label: "Full discovery & research", hint: "Research-led" },
    ],
  },
];

// --- Effort → cost -----------------------------------------------------------
type Line = { area: string; min: number; max: number };

// role-days → £, low uses min days, high uses max days
function cost(roleId: string, days: number): number {
  return rate(roleId) * days;
}

const PAGE_FACTOR: Record<string, number> = {
  small: 1,
  medium: 1.8,
  large: 3,
  xl: 4.5,
};

const APP_FACTOR: Record<string, number> = {
  mvp: 1,
  standard: 2.1,
  large: 3.4,
};

export type Estimate =
  | { kind: "range"; low: number; high: number; breakdown: Line[]; note?: string }
  | { kind: "recurring"; monthly: number; label: string; note?: string }
  | { kind: "enquiry"; note: string };

function pushRange(
  acc: Line[],
  area: string,
  alloc: { roleId: string; min: number; max: number }[]
) {
  const min = alloc.reduce((s, a) => s + cost(a.roleId, a.min), 0);
  const max = alloc.reduce((s, a) => s + cost(a.roleId, a.max), 0);
  const existing = acc.find((l) => l.area === area);
  if (existing) {
    existing.min += min;
    existing.max += max;
  } else {
    acc.push({ area, min, max });
  }
}

export function computeEstimate(a: Answers): Estimate | null {
  const type = a.type as string | undefined;
  if (!type) return null;

  // --- Optimisation: recurring monthly --------------------------------------
  if (type === "optimisation") {
    const intensity = a.optIntensity as string | undefined;
    if (!intensity) return null;
    const monthly = { light: 3000, standard: 5000, compound: 10000 }[intensity] ?? 0;
    const label = { light: "Light", standard: "Active programme", compound: "Shrink Compound" }[intensity] ?? "";
    return {
      kind: "recurring",
      monthly,
      label,
      note: "Monthly retainer — rolling, cancel with notice. Minimum 3-month initial term.",
    };
  }

  const lines: Line[] = [];

  // --- Web app --------------------------------------------------------------
  if (type === "web-app") {
    const size = (a.appSize as string) || "standard";
    if (!a.appSize) return null;
    const f = APP_FACTOR[size] ?? 2.1;
    const modules = (a.appModules as string[]) || [];

    pushRange(lines, "Discovery & UX", [
      { roleId: "founder", min: 2 * f, max: 3 * f },
      { roleId: "senior-designer", min: 3 * f, max: 5 * f },
    ]);
    pushRange(lines, "Product design", [
      { roleId: "senior-designer", min: 5 * f, max: 9 * f },
      { roleId: "mid-designer", min: 2 * f, max: 5 * f },
    ]);
    pushRange(lines, "Front-end build", [
      { roleId: "senior-dev", min: 6 * f, max: 12 * f },
      { roleId: "mid-dev", min: 5 * f, max: 12 * f },
    ]);
    pushRange(lines, "Backend & infrastructure", [
      { roleId: "senior-dev", min: 4 * f, max: 10 * f },
    ]);
    if (modules.includes("auth")) pushRange(lines, "Accounts & auth", [{ roleId: "senior-dev", min: 3, max: 6 }]);
    if (modules.includes("payments")) pushRange(lines, "Payments & billing", [{ roleId: "senior-dev", min: 4, max: 8 }]);
    if (modules.includes("dashboard")) pushRange(lines, "Dashboards & data", [{ roleId: "senior-dev", min: 4, max: 9 }, { roleId: "mid-dev", min: 2, max: 5 }]);
    if (modules.includes("integrations")) pushRange(lines, "Integrations", [{ roleId: "senior-dev", min: 3, max: 8 }]);
    if (modules.includes("admin")) pushRange(lines, "Admin tools", [{ roleId: "mid-dev", min: 3, max: 7 }]);
    pushRange(lines, "QA & project management", [
      { roleId: "senior-dev", min: 3 * f, max: 5 * f },
      { roleId: "pm", min: 5 * f, max: 9 * f },
      { roleId: "founder", min: 2, max: 3 },
    ]);

    addSharedExtras(lines, a);
    const totals = sumLines(lines);
    return {
      kind: "range",
      low: Math.max(roundTo(totals.low), 30000),
      high: roundTo(totals.high),
      breakdown: lines.map((l) => ({ ...l, min: roundTo(l.min), max: roundTo(l.max) })),
      note: "Products vary a lot — this is a starting range. We'll firm it up on a scoping call.",
    };
  }

  // --- Marketing site / redesign --------------------------------------------
  const pages = (a.pages as string) || "medium";
  const design = (a.design as string) || "full";
  const cms = (a.cms as string) || "no";
  if (!a.pages || !a.design || !a.cms) return null;
  const pf = PAGE_FACTOR[pages] ?? 1.8;

  // Design
  if (design === "full") {
    pushRange(lines, "Design", [
      { roleId: "senior-designer", min: 3, max: 5 }, // design system
      { roleId: "senior-designer", min: 2.5 * pf, max: 4.5 * pf }, // wireframes + UI
      { roleId: "mid-designer", min: 1 * pf, max: 2 * pf },
      { roleId: "senior-designer", min: 2, max: 4 }, // revisions
    ]);
  } else if (design === "partial") {
    pushRange(lines, "Design", [
      { roleId: "senior-designer", min: 1.5 * pf, max: 2.5 * pf },
      { roleId: "mid-designer", min: 1 * pf, max: 2 * pf },
    ]);
  }

  // Build (always, scales with pages)
  pushRange(lines, "Build", [
    { roleId: "senior-dev", min: 1, max: 2 }, // setup
    { roleId: "senior-dev", min: 3 * pf, max: 5 * pf }, // front-end
    { roleId: "mid-dev", min: 2 * pf, max: 4 * pf },
    { roleId: "senior-dev", min: 1.5, max: 3 }, // responsive
  ]);

  // CMS
  if (cms === "yes") {
    pushRange(lines, "CMS", [{ roleId: "senior-dev", min: 2.5 + pf, max: 4 + 1.5 * pf }]);
  }

  // Launch + PM (always)
  pushRange(lines, "QA, launch & project management", [
    { roleId: "senior-dev", min: 2, max: 3 },
    { roleId: "pm", min: 3 + pf, max: 5 + 1.5 * pf },
    { roleId: "founder", min: 1, max: 2 },
  ]);

  addDiscovery(lines, a);
  addSharedExtras(lines, a);

  const totals = sumLines(lines);
  return {
    kind: "range",
    low: Math.max(roundTo(totals.low), 12000),
    high: roundTo(totals.high),
    breakdown: lines.map((l) => ({ ...l, min: roundTo(l.min), max: roundTo(l.max) })),
  };
}

function addDiscovery(lines: Line[], a: Answers) {
  const d = a.discovery as string | undefined;
  if (d === "focused") {
    pushRange(lines, "Discovery", [
      { roleId: "founder", min: 3, max: 4 },
      { roleId: "senior-designer", min: 1.5, max: 2 },
      { roleId: "pm", min: 1.5, max: 2 },
    ]);
  } else if (d === "deep") {
    pushRange(lines, "Discovery", [
      { roleId: "founder", min: 8, max: 10 },
      { roleId: "senior-designer", min: 6, max: 8 },
      { roleId: "pm", min: 5, max: 6 },
    ]);
  }
}

function addSharedExtras(lines: Line[], a: Answers) {
  const extras = (a.extras as string[]) || [];
  if (extras.includes("interactions")) pushRange(lines, "Animation & interaction", [{ roleId: "senior-dev", min: 3, max: 6 }]);
  if (extras.includes("integrations")) pushRange(lines, "Integrations", [{ roleId: "senior-dev", min: 2, max: 6 }]);
  if (extras.includes("migration")) pushRange(lines, "Content migration", [{ roleId: "pm", min: 1, max: 2 }, { roleId: "mid-dev", min: 1, max: 4 }]);
  if (extras.includes("copywriting")) pushRange(lines, "Copywriting", [{ roleId: "founder", min: 2, max: 3 }, { roleId: "pm", min: 1, max: 4 }]);
  if (extras.includes("a11y")) pushRange(lines, "Accessibility audit", [{ roleId: "senior-dev", min: 2, max: 3 }]);
}

function sumLines(lines: Line[]) {
  return {
    low: lines.reduce((s, l) => s + l.min, 0),
    high: lines.reduce((s, l) => s + l.max, 0),
  };
}

function roundTo(n: number, step = 500): number {
  return Math.round(n / step) * step;
}

export const fmtGBP = (n: number): string => "£" + Math.round(n).toLocaleString("en-GB");

// Total number of questions visible for a given set of answers (for progress).
export function visibleQuestions(a: Answers): Question[] {
  return QUESTIONS.filter((q) => !q.visibleWhen || q.visibleWhen(a));
}
