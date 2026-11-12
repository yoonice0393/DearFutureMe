import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

const SITE_KEY: string | undefined = import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined;
export const turnstileEnabled = Boolean(SITE_KEY);

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loader: Promise<TurnstileApi> | undefined;
function loadTurnstile(): Promise<TurnstileApi> {
  return (loader ??= new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    s.onerror = () => {
      loader = undefined;
      reject(new Error("turnstile failed to load"));
    };
    document.head.appendChild(s);
  }));
}

export type TurnstileHandle = { reset: () => void };

/**
 * Cloudflare Turnstile in "interaction-only" mode: invisible for most people,
 * a single checkbox only when Cloudflare isn't sure. Tokens are single-use,
 * so callers reset() after every submit attempt.
 */
export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string | null) => void; action?: string }>(
  function Turnstile({ onToken, action }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const widget = useRef<string | null>(null);
    const cb = useRef(onToken);
    cb.current = onToken;

    useImperativeHandle(ref, () => ({
      reset: () => {
        cb.current(null);
        if (widget.current) window.turnstile?.reset(widget.current);
      },
    }));

    useEffect(() => {
      if (!SITE_KEY || !el.current) return;
      let cancelled = false;
      loadTurnstile()
        .then((t) => {
          if (cancelled || !el.current) return;
          widget.current = t.render(el.current, {
            sitekey: SITE_KEY,
            action,
            appearance: "interaction-only",
            theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
            callback: (token: string) => cb.current(token),
            "expired-callback": () => cb.current(null),
            "error-callback": () => cb.current(null),
          });
        })
        .catch(() => cb.current(null));
      return () => {
        cancelled = true;
        if (widget.current) window.turnstile?.remove(widget.current);
        widget.current = null;
      };
    }, [action]);

    if (!SITE_KEY) return null;
    return <div ref={el} className="min-h-0 empty:hidden" />;
  },
);
