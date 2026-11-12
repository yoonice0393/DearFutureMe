import { useEffect } from "react";

import { SITE_NAME } from "@/config";

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME}: a letter to your future self`;
  }, [title]);
}
