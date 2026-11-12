import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router";

import { ButtonLink } from "@/components/Button";
import { Envelope } from "@/components/Envelope";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";
import { claimLetters } from "@/lib/api";
import { longDate } from "@/lib/dates";
import { getSupabase } from "@/lib/supabase";
import { usePageTitle } from "@/lib/usePageTitle";

type Row = { id: string; status: string; deliver_at: string | null; created_at: string; delivered_at: string | null; updated_at: string };

const WAITING = ["sealed", "sending", "pending_verification", "failed"];

export function Dashboard() {
  usePageTitle("Your letters");
  const { session, email, loading } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [claimed, setClaimed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const claimedOnce = useRef(false);

  const load = useCallback(async () => {
    const supabase = await getSupabase();
    if (!supabase) return;
    const { data, error: err } = await supabase
      .from("letters")
      .select("id, status, deliver_at, created_at, delivered_at, updated_at")
      .order("deliver_at", { ascending: true, nullsFirst: false });
    if (err) setError("We couldn't load your letters. Please refresh.");
    else setRows(data as Row[]);
  }, []);

  useEffect(() => {
    if (!session) return;
    (async () => {
      // Letters written at a booth to this address join the account on first visit.
      if (!claimedOnce.current) {
        claimedOnce.current = true;
        const r = await claimLetters();
        if (r.ok && r.claimed) setClaimed(r.claimed);
      }
      await load();
    })();
  }, [session, load]);

  if (loading) return <p className="mx-auto max-w-page px-4 py-24 text-pencil md:px-8">Loading…</p>;
  if (!session) return <Navigate to="/signin" replace />;

  const waiting = rows?.filter((r) => WAITING.includes(r.status)) ?? [];
  const drafts = rows?.filter((r) => r.status === "draft").sort((a, b) => b.updated_at.localeCompare(a.updated_at)) ?? [];
  const opened =
    rows?.filter((r) => r.status === "delivered").sort((a, b) => (b.delivered_at ?? "").localeCompare(a.delivered_at ?? "")) ?? [];

  return (
    <>
      <PageHeader eyebrow={email ?? undefined} title="Your letters">
        <p>Sealed letters wait here until their day. Opened ones stay in your archive until you delete them.</p>
      </PageHeader>

      <div className="mx-auto max-w-page space-y-16 px-4 md:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <ButtonLink to="/write">Write a new letter</ButtonLink>
          <Link to="/settings" className="inline-flex min-h-12 items-center text-sm">Account settings</Link>
        </div>

        {claimed > 0 && (
          <p role="status" className="border-l-4 border-stamp bg-paper-deep px-6 py-4">
            We found {claimed} {claimed === 1 ? "letter" : "letters"} you wrote at an event and added {claimed === 1 ? "it" : "them"} here.
          </p>
        )}
        {error && <p role="alert" className="font-medium text-postal">{error}</p>}
        {!rows && !error && <p className="text-pencil">Loading your letters…</p>}

        {rows && (
          <>
            <section aria-labelledby="waiting">
              <h2 id="waiting" className="text-xl md:text-2xl">
                Sealed <span className="font-sans text-base text-pencil">({waiting.length})</span>
              </h2>
              {waiting.length ? (
                <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {waiting.map((r) => (
                    <li key={r.id}>
                      <Envelope id={r.id} status={r.status} writtenAt={r.created_at} deliverAt={r.deliver_at} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 max-w-prose text-pencil">
                  Nothing in the post yet. <Link to="/write">Write your first letter</Link>.
                </p>
              )}
            </section>

            {drafts.length > 0 && (
              <section aria-labelledby="drafts">
                <h2 id="drafts" className="text-xl md:text-2xl">
                  Drafts <span className="font-sans text-base text-pencil">({drafts.length})</span>
                </h2>
                <ul className="mt-6 max-w-[720px] divide-y divide-rule border-y border-rule">
                  {drafts.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <span>Draft, last saved {longDate(new Date(r.updated_at))}</span>
                      <span className="flex gap-4 text-sm">
                        <Link to={`/write?draft=${r.id}`} className="inline-flex min-h-12 items-center">Continue writing</Link>
                        <Link to={`/letter/${r.id}`} className="inline-flex min-h-12 items-center text-pencil">Details</Link>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="opened">
              <h2 id="opened" className="text-xl md:text-2xl">
                Opened <span className="font-sans text-base text-pencil">({opened.length})</span>
              </h2>
              {opened.length ? (
                <ul className="mt-6 grid max-w-[960px] gap-4 sm:grid-cols-2">
                  {opened.map((r) => (
                    <li key={r.id}>
                      <Link
                        to={`/letter/${r.id}`}
                        className="sheet block px-6 py-6 text-ink no-underline transition-transform hover:-translate-y-0.5"
                      >
                        <p className="eyebrow">Opened {r.delivered_at ? longDate(new Date(r.delivered_at)) : ""}</p>
                        <p className="mt-2 font-serif text-lg">A letter from {longDate(new Date(r.created_at))}</p>
                        <p className="mt-3 text-sm text-postal underline underline-offset-4">Read it again</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 max-w-prose text-pencil">Delivered letters land here, so you can reread them and write back.</p>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
