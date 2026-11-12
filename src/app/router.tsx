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
import { SignIn } from "@/pages/SignIn";
import { Dashboard } from "@/pages/Dashboard";
import { Verify } from "@/pages/Verify";
import { Manage } from "@/pages/Manage";
import { BoothSetup } from "@/pages/booth/BoothSetup";
import { BoothQr } from "@/pages/booth/BoothQr";
import { ServerDraftSync } from "@/features/draft/ServerDraftSync";
import { Booth } from "@/pages/booth/Booth";
import { EventPage } from "@/pages/booth/EventPage";

/** /write and /schedule share one draft, autosaved on this device. */
function WebDraft() {
  return (
    <DraftProvider storageKey="dfm-draft">
      <ServerDraftSync />
      <Outlet />
    </DraftProvider>
  );
}

export const router = createBrowserRouter([
  // Kiosk and event flows: their own minimal layouts, no links out.
  { path: "booth", element: <Booth /> },
  { path: "booth/setup", element: <BoothSetup /> },
  { path: "booth/qr", element: <BoothQr /> },
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
      { path: "signin", element: <SignIn /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "verify", element: <Verify /> },
      { path: "manage/:token", element: <Manage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
