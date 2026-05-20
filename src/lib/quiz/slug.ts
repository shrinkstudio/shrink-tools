import type { Answers } from "./schema";

export function slugifyCompany(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "anon";
}

function toBase64Url(s: string): string {
  if (typeof window === "undefined") {
    return Buffer.from(s, "utf8")
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  if (typeof window === "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }
  return decodeURIComponent(escape(atob(padded)));
}

export function encodeAnswers(answers: Answers): string {
  return toBase64Url(JSON.stringify(answers));
}

export function decodeAnswers(encoded: string): Answers | null {
  try {
    const json = fromBase64Url(encoded);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object") return parsed as Answers;
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(origin: string, companySlug: string, answers: Answers): string {
  const slug = slugifyCompany(companySlug);
  const data = encodeAnswers(answers);
  return `${origin}/quiz/r/${slug}?d=${data}`;
}
