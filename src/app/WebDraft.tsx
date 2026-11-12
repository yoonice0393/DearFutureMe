import { Outlet } from "react-router";

import { DraftProvider } from "@/features/draft/DraftContext";
import { ServerDraftSync } from "@/features/draft/ServerDraftSync";

/**
 * Layout route for /write and /schedule: one draft, autosaved on this device
 * (and to the account when signed in). Lazy-loaded so the validation library
 * it brings in stays out of the home page's bundle.
 */
export function WebDraft() {
  return (
    <DraftProvider storageKey="dfm-draft">
      <ServerDraftSync />
      <Outlet />
    </DraftProvider>
  );
}
