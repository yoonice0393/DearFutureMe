import { Link } from "react-router";

import { CONTACT_EMAIL, MAX_LETTERS_PER_EMAIL } from "@/config";
import { LegalPage } from "./LegalPage";

export function Terms() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage
      title="Terms and Conditions"
      summary={[
        "We store your letter and email it to you on the date you choose.",
        "Delivery is best-effort. Years is a long time for email, so keep your own copy of anything important.",
        "Only send letters to an email address that's yours. No harassment, spam or illegal content.",
        "Your letter belongs to you. We only use it to store and deliver it.",
        "These terms follow the laws of the Philippines.",
      ]}
    >
      <p>
        These terms apply when you use DearFutureMe on the website, at an event booth or on your
        own phone at an event. By ticking “I agree” before scheduling a letter, you accept these
        terms and our <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>1. What the service does</h2>
      <p>
        You write a letter, choose a delivery date between one month and 25 years from now, and give
        us an email address. We store the letter encrypted and email it to that address on, or close
        to, that date. You can cancel a letter before it's delivered.
      </p>

      <h2>2. Delivery is best-effort</h2>
      <p>
        We work hard to deliver every letter, but we can't promise it. Over months or years, email
        addresses close, inboxes fill up, spam filters change, and service providers (including us)
        can change or stop. Very busy days can also delay a letter by a day or two.{" "}
        <strong>
          Don't rely on DearFutureMe as the only copy of anything you can't afford to lose.
        </strong>{" "}
        The service is free and provided “as is”.
      </p>

      <h2>3. Your email address</h2>
      <p>
        You must only use an email address that belongs to you or that you're allowed to use. At
        booths and events we don't ask you to confirm your address first. Instead, we send an
        immediate receipt that lets the real owner cancel the letter. Using someone else's address
        is a breach of these terms. Each address can have at most {MAX_LETTERS_PER_EMAIL} letters
        waiting at once.
      </p>

      <h2>4. Acceptable use</h2>
      <p>Don't use DearFutureMe to:</p>
      <ul>
        <li>harass, threaten, impersonate or frighten anyone;</li>
        <li>send letters to people who didn't ask for them, or send spam;</li>
        <li>store or send anything illegal, including content that sexually exploits minors;</li>
        <li>try to get around our limits, break our security or overload the service; or</li>
        <li>use automated tools to submit letters.</li>
      </ul>
      <p>
        We can cancel letters, block addresses or devices, and close accounts that break these
        rules. Where the law requires it, we'll report illegal content to the authorities.
      </p>

      <h2>5. Your content</h2>
      <p>
        You own what you write. You give us a limited licence to store, encrypt, copy (for backups)
        and deliver your letter, only so we can provide the service. This licence ends when the
        letter is deleted. We don't publish letters. If an optional public letters wall is added in
        the future, it will only show letters you choose to share, and only after they're
        delivered.
      </p>

      <h2>6. Accounts</h2>
      <p>
        Signing in is optional. You can delete your account in Settings at any time, which
        permanently deletes your letters, including ones still waiting. We may close an account that
        breaks these terms. If we do, we'll tell you why, unless the law stops us.
      </p>

      <h2>7. If the service shuts down</h2>
      <p>
        If DearFutureMe ever has to close, we'll give at least 60 days' notice by email when we can.
        We'll also try to deliver scheduled letters early or let you download them, and then
        securely delete all remaining data.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, DearFutureMe isn't liable for letters that are late,
        lost, undelivered or delivered to a wrong address you entered, or for indirect or
        consequential losses. Nothing in these terms limits liability that can't be limited by law,
        including your rights under the Data Privacy Act of 2012 and the Consumer Act of the
        Philippines.
      </p>

      <h2>9. Changes to these terms</h2>
      <p>
        If we change these terms, we'll update the date at the top. If the change matters, we'll ask
        you to agree again before your next letter. Letters already scheduled are delivered under
        the terms you agreed to.
      </p>

      <h2>10. Governing law</h2>
      <p>
        These terms are governed by the laws of the Republic of the Philippines. Any dispute will be
        handled by the proper courts of the Philippines. If you live elsewhere, you keep the
        protections your local consumer laws give you.
      </p>

      <h2>11. Contact</h2>
      <p>Questions about these terms: {mail}</p>
    </LegalPage>
  );
}
