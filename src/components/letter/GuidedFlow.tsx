import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { THEMES, composeFromAnswers, guidedSet, type Question } from "@/lib/prompts";

/**
 * One question at a time. When finished, hands back a letter body built
 * from the answers (unanswered questions are left out).
 */
export function GuidedFlow({
  onDone,
  large = false,
}: {
  onDone: (body: string) => void;
  large?: boolean;
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [i, questions]);

  if (!questions) {
    return (
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl focus:outline-none">
          What would you like to write about?
        </h2>
        <p className="mt-2 text-pencil">We'll ask six short questions, one at a time. Skip any you like.</p>
        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {[{ id: "mixed", label: "A bit of everything" }, ...THEMES].map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  const set = guidedSet(t.id);
                  setQuestions(set);
                  setAnswers(set.map(() => ""));
                  setI(0);
                }}
                className={`flex w-full items-center justify-between rounded-sm border border-border bg-sheet px-4 text-left font-serif text-ink hover:border-ink ${
                  large ? "min-h-14 text-lg" : "min-h-12 text-base"
                }`}
              >
                {t.label}
                <span aria-hidden="true" className="text-postal">→</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const q = questions[i];
  const last = i === questions.length - 1;
  const finish = () =>
    onDone(composeFromAnswers(questions.map((qq, k) => ({ question: qq.text, answer: answers[k] }))));

  return (
    <div>
      <p className="eyebrow">
        Question {i + 1} of {questions.length}
      </p>
      <div
        className="mt-3 h-1 w-full bg-rule"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={questions.length}
        aria-valuenow={i + 1}
        aria-label="Progress"
      >
        <div className="h-1 bg-postal transition-all" style={{ width: `${((i + 1) / questions.length) * 100}%` }} />
      </div>

      <h2 ref={headingRef} tabIndex={-1} className={`mt-8 focus:outline-none ${large ? "text-2xl" : "text-xl"}`}>
        <label htmlFor={`guided-${q.id}`}>{q.text}</label>
      </h2>
      <div className="sheet mt-6 px-6 py-4 focus-within:shadow-[0_0_0_2px_rgb(var(--c-postal)/0.55)]">
        <textarea
          id={`guided-${q.id}`}
          value={answers[i]}
          onChange={(e) => setAnswers((a) => a.map((v, k) => (k === i ? e.target.value : v)))}
          rows={large ? 6 : 5}
          maxLength={3000}
          className={`ruled block w-full resize-y border-0 bg-transparent p-0 font-serif text-ink focus:outline-none ${
            large ? "text-lg" : "text-base"
          }`}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={() => (last ? finish() : setI(i + 1))}>
          {last ? "Finish and review my letter" : answers[i].trim() ? "Next question" : "Skip this one"}
        </Button>
        {i > 0 && (
          <Button variant="secondary" onClick={() => setI(i - 1)}>
            Back
          </Button>
        )}
        {!last && (
          <Button variant="quiet" onClick={finish}>
            I'm done, show my letter
          </Button>
        )}
      </div>
    </div>
  );
}
