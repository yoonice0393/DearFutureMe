import { ButtonLink } from "@/components/Button";
import { usePageTitle } from "@/lib/usePageTitle";

/** Temporary stand-in for routes built in later phases. */
export function ComingSoon({ what }: { what: string }) {
  usePageTitle(what);
  return (
    <section className="mx-auto max-w-page px-4 py-14 md:px-8 md:py-24">
      <p className="eyebrow">In the post</p>
      <h1 className="mt-3 text-2xl">{what} is on its way.</h1>
      <p className="mt-6 max-w-prose text-pencil">This part of DearFutureMe is still being built.</p>
      <ButtonLink to="/" variant="secondary" className="mt-8">
        Back to the home page
      </ButtonLink>
    </section>
  );
}
