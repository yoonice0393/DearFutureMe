import { Link } from "react-router";

import { ButtonLink } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { Postmark } from "@/components/Postmark";
import { usePageTitle } from "@/lib/usePageTitle";

export function About() {
  usePageTitle("How it works");
  return (
    <>
      <PageHeader eyebrow="About" title="A slow post office for one">
        <p>
          DearFutureMe holds on to a letter you write today and emails it back to you on a date you
          choose. That's all it does.
        </p>
      </PageHeader>

      <div className="mx-auto grid max-w-page gap-12 px-4 md:grid-cols-12 md:px-8">
        <div className="prose-letter md:col-span-7">
          <h2 className="!mt-0">How it works</h2>
          <p>
            <strong>Write.</strong> Open the editor and write freely, answer one guided question at a
            time, or start from a template such as Gratitude, Goals or Worries I hope are gone. On
            your own device, drafts save as you type.
          </p>
          <p>
            <strong>Choose a date.</strong> Pick six months, one, two, three, five or ten years, or a
            custom date from one month to 25 years away.
          </p>
          <p>
            <strong>Seal it.</strong> Enter your email, check it in large type, and agree to the
            terms. We seal the letter and send you a receipt right away with the delivery date and a
            link to cancel.
          </p>
          <p>
            <strong>Receive it.</strong> On the day, your letter arrives looking like a letter: your
            words, the date you wrote them, and a postmark line saying when it was written and
            delivered. Then you can write back to your next future self.
          </p>

          <h3>At events</h3>
          <p>
            You might find us at a booth with a tablet, or a QR code you scan with your own phone.
            You don't need an account. When you're done, the booth screen wipes itself so the next
            person can't see what you wrote.
          </p>

          <h2 id="protect">How we protect your letters</h2>
          <ul>
            <li>
              <strong>Encrypted before it's stored.</strong> Letters are encrypted with AES-256-GCM.
              The key is kept separately from the database.
            </li>
            <li>
              <strong>Nobody browses letters.</strong> Our admin tools only show dates, counts and
              delivery errors. Event staff see how many letters were written, never what's in them
              or who wrote them.
            </li>
            <li>
              <strong>Your account is walled off.</strong> The database itself makes sure an account
              can only reach its own letters.
            </li>
            <li>
              <strong>Nothing left behind at booths.</strong> Booth devices never save drafts. After
              you submit, or after 90 seconds of inactivity, the screen wipes everything, including
              the back button's history.
            </li>
            <li>
              <strong>You stay in control.</strong> Every email has a link to cancel the letter or
              stop all mail from us. If someone used your address, “This wasn't me” cancels the
              letter and blocks your address from future letters.
            </li>
            <li>
              <strong>No trackers, no ads.</strong> We don't use analytics cookies, and your email is
              only ever used to deliver your letter.
            </li>
          </ul>
          <p>
            <strong>To be honest about the limits:</strong> this isn't end-to-end encryption. To
            email you the letter, our sending service decrypts it at that moment, and email isn't
            private once it reaches your inbox. Details are in the{" "}
            <Link to="/privacy">Privacy Policy</Link>.
          </p>

          <div className="!mt-12">
            <ButtonLink to="/write">Write your letter</ButtonLink>
          </div>
        </div>

        <aside aria-hidden="true" className="hidden md:col-span-4 md:col-start-9 md:block">
          <div className="sticky top-8">
            <Postmark date="Delivered" waves={false} className="w-40 rotate-6" />
            <p className="mt-6 font-hand text-xl text-pencil">
              “Written on a Tuesday, opened on a Friday, two years later.”
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
