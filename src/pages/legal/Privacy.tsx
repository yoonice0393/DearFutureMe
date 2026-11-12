import { Link } from "react-router";

import { CONTACT_EMAIL, DELETION_WINDOW_DAYS, DELIVERED_RETENTION_DAYS } from "@/config";
import { LegalPage } from "./LegalPage";

export function Privacy() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;
  return (
    <LegalPage
      title="Privacy Policy"
      summary={[
        "We collect your email address, your letter and the date you want it delivered, because we can't deliver a letter without them.",
        "Letters are encrypted before they're stored. Our admin tools never show letter text.",
        "No ads, no trackers, no selling or sharing your data, no marketing emails.",
        "You can export or delete everything at any time. Deleted data is gone from our systems within 30 days.",
        <>Questions or requests: {mail}</>,
      ]}
    >
      <p>
        This policy explains what DearFutureMe (“we”, “us”) collects when you use the website or an
        event booth, why we collect it, and what you can do about it. We follow the Philippine{" "}
        <strong>Data Privacy Act of 2012 (Republic Act No. 10173)</strong> and its implementing
        rules. We also give everyone the rights that the EU General Data Protection Regulation
        (GDPR) gives, wherever they live.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your email address.</strong> This is where your letter and receipt are sent. If
          you sign in, it's also your account login.
        </li>
        <li>
          <strong>Your letter.</strong> The subject, the text, and any optional tag you choose.
        </li>
        <li>
          <strong>Delivery details.</strong> The date you picked, when you wrote the letter, and
          whether it has been sent.
        </li>
        <li>
          <strong>Your consent.</strong> The date and time you agreed to these terms and which
          version you agreed to.
        </li>
        <li>
          <strong>Where you wrote it.</strong> If you wrote at an event, which event and which
          booth device were used, so staff can stop abuse from a specific device.
        </li>
        <li>
          <strong>Basic technical logs.</strong> Error messages, delivery status from our email
          provider, and short-lived security records used for rate limits. Logs never contain your
          letter text and never contain your full email address.
        </li>
      </ul>

      <h3>What we don't collect or do</h3>
      <ul>
        <li>We don't read your letters, and we don't sell, rent or share your data with advertisers.</li>
        <li>We don't use advertising, analytics or tracking cookies, and there are no third-party trackers on the site.</li>
        <li>We don't send newsletters or marketing. The only emails you get are your receipt, a sign-in or confirmation link if you ask for one, and the letter itself.</li>
      </ul>

      <h2>Why we collect it</h2>
      <p>
        Only to store your letter and deliver it on the date you chose, to let you manage it, and
        to keep the service safe from spam and abuse. We rely on your <strong>consent</strong>,
        which you give with the checkbox before scheduling, and on what's needed to provide the
        service you asked for.
      </p>

      <h2>How your letters are protected</h2>
      <ul>
        <li>
          <strong>Encryption at rest.</strong> Your letter is encrypted with AES-256-GCM before it
          is saved. The key is kept in a separate secret store, not in the database.
        </li>
        <li>
          <strong>When a letter is decrypted.</strong> Only when it's being emailed to you, or when
          you open it yourself while signed in (and only if you didn't seal it shut).
        </li>
        <li>
          <strong>Access control.</strong> Each account can only see its own letters, and this is
          enforced inside the database itself. Our admin tools show delivery counts and errors,
          never letter content.
        </li>
        <li>
          <strong>Event staff</strong> see how many letters were written at their booth. They never
          see letter content or email addresses.
        </li>
        <li>
          <strong>Honest limits.</strong> This is not end-to-end encryption. Our sending service
          has to decrypt the letter in order to email it, and email itself isn't private once it
          reaches your inbox provider.
        </li>
      </ul>

      <h2>Who processes data for us</h2>
      <p>We use a small number of service providers. Each one only gets what it needs:</p>
      <ul>
        <li>
          <strong>Supabase</strong> runs our database, sign-in and the server functions that
          encrypt and send letters. It stores your email address, encrypted letters and delivery
          details.
        </li>
        <li>
          <strong>Resend</strong>, with <strong>Brevo</strong> as a backup, sends our emails. Each
          email (with its recipient address and contents) passes through them at the moment it's
          sent.
        </li>
        <li>
          <strong>Cloudflare</strong> hosts the website and runs Turnstile, a privacy-friendly bot
          check. It processes your IP address and basic browser information to serve pages and tell
          people from bots.
        </li>
        <li>
          <strong>GitHub</strong> stores our encrypted weekly database backups. Letters in those
          backups are still encrypted.
        </li>
      </ul>
      <p>
        Some of these providers process data outside the Philippines. We choose providers that
        protect data under contracts and recognised safeguards.
      </p>

      <h2>How long we keep things</h2>
      <ul>
        <li><strong>Scheduled letters</strong> are kept until they're delivered, cancelled or deleted.</li>
        <li>
          <strong>Delivered letters</strong>, if you have an account, stay in your Opened archive
          until you delete them. Letters written without an account are deleted{" "}
          {DELIVERED_RETENTION_DAYS} days after delivery.
        </li>
        <li>
          <strong>Cancelled or deleted letters and deleted accounts</strong> are removed from the
          live database straight away and from backups within {DELETION_WINDOW_DAYS} days.
        </li>
        <li>
          <strong>Security and rate-limit records</strong> are deleted within 7 days. Delivery logs
          (without content) are kept for 12 months so we can investigate failed deliveries.
        </li>
        <li>
          If you used <strong>“This wasn't me”</strong> or unsubscribe, we keep a scrambled (hashed)
          copy of your address so we can keep honouring that request.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>Under the Data Privacy Act you have the right to:</p>
      <ul>
        <li><strong>be informed</strong> about how your data is used (this page);</li>
        <li><strong>access</strong> your data and get a copy of it;</li>
        <li><strong>object</strong> to processing and <strong>withdraw consent</strong> at any time;</li>
        <li><strong>correct</strong> inaccurate data, such as your email address;</li>
        <li><strong>erasure or blocking</strong> of your data;</li>
        <li><strong>data portability</strong>, a copy in a format you can take elsewhere;</li>
        <li><strong>damages</strong> if your data is misused; and</li>
        <li>
          <strong>file a complaint</strong> with the National Privacy Commission (privacy.gov.ph).
        </li>
      </ul>
      <p>
        If you're outside the Philippines, you also have the GDPR-style rights to restrict
        processing and to complain to your local data protection authority.
      </p>
      <p>
        <strong>How to use them:</strong> signed-in users can download all their data as a file
        and delete their account from Settings. Anyone can cancel a letter from the receipt email.
        For anything else, email {mail}. We reply within 15 days. We may ask you to confirm the
        request from the email address involved, to make sure it's really you.
      </p>
      <p>
        Withdrawing consent cancels any letters still waiting to be delivered, since we can't
        deliver them without your data.
      </p>

      <h2>Age</h2>
      <p>
        DearFutureMe is for people aged <strong>13 and older</strong>. If you're under 18, or under
        the age of digital consent where you live, please ask a parent or guardian before you use
        it. If you think a younger child has used the service, email us and we'll delete their
        data.
      </p>

      <h2>Cookies and storage</h2>
      <p>
        We only use storage the site needs to work: staying signed in, keeping a draft safe on your
        own device, and remembering light or dark mode. See the <Link to="/cookies">Cookie notice</Link>.
        On shared booth devices, nothing you write is stored on the device.
      </p>

      <h2>Security incidents</h2>
      <p>
        If you think your data or a letter has been exposed, or you've found a security problem,
        email {mail} with “Security” in the subject. If a breach puts your data at real risk, we'll
        notify the National Privacy Commission and the people affected within 72 hours of finding
        out, as the law requires.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we change this policy in a way that matters, we'll update the date at the top and ask
        for your consent again before your next letter is scheduled. Letters already scheduled stay
        covered by the version you agreed to, unless the law requires otherwise.
      </p>

      <h2>Contact</h2>
      <p>Data protection contact for DearFutureMe: {mail}</p>
    </LegalPage>
  );
}
