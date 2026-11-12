import { Link } from "react-router";

import { ButtonLink } from "@/components/Button";
import { FaqList } from "@/components/FaqList";
import { Postmark } from "@/components/Postmark";
import { Stamp } from "@/components/Stamp";
import { FAQ } from "@/data/faq";
import { usePageTitle } from "@/lib/usePageTitle";

const STEPS = [
  {
    title: "Write it down.",
    body: "Write whatever you'd want to hear a year from now. If you get stuck, use a guided question or a starter prompt: what a normal Tuesday looks like, who you talk to most, the goal you're scared to say out loud.",
  },
  {
    title: "Choose when it arrives.",
    body: "Six months, a year, ten years, or any date up to 25 years away. Then give us the address it should go to. We'll show it back to you in large type so you can check for typos.",
  },
  {
    title: "Forget about it.",
    body: "We seal the letter and email you a receipt. On the day, it arrives in your inbox with your own words, the date you wrote them and a postmark. Then you can write back to the next version of you.",
  },
];

export function Home() {
  usePageTitle();
  return (
    <>
      {/* Hero: copy on the left, a letter on the right. */}
      <section className="mx-auto grid max-w-page gap-12 px-4 pb-14 pt-10 md:grid-cols-12 md:gap-8 md:px-8 md:pb-24 md:pt-16">
        <div className="md:col-span-6 md:pt-8">
          <p className="eyebrow">Post that takes its time</p>
          <h1 className="mt-4 text-2xl md:text-3xl">
            Write to the person you’ll be next year.
          </h1>
          <p className="mt-6 max-w-prose text-lg text-pencil">
            Write a letter today and we’ll seal it and email it back to you in six months, a year or
            ten. It arrives sounding exactly like you did today.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink to="/write">Write your letter</ButtonLink>
            <Link to="/about" className="inline-flex min-h-12 items-center text-sm">
              How it works
            </Link>
          </div>
          <p className="mt-6 text-xs text-pencil">
            Free. No password. Your letter is encrypted until it’s sent.
          </p>
        </div>

        <figure className="relative md:col-span-6 md:col-start-7">
          <div className="letter-sheet relative -rotate-1 px-6 pb-24 pt-12 md:pb-16 font-serif text-base text-ink md:px-10">
            <p className="pr-12 text-sm text-pencil md:pr-16">Quezon City, 12 November 2026</p>
            <p className="mt-6">Dear me,</p>
            <p className="mt-[1.65em]">
              Right now a normal Tuesday is the 6:40 jeep, cold coffee and the group chat arguing
              about where to eat. I’m worried about the board exam. I hope by the time you read this
              you’ve forgotten what that felt like, and that you still call Lola on Sundays.
            </p>
            <p className="mt-[1.65em]">Be gentler with yourself than I am being today.</p>
            <p className="mt-6 font-hand text-xl text-ink">— me, at 22</p>
          </div>
          <Stamp label="1 YEAR" className="absolute -top-4 right-3 w-12 rotate-3 md:right-8 md:w-20" />
          <Postmark
            date="12 Nov 2026"
            className="absolute -bottom-16 right-0 w-40 -rotate-6 opacity-90 md:-right-6 md:w-48"
          />
          <figcaption className="sr-only">An example letter from someone to their future self.</figcaption>
        </figure>
      </section>

      {/* How it works: a written sequence, not icon cards. */}
      <section aria-labelledby="how" className="border-t border-rule">
        <div className="mx-auto grid max-w-page gap-8 px-4 py-14 md:grid-cols-12 md:px-8 md:py-24">
          <div className="md:col-span-4">
            <h2 id="how" className="text-xl md:text-2xl">
              How it works
            </h2>
            <p className="mt-4 text-pencil">It takes about three minutes.</p>
          </div>
          <ol className="space-y-12 md:col-span-7 md:col-start-6">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-6">
                <span
                  aria-hidden="true"
                  className="font-serif text-2xl leading-none text-postal md:text-3xl"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg">{step.title}</h3>
                  <p className="mt-2 max-w-prose text-pencil">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust. */}
      <section aria-labelledby="protect" className="bg-paper-deep">
        <div className="mx-auto grid max-w-page gap-8 px-4 py-14 md:grid-cols-12 md:px-8 md:py-24">
          <div className="md:col-span-5">
            <h2 id="protect" className="text-xl md:text-2xl">
              Your letter, kept like a letter
            </h2>
          </div>
          <div className="prose-letter md:col-span-7">
            <p>
              Letters are encrypted before they’re stored. Our admin tools show delivery dates and
              counts, never letter text. We only use your email address to deliver your letter, and
              we never sell it, share it or send you marketing.
            </p>
            <p>
              Every email we send has a one-click link to cancel the letter or stop all mail from
              us.{" "}
              <Link to="/about#protect">How we protect your letters</Link>
            </p>
          </div>
        </div>
      </section>

      {/* FAQ excerpt. */}
      <section aria-labelledby="faq" className="mx-auto grid max-w-page gap-8 px-4 py-14 md:grid-cols-12 md:px-8 md:py-24">
        <div className="md:col-span-4">
          <h2 id="faq" className="text-xl md:text-2xl">
            Questions
          </h2>
          <p className="mt-4">
            <Link to="/faq">All questions</Link>
          </p>
        </div>
        <div className="md:col-span-7 md:col-start-6">
          <FaqList items={FAQ.filter((f) => f.home)} />
        </div>
      </section>

      {/* Closing. */}
      <section className="mx-auto max-w-page px-4 md:px-8">
        <div className="flex flex-col gap-6 border-t-2 border-dashed border-rule pt-12 md:flex-row md:items-end md:justify-between">
          <p className="max-w-prose font-serif text-xl md:text-2xl">
            The sooner you write it, the stranger it’ll be to read.
          </p>
          <ButtonLink to="/write" className="self-start md:self-auto">
            Write your letter
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
