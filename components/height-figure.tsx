"use client";

import { useLayoutEffect, useRef } from "react";
import { animated, useSpring } from "@react-spring/web";

/** Low friction so the number swings past its value and settles back (kit signature 2). */
const OVERSHOOT = { tension: 260, friction: 12 };

/**
 * The big cm figure on /play. The first render (and the server HTML) shows the real
 * number. When `revealKey` changes after mount, or on mount with `animateOnMount`,
 * it springs up from 0 after `delayMs`, overshoots and settles on `cm`.
 */
export function HeightFigure({
  cm,
  revealKey,
  animateOnMount = false,
  delayMs = 0,
}: {
  cm: number;
  revealKey: string;
  animateOnMount?: boolean;
  delayMs?: number;
}) {
  const [{ v }, api] = useSpring(() => ({ v: animateOnMount ? 0 : cm, config: OVERSHOOT }));
  const lastKey = useRef<string | null>(animateOnMount ? null : revealKey);
  const target = useRef(cm);

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (lastKey.current === revealKey) {
      // Same result with a new number should not happen; never leave a stale value on screen.
      if (target.current !== cm) {
        target.current = cm;
        api.start({ v: cm, immediate: true });
      }
      return;
    }
    lastKey.current = revealKey;
    target.current = cm;
    api.stop();
    if (reduce) {
      api.start({ v: cm, immediate: true });
      return;
    }
    api.set({ v: 0 });
    api.start({ v: cm, delay: delayMs, config: OVERSHOOT });
  }, [revealKey, cm, delayMs, api]);

  const big = "font-display text-6xl font-extrabold tabular-nums";
  return (
    <p>
      <animated.span aria-hidden className={big}>
        {v.to((x) => Math.max(0, x).toFixed(0))}
      </animated.span>
      <span aria-hidden className={big}>
        {" "}
        cm
      </span>
      <span className="sr-only" aria-live="polite">
        {cm.toFixed(0)} cm
      </span>
    </p>
  );
}
