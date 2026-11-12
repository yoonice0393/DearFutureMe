import { createBrowserRouter } from "react-router";

import { SiteLayout } from "./SiteLayout";
import { Home } from "@/pages/Home";
import { NotFound } from "@/pages/NotFound";

/**
 * Every page except the home page loads on demand, so the first visit only
 * downloads what it shows. `named` turns `export function X` into a route module.
 */
const named = <K extends string>(load: () => Promise<Record<K, React.ComponentType>>, name: K) => async () => ({
  Component: (await load())[name],
});

export const router = createBrowserRouter([
  // Kiosk and event flows: their own minimal layouts, no links out.
  { path: "booth", lazy: named(() => import("@/pages/booth/Booth"), "Booth") },
  { path: "booth/setup", lazy: named(() => import("@/pages/booth/BoothSetup"), "BoothSetup") },
  { path: "booth/qr", lazy: named(() => import("@/pages/booth/BoothQr"), "BoothQr") },
  { path: "e/:eventCode", lazy: named(() => import("@/pages/booth/EventPage"), "EventPage") },
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", lazy: named(() => import("@/pages/About"), "About") },
      { path: "faq", lazy: named(() => import("@/pages/Faq"), "Faq") },
      { path: "privacy", lazy: named(() => import("@/pages/legal/Privacy"), "Privacy") },
      { path: "terms", lazy: named(() => import("@/pages/legal/Terms"), "Terms") },
      { path: "cookies", lazy: named(() => import("@/pages/legal/Cookies"), "Cookies") },
      {
        lazy: named(() => import("./WebDraft"), "WebDraft"),
        children: [
          { path: "write", lazy: named(() => import("@/pages/Write"), "Write") },
          { path: "schedule", lazy: named(() => import("@/pages/Schedule"), "Schedule") },
        ],
      },
      { path: "signin", lazy: named(() => import("@/pages/SignIn"), "SignIn") },
      { path: "dashboard", lazy: named(() => import("@/pages/Dashboard"), "Dashboard") },
      { path: "verify", lazy: named(() => import("@/pages/Verify"), "Verify") },
      { path: "manage/:token", lazy: named(() => import("@/pages/Manage"), "Manage") },
      { path: "letter/:id", lazy: named(() => import("@/pages/LetterPage"), "LetterPage") },
      { path: "settings", lazy: named(() => import("@/pages/Settings"), "Settings") },
      { path: "admin", lazy: named(() => import("@/pages/Admin"), "Admin") },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
