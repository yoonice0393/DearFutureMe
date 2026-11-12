import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

const IDLE_SECONDS = 90;
const WARN_SECONDS = 15;

/** Dev-only override for testing: /booth?idle=5 */
function idleSeconds(): number {
  if (import.meta.env.DEV) {
    const v = Number(new URLSearchParams(location.search).get("idle"));
    if (v > 0) return v;
  }
  return IDLE_SECONDS;
}

const ACTIVITY = ["pointerdown", "keydown", "input", "touchstart", "wheel"] as const;

/**
 * After 90s without input, asks "Still writing?" with a 15s countdown,
 * then calls onTimeout (which wipes the session).
 */
export function IdleGuard({ active, onTimeout }: { active: boolean; onTimeout: () => void }) {
  const [warning, setWarning] = useState(false);
  const [left, setLeft] = useState(WARN_SECONDS);
  const idleTimer = useRef<number | undefined>(undefined);
  const warnRef = useRef(false);
  warnRef.current = warning;

  const arm = useCallback(() => {
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      setLeft(WARN_SECONDS);
      setWarning(true);
    }, idleSeconds() * 1000);
  }, []);

  // Watch for activity while active (ignored once the warning is showing).
  useEffect(() => {
    if (!active) {
      window.clearTimeout(idleTimer.current);
      setWarning(false);
      return;
    }
    arm();
    const onActivity = () => {
      if (!warnRef.current) arm();
    };
    ACTIVITY.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true, capture: true }));
    return () => {
      window.clearTimeout(idleTimer.current);
      ACTIVITY.forEach((ev) => window.removeEventListener(ev, onActivity, { capture: true }));
    };
  }, [active, arm]);

  // Countdown.
  useEffect(() => {
    if (!warning) return;
    if (left <= 0) {
      setWarning(false);
      onTimeout();
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [warning, left, onTimeout]);

  const keepGoing = () => {
    setWarning(false);
    arm();
  };

  return (
    <Modal open={warning} onClose={keepGoing} title="Still writing?">
      <p className="text-lg">
        To keep your letter private, this screen will clear in{" "}
        <strong className="font-semibold" aria-live="polite" aria-atomic="true">
          {left} {left === 1 ? "second" : "seconds"}
        </strong>
        .
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={keepGoing} className="min-h-14 px-8 text-base" data-autofocus>
          Yes, keep writing
        </Button>
        <Button
          variant="secondary"
          className="min-h-14 px-8 text-base"
          onClick={() => {
            setWarning(false);
            onTimeout();
          }}
        >
          Clear the screen
        </Button>
      </div>
    </Modal>
  );
}
