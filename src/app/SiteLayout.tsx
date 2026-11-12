import { Link, NavLink, Outlet, ScrollRestoration } from "react-router";

import { CONTACT_EMAIL, SITE_NAME } from "@/config";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Wordmark } from "@/components/Wordmark";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-12 items-center px-1 sm:px-2 text-sm whitespace-nowrap no-underline ${
    isActive ? "text-ink font-medium" : "text-pencil hover:text-ink"
  }`;

export function SiteLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-page items-center justify-between gap-4 px-4 py-2 md:px-8">
          <Link to="/" className="no-underline" aria-label={`${SITE_NAME}, home`}>
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="flex items-center sm:gap-1 md:gap-4">
            <NavLink to="/about" className={(s) => `${navClass(s)} hidden sm:inline-flex`}>
              How it works
            </NavLink>
            <NavLink to="/faq" className={(s) => `${navClass(s)} hidden sm:inline-flex`}>
              FAQ
            </NavLink>
            <NavLink to="/signin" className={navClass}>
              Sign in
            </NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-16 border-t border-rule bg-paper-deep">
        <div className="mx-auto grid max-w-page gap-8 px-4 py-12 md:grid-cols-12 md:px-8">
          <div className="md:col-span-5">
            <Wordmark />
            <p className="mt-3 max-w-prose text-sm text-pencil">
              Letters are encrypted and only ever sent to the address you give us. No ads, no
              trackers, no reading your mail.
            </p>
          </div>
          <nav aria-label="Legal and help" className="md:col-span-4">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <li><Link to="/about">How it works</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms</Link></li>
              <li><Link to="/cookies">Cookie notice</Link></li>
            </ul>
          </nav>
          <div className="text-sm md:col-span-3">
            <p className="text-pencil">Questions or data requests</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="[overflow-wrap:anywhere]">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  );
}
