import { Link } from "react-router";

import { LegalPage } from "./LegalPage";

const ROWS = [
  {
    name: "Sign-in session",
    where: "Browser local storage (sb-… keys)",
    why: "Keeps you signed in after you use a sign-in link.",
    how: "Until you sign out, or about a week of inactivity.",
  },
  {
    name: "Draft letter",
    where: "Browser local storage (dfm-draft…)",
    why: "Keeps your draft safe if you close the tab. Only on your own device, never on booth devices.",
    how: "Until you send the letter or clear it.",
  },
  {
    name: "Theme",
    where: "Browser local storage (dfm-theme)",
    why: "Remembers light or night-writing mode.",
    how: "Until you clear site data.",
  },
  {
    name: "Booth device registration",
    where: "Browser local storage, booth devices only",
    why: "Proves the device was set up by event staff. Contains no attendee data.",
    how: "Until staff remove or revoke it.",
  },
  {
    name: "Bot check",
    where: "Cloudflare Turnstile",
    why: "Tells people from bots on forms. May set a strictly necessary security cookie.",
    how: "Short-lived, set by Cloudflare.",
  },
];

export function Cookies() {
  return (
    <LegalPage
      title="Cookie notice"
      summary={[
        "We don't use advertising, analytics or tracking cookies.",
        "We only store what the site needs to work: your sign-in, your draft and your theme.",
        "Because all of it is strictly necessary, we don't show a cookie banner.",
      ]}
    >
      <p>
        Here's everything DearFutureMe stores in your browser and why. Most of it uses your
        browser's local storage rather than cookies, but we list it all here the same way.
      </p>

      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <caption className="sr-only">Storage used by DearFutureMe</caption>
          <thead>
            <tr className="border-b-2 border-ink">
              <th scope="col" className="py-3 pr-4 font-semibold">What</th>
              <th scope="col" className="py-3 pr-4 font-semibold">Where</th>
              <th scope="col" className="py-3 pr-4 font-semibold">Why</th>
              <th scope="col" className="py-3 font-semibold">How long</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.name} className="border-b border-rule align-top">
                <th scope="row" className="py-3 pr-4 font-medium">{r.name}</th>
                <td className="py-3 pr-4 text-pencil">{r.where}</td>
                <td className="py-3 pr-4">{r.why}</td>
                <td className="py-3 text-pencil">{r.how}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Analytics</h2>
      <p>
        If we ever measure visits, we'll only use a cookieless, privacy-friendly tool such as
        Cloudflare Web Analytics, and we'll update this page and the{" "}
        <Link to="/privacy">Privacy Policy</Link> first.
      </p>

      <h2>Clearing it</h2>
      <p>
        You can clear all of this through your browser's “clear site data” setting. If you do,
        you'll be signed out and any unsaved draft on that device will be lost.
      </p>
    </LegalPage>
  );
}
