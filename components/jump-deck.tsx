"use client";

import { useEffect, useRef, useState } from "react";
import { animated, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DeckItem {
  id: string;
  title: string;
  subtitle: string;
  valueCm: number | null;
}

const CARD = 168;
const GAP = 12;
const STEP = CARD + GAP;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * Kit K4 signature 1: a throwable deck of recorded jumps. Drag velocity decides
 * how many cards a throw skips; a spring settles the deck on the chosen jump,
 * and the chosen jump drives the trajectory figure above it.
 * Keyboard: arrow keys on the deck, or the previous and next buttons.
 */
export function JumpDeck({
  items,
  index,
  onIndexChange,
  label,
}: {
  items: DeckItem[];
  index: number;
  onIndexChange: (i: number) => void;
  label: string;
}) {
  const reduced = usePrefersReducedMotion();
  const dragged = useRef(false);
  const [{ x }, api] = useSpring(() => ({ x: -index * STEP, config: { tension: 280, friction: 22 } }));

  useEffect(() => {
    api.start({ x: -index * STEP, immediate: reduced });
  }, [index, api, reduced]);

  const clamp = (i: number) => Math.min(Math.max(i, 0), items.length - 1);

  const bind = useDrag(
    ({ down, movement: [mx], velocity: [vx], direction: [dx] }) => {
      if (down) {
        if (Math.abs(mx) > 4) dragged.current = true;
        api.start({ x: -index * STEP + mx, immediate: true });
        return;
      }
      let next = Math.round(index - mx / STEP);
      if (vx > 0.35 && dx !== 0) {
        const thrown = Math.max(1, Math.round(vx * 1.5));
        next = dx < 0 ? Math.max(next, index + thrown) : Math.min(next, index - thrown);
      }
      next = clamp(next);
      api.start({ x: -next * STEP, immediate: reduced });
      if (next !== index) onIndexChange(next);
      window.setTimeout(() => {
        dragged.current = false;
      }, 0);
    },
    { axis: "x", filterTaps: true }
  );

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="soft"
        size="icon"
        aria-label="Previous jump"
        disabled={index === 0}
        onClick={() => onIndexChange(clamp(index - 1))}
      >
        <ChevronLeft />
      </Button>
      <div
        className="relative min-w-0 flex-1 overflow-hidden rounded-2xl py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabIndex={0}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`deck-${items[index]?.id}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            onIndexChange(clamp(index + 1));
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            onIndexChange(clamp(index - 1));
          }
        }}
      >
        <animated.div
          {...bind()}
          style={{ x, touchAction: "pan-y" }}
          className="flex cursor-grab gap-3 pl-[calc(50%-84px)] active:cursor-grabbing"
        >
          {items.map((item, i) => (
            <div
              key={item.id}
              id={`deck-${item.id}`}
              role="option"
              aria-selected={i === index}
              onClick={() => {
                if (!dragged.current) onIndexChange(i);
              }}
              className={cn(
                "w-[168px] shrink-0 select-none rounded-2xl px-4 py-3 transition-colors",
                i === index ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold">{item.title}</span>
                {i === index && <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-sun" />}
              </div>
              <div className={cn("text-xs", i === index ? "text-primary-foreground/80" : "text-muted-foreground")}>
                {item.subtitle}
              </div>
              <div className="mt-1 font-display text-xl font-bold">
                {item.valueCm === null ? "rejected" : `${item.valueCm.toFixed(1)} cm`}
              </div>
            </div>
          ))}
        </animated.div>
      </div>
      <Button
        variant="soft"
        size="icon"
        aria-label="Next jump"
        disabled={index === items.length - 1}
        onClick={() => onIndexChange(clamp(index + 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
