import { useEffect, useState } from "react";
import { Navigate } from "react-router";

import { Button, ButtonLink } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/features/auth/AuthContext";
import { longDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { usePageTitle } from "@/lib/usePageTitle";

type Row = { id: string; status: string; deliver_at: string | null; created_at: string; source: string };

/**
 * Phase 4: a plain list that proves sign-in + RLS end to end.
 * Phase 6 turns this into envelopes with postmarks and countdowns.
 */
export function Dashboard() {
  usePageTitle("Your letters");
  const { session, email, loading, signOut } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !supabase) return;
    supabase
      .from("letters")
      .select("id, status, deliver_at, created_at, source")
      .order("deliver_at", { ascending: true, nullsFirst: false })
      .then(({ data, error: err }) => {
        if (err) setError("We couldn't load your letters. Please refresh.");
        else setRows(data as Row[]);
      });
  }, [session]);

  if (loading) return <p className="mx-auto max-w-page px-4 py-24 text-pencil md:px-8">Loading…</p>;
  if (!session) return <Navigate to="/signin" replace />;

  const groups: [string, (r: Row) => boolean][] = [
    ["Sealed", (r) => ["sealed", "sending", "pending_verification", "failed"].includes(r.status)],
    ["Drafts", (r) => r.status === "draft"],
    ["Opened", (r) => r.status === "delivered"],
  ];

  return (
    <>
      <PageHeader eyebrow={email ?? undefined} title="Your letters" />
      <div className="mx-auto max-w-page space-y-12 px-4 md:px-8">
        <div className="flex flex-wrap gap-3">
          <ButtonLink to="/write">Write a new letter</ButtonLink>
          <Button variant="quiet" onClick={signOut}>
            Sign out
          </Button>
        </div>
        {error && <p role="alert" className="font-medium text-postal">{error}</p>}
        {rows &&
          groups.map(([title, match]) => {
            const items = rows.filter(match);
            return (
              <section key={title} aria-labelledby={`g-${title}`}>
                <h2 id={`g-${title}`} className="text-xl">
                  {title} <span className="font-sans text-base text-pencil">({items.length})</span>
                </h2>
                {items.length ? (
                  <ul className="mt-4 divide-y divide-rule border-y border-rule">
                    {items.map((r) => (
                      <li key={r.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                        <span>Written {longDate(new Date(r.created_at))}</span>
                        <span className="text-pencil">
                          {r.status.replace("_", " ")}
                          {r.deliver_at ? ` · arrives ${longDate(new Date(r.deliver_at))}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-pencil">Nothing here yet.</p>
                )}
              </section>
            );
          })}
      </div>
    </>
  );
}
