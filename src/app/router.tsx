import { createBrowserRouter } from "react-router";

import { SiteLayout } from "./SiteLayout";
import { Home } from "@/pages/Home";
import { About } from "@/pages/About";
import { Faq } from "@/pages/Faq";
import { Privacy } from "@/pages/legal/Privacy";
import { Terms } from "@/pages/legal/Terms";
import { Cookies } from "@/pages/legal/Cookies";
import { NotFound } from "@/pages/NotFound";
import { ComingSoon } from "@/pages/ComingSoon";

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: "about", element: <About /> },
      { path: "faq", element: <Faq /> },
      { path: "privacy", element: <Privacy /> },
      { path: "terms", element: <Terms /> },
      { path: "cookies", element: <Cookies /> },
      // Built in later phases.
      { path: "write", element: <ComingSoon what="The letter editor" /> },
      { path: "signin", element: <ComingSoon what="Sign-in" /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
