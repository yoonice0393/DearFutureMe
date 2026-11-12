/**
 * Build-time render of the static pages (`npm run build` → scripts/prerender.mjs).
 * Their HTML is written into dist so the first paint doesn't wait for JavaScript.
 * The client then renders normally on top (no hydration). A file served for a
 * different URL (the SPA fallback) hides this markup; see src/theme-init.js.
 */
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouterProvider, createStaticHandler, createStaticRouter } from "react-router";

import { SiteLayout } from "./app/SiteLayout";
import { AuthProvider } from "./features/auth/AuthContext";
import { About } from "./pages/About";
import { Faq } from "./pages/Faq";
import { Home } from "./pages/Home";
import { Cookies } from "./pages/legal/Cookies";
import { Privacy } from "./pages/legal/Privacy";
import { Terms } from "./pages/legal/Terms";

/** path → [page, <title>]. Titles match what usePageTitle sets in the browser. */
export const PAGES: Record<string, [ComponentType, string]> = {
  "/": [Home, "DearFutureMe: a letter to your future self"],
  "/about": [About, "How it works · DearFutureMe"],
  "/faq": [Faq, "FAQ · DearFutureMe"],
  "/privacy": [Privacy, "Privacy Policy · DearFutureMe"],
  "/terms": [Terms, "Terms and Conditions · DearFutureMe"],
  "/cookies": [Cookies, "Cookie notice · DearFutureMe"],
};

export async function render(path: string): Promise<{ html: string; title: string }> {
  const [Page, title] = PAGES[path];
  const routes = [{ element: <SiteLayout />, children: [path === "/" ? { index: true, element: <Page /> } : { path: path.slice(1), element: <Page /> }] }];
  const handler = createStaticHandler(routes);
  const context = await handler.query(new Request(`http://prerender.local${path}`));
  if (context instanceof Response) throw new Error(`Prerender of ${path} redirected`);
  const router = createStaticRouter(handler.dataRoutes, context);
  const html = renderToString(
    <AuthProvider>
      <StaticRouterProvider router={router} context={context} hydrate={false} />
    </AuthProvider>,
  );
  return { html, title };
}
