import { Outlet, createBrowserRouter } from "react-router";

import { SiteLayout } from "./SiteLayout";
import { DraftProvider } from "@/features/draft/DraftContext";
import { Home } from "@/pages/Home";
import { About } from "@/pages/About";
import { Faq } from "@/pages/Faq";
import { Write } from "@/pages/Write";
import { Schedule } from "@/pages/Schedule";
import { Privacy } from "@/pages/legal/Privacy";
import { Terms } from "@/pages/legal/Terms";
import { Cookies } from "@/pages/legal/Cookies";
import { NotFound } from "@/pages/NotFound";
import { ComingSoon } from "@/pages/ComingSoon";
import { Booth } from "@/pages/booth/Booth";
import { EventPage } from "@/pages/booth/EventPage";

/** /write and /schedule share one draft, autosaved on this device. */
function WebDraft() {
  return (
    <DraftProvider storageKey="dfm-draft">
      <Outlet />
    </DraftProvider>
  );
}

export const router = createBrowserRouter([
  // Kiosk and event flows: their own minimal layouts, no links out.
  { path: "booth", element: <Booth /> },
  { path: "e/:eventCode", element: <EventPage /> },
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "faq", element: <Faq /> },
      { path: "privacy", element: <Privacy /> },
      { path: "terms", element: <Terms /> },
      { path: "cookies", element: <Cookies /> },
      {
        element: <WebDraft />,
        children: [
          { path: "write", element: <Write /> },
          { path: "schedule", element: <Schedule /> },
        ],
      },
      // Built in later phases.
      { path: "signin", element: <ComingSoon what="Sign-in" /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
