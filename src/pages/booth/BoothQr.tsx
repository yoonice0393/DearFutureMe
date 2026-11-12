import QRCode from "qrcode";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/Button";
import { Wordmark } from "@/components/Wordmark";
import { readKiosk } from "@/features/booth/kiosk";
import { issueEventCode } from "@/lib/api";
import { longDate } from "@/lib/dates";
import { usePageTitle } from "@/lib/usePageTitle";

type Code = { url: string; svg: string; refreshIn: number | null; expiresAt: string; eventName: string };

/**
 * Staff screen on a registered booth device: a QR that refreshes every ~5 minutes,
 * so a photo of it posted online stops working soon after. "Printable" switches to
 * the event-long static code (lower cap) for standees.
 */
export function BoothQr() {
  usePageTitle("Scan to write");
  const kiosk = readKiosk();
  const [kind, setKind] = useState<"rotating" | "static">("rotating");
  const [code, setCode] = useState<Code | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!kiosk) return;
    const res = await issueEventCode(kiosk.token, kind);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const url = `${location.origin}/e/${res.code}`;
    const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1F2A37", light: "#FFFFFF" } });
    setError(null);
    setCode({ url, svg, refreshIn: res.refreshInSeconds, expiresAt: res.expiresAt, eventName: res.eventName });
  }, [kiosk?.token, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // Rotate on schedule; retry sooner after an error (e.g. flaky booth Wi-Fi).
  useEffect(() => {
    const seconds = error ? 30 : code?.refreshIn;
    if (!seconds) return;
    const t = window.setTimeout(load, seconds * 1000);
    return () => window.clearTimeout(t);
  }, [code, error, load]);

  if (!kiosk) {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-24">
        <Wordmark />
        <h1 className="mt-12 text-2xl">Register this device first.</h1>
        <p className="mt-6"><Link to="/booth/setup">Go to booth setup</Link></p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-paper print:bg-white">
      <header className="flex items-center justify-between border-b border-rule px-4 py-3 md:px-12 print:hidden">
        <Wordmark />
        <div className="flex gap-2">
          <Button variant={kind === "rotating" ? "primary" : "secondary"} onClick={() => setKind("rotating")} aria-pressed={kind === "rotating"}>
            Live screen
          </Button>
          <Button variant={kind === "static" ? "primary" : "secondary"} onClick={() => setKind("static")} aria-pressed={kind === "static"}>
            Printable
          </Button>
        </div>
      </header>
      <main className="mx-auto grid w-full max-w-page flex-1 items-center gap-12 px-4 py-12 md:grid-cols-12 md:px-12">
        <div className="md:col-span-6">
          <p className="eyebrow">{code?.eventName ?? kiosk.eventName}</p>
          <h1 className="mt-4 text-3xl">Write a letter to your future self, on your own phone.</h1>
          <ol className="mt-8 space-y-3 text-lg">
            <li>1. Scan the code with your camera.</li>
            <li>2. Write your letter and pick a date.</li>
            <li>3. We'll email it to you in the future.</li>
          </ol>
          <p className="mt-8 text-sm text-pencil print:hidden" aria-live="polite">
            {error
              ? `Couldn't refresh the code: ${error} Retrying…`
              : kind === "rotating"
                ? "This code refreshes every few minutes. Photos of it stop working soon after."
                : code && `Valid until the event ends (${longDate(new Date(code.expiresAt))}). Shares a smaller letter limit than the live screen.`}
          </p>
          {kind === "static" && code && (
            <Button className="mt-6 print:hidden" onClick={() => window.print()}>Print this page</Button>
          )}
        </div>
        <div className="md:col-span-5 md:col-start-8">
          {code ? (
            <figure className="sheet p-6">
              <div className="aspect-square w-full [&_svg]:h-full [&_svg]:w-full" role="img" aria-label="QR code that opens the letter page"
                // qrcode generates plain SVG markup from our own URL; no user input is involved.
                dangerouslySetInnerHTML={{ __html: code.svg }} />
              <figcaption className="mt-4 text-center text-xs text-pencil [overflow-wrap:anywhere]">{code.url}</figcaption>
            </figure>
          ) : (
            <div className="sheet flex aspect-square items-center justify-center text-pencil">{error ? "No code" : "Loading…"}</div>
          )}
        </div>
      </main>
    </div>
  );
}
