import { Modal } from "@/components/Modal";
import { Privacy } from "@/pages/legal/Privacy";
import { Terms } from "@/pages/legal/Terms";

export type LegalDoc = "terms" | "privacy";

/**
 * Terms / Privacy inside the app (booth and event modes). Kiosk rule:
 * nothing may navigate away, so links inside are inert.
 */
export function LegalModal({ doc, onClose }: { doc: LegalDoc | null; onClose: () => void }) {
  return (
    <Modal open={doc !== null} onClose={onClose} title={doc === "terms" ? "Terms and Conditions" : "Privacy Policy"} wide>
      <div
        className="[&_a]:text-ink [&_a]:no-underline [&_article>div]:px-0 [&_article>header]:hidden"
        onClickCapture={(e) => {
          if ((e.target as HTMLElement).closest("a")) e.preventDefault();
        }}
      >
        {doc === "terms" ? <Terms /> : doc === "privacy" ? <Privacy /> : null}
      </div>
    </Modal>
  );
}
