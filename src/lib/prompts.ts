import promptData from "@/data/prompts.json";
import templateData from "@/data/templates.json";

export type Theme = { id: string; label: string };
export type Question = { id: string; theme: string; text: string };
export type Template = { id: string; title: string; blurb: string; body: string };

export const THEMES: Theme[] = promptData.themes;
export const QUESTIONS: Question[] = promptData.questions;
export const TEMPLATES: Template[] = templateData;

export function questionsFor(theme: string | "mixed"): Question[] {
  return theme === "mixed" ? QUESTIONS : QUESTIONS.filter((q) => q.theme === theme);
}

/** Deterministic-enough shuffle for rotating suggestions. */
export function shuffled<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A guided session: up to `count` questions, one per theme where possible. */
export function guidedSet(theme: string | "mixed", count = 6): Question[] {
  if (theme !== "mixed") return shuffled(questionsFor(theme)).slice(0, count);
  const byTheme = THEMES.map((t) => shuffled(questionsFor(t.id))[0]).filter(Boolean);
  return shuffled(byTheme).slice(0, count);
}

/** Turn guided answers into a letter body. Unanswered questions are dropped. */
export function composeFromAnswers(answers: { question: string; answer: string }[]): string {
  const parts = answers
    .filter((a) => a.answer.trim())
    .map((a) => `${a.question}\n${a.answer.trim()}`);
  return ["Dear future me,", ...parts, "— me"].join("\n\n");
}
