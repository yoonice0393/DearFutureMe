import type { ReactNode } from "react";

import { PageHeader } from "@/components/PageHeader";
import { POLICY_UPDATED_LABEL } from "@/config";
import { usePageTitle } from "@/lib/usePageTitle";

export function LegalPage({
  title,
  summary,
  children,
}: {
  title: string;
  summary: ReactNode[];
  children: ReactNode;
}) {
  usePageTitle(title);
  return (
    <article>
      <PageHeader eyebrow={`Last updated ${POLICY_UPDATED_LABEL}`} title={title} />
      <div className="mx-auto grid max-w-page gap-12 px-4 md:grid-cols-12 md:px-8">
        <div className="md:col-span-8">
          <aside
            aria-label="Summary"
            className="max-w-prose border-l-4 border-postal bg-paper-deep px-6 py-6"
          >
            <h2 className="text-lg">The short version</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              {summary.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </aside>
          <p className="mt-6 max-w-prose border border-dashed border-border px-4 py-3 text-xs text-pencil">
            <strong className="font-semibold text-ink">Template notice:</strong> this page is a
            plain-language template. A qualified lawyer should review it before public launch.
          </p>
          <div className="prose-letter mt-12">{children}</div>
        </div>
      </div>
    </article>
  );
}
