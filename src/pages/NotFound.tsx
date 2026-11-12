import { ButtonLink } from "@/components/Button";
import { Postmark } from "@/components/Postmark";
import { usePageTitle } from "@/lib/usePageTitle";

export function NotFound() {
  usePageTitle("Page not found");
  return (
    <section className="mx-auto grid max-w-page gap-8 px-4 py-14 md:grid-cols-12 md:px-8 md:py-24">
      <div className="md:col-span-7">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-3 text-2xl md:text-3xl">Return to sender</h1>
        <p className="mt-6 max-w-prose text-lg text-pencil">
          We couldn't find anything at this address. The link may be old, or there may be a typo
          in it.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <ButtonLink to="/">Back to the home page</ButtonLink>
          <ButtonLink to="/write" variant="secondary">
            Write a letter
          </ButtonLink>
        </div>
      </div>
      <div aria-hidden="true" className="hidden md:col-span-4 md:col-start-9 md:block">
        <Postmark date="Not found" place="ADDRESS UNKNOWN · RETURN" waves={false} className="w-48 -rotate-12" />
      </div>
    </section>
  );
}
