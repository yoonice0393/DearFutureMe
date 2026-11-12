import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

// "soft" carries the wght + SOFT axes we use (62 KB vs 121 KB for "full").
import "@fontsource-variable/fraunces/soft.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "./styles/index.css";

import { router } from "./app/router";
import { AuthProvider } from "./features/auth/AuthContext";
import { probablySignedIn } from "./lib/supabase";

const app = (
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);

async function boot() {
  const root = document.getElementById("root")!;
  const prerendered = root.querySelector<HTMLElement>(":scope > [data-prerender]");
  // Hydrate when this URL's HTML was prerendered (static pages) and the first
  // client render will match it: the prerender is of a signed-out visitor.
  const matches = prerendered && !document.documentElement.classList.contains("not-prerendered") && !probablySignedIn();

  if (prerendered && matches) {
    // Lazy pages (about, legal…) must have their code loaded before hydrating.
    if (!router.state.initialized) {
      await new Promise<void>((resolve) => {
        const stop = router.subscribe((s) => {
          if (s.initialized) {
            stop();
            resolve();
          }
        });
      });
    }
    hydrateRoot(prerendered, app);
    return;
  }
  prerendered?.remove();
  createRoot(root).render(app);
}

boot();
