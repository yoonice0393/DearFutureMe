import { CONTACT_EMAIL } from "@/config";
import { FaqList } from "@/components/FaqList";
import { PageHeader } from "@/components/PageHeader";
import { FAQ } from "@/data/faq";
import { usePageTitle } from "@/lib/usePageTitle";

export function Faq() {
  usePageTitle("FAQ");
  return (
    <>
      <PageHeader eyebrow="Help" title="Questions, answered">
        <p>
          Can't find what you need? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </PageHeader>
      <div className="mx-auto max-w-page px-4 md:px-8">
        <div className="max-w-[760px]">
          <FaqList items={FAQ} />
        </div>
      </div>
    </>
  );
}
