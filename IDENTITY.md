# IDENTITY (contract; every later phase obeys this file)

DIRECTION: D12 orchard
GROUND: #f7f9f1 orchard-cream
SURFACE: #edf2e2
DEEP: #e1ead1
LINE: #cfdbbb
INK: #22301c
ACCENT: #7c3aa3 plum
ON_ACCENT: #f7f9f1
SECOND: #e8b73a sun
OK: #2e7d4f
WARN: #a8641c
BAD: #b3382c
FONT_DISPLAY: F11 Syne (next/font/google: Syne)
FONT_BODY: Atkinson Hyperlegible (next/font/google: Atkinson_Hyperlegible, weight: ["400", "700"] is required)
FONT_MONO: none
STRUCTURE: S6 story-scroll
ARCHETYPE: L3 editorial
MOTION: M4 wipe, prefix saltara-
KIT: K4 spring
RADIUS: round
HEADER: solid ground, border-b in LINE, sticky
LOGO_POLICY: brand-mark

## Why

The farm assigned this identity so that no two projects share a look, a route map or an interaction style. The most recent projects it differs from: Arbitrum Open House São Paulo: Online Buildathon (D13, S1, L7, K1); Code for Change (D4, S5, L4, K7); AI for Medicine: A Global Student Hackathon on the Future of Care (D9, S2, L1, K2). It is not a suggestion. Tie the product's own nouns to it; do not swap any row for a familiar one.

## Direction: D12 orchard

Fresh pale green-cream, sunlit, rounded and friendly.

Surface treatment: Rounded friendly panels, leaf and fruit shapes as flat fills, a sun-yellow dot as the recurring detail, soft tinted surfaces instead of borders.

Every hex in app/globals.css comes from the key block above. RADIUS round means 0.75rem and above on every card, panel and control. ON_ACCENT is the text color on an ACCENT fill. The semantic colors (OK, WARN, BAD) mark state only, never brand.

## Structure: S6 story-scroll

One long scroll narrative on the home route with the live product embedded and driven by the chapters.

Route map (name the bracketed parts with the product's own words):
- `/` : 3 to 5 scroll chapters, each changing the state of the same live component with seed data
- `/play` : the free-form tool without the narrative
- `/notes` : method, numbers and sponsor tech as an appendix

Rules:
- the same live component stays on screen while the chapter text changes beside or over it
- a chapter indicator shows progress and lets the reader jump between chapters
- the last chapter hands control to the reader and links to `/play`

## Archetype: L3 editorial (the composition of the home route)

A single centered column at max-w-prose in magazine order: kicker, display headline, standfirst, inline figure, CTA mid-article; numbers appear inside sentences.

MUSTs: one column at every breakpoint; the display voice leads; the CTA appears mid-flow.
Bans: stat tiles; any two-column grid at lg.

## Motion: M4 wipe (the entrance signature)

clip-path inset reveal, cubic-bezier(0.65, 0, 0.35, 1), 600ms. One keyframe block implements it; every keyframe name starts with `saltara-`. A `prefers-reduced-motion: reduce` block disables it.

## Interaction kit: K4 spring

react-spring with use-gesture: physical drag, throw and settle.

Packages for package.json dependencies: "@react-spring/web": "^10.1.2", "@use-gesture/react": "^10.3.1".

Typical import: `import { useSpring, useSprings, animated } from "@react-spring/web"; import { useDrag } from "@use-gesture/react";`

Signature interactions (the scaffold ships the first; all three exist by the end of the frontend phase):
1. a throwable card deck or draggable slider of the seed records (`useDrag` with velocity feeding `useSpring`)
2. a spring-driven figure or gauge that overshoots and settles whenever the core value changes
3. a pointer-following tilt or magnetic pull on the hero artifact or the primary control

Rules:
- set `touch-action` on every draggable element
- every drag has a keyboard or button alternative
- add the packages above to package.json `dependencies` (and `devDependencies` where listed) with exactly these ranges; the runner installs them
- every import of a kit package lives in a component that starts with `"use client"`
- server HTML must be readable with JavaScript off: never server-render content at opacity 0 or off screen; animate from the visible state or on interaction
- honor `prefers-reduced-motion: reduce`: the content and every control stay usable with motion off
- every interaction is driven by the real seed data; a decorative animation with no product meaning does not count as a signature

## Amendments (append-only; later phases add dated lines here, never edit anything above)

2026-11-25 Phase 4: signature 2 ships in components/height-figure.tsx (useSpring overshoot on the cm figure).
2026-11-25 Phase 5: signature 3 ships in components/hero-arc.tsx (magnetic pull and tilt on the seeded j-02 arc, slider keys as the alternative); placement: first screen sig 3, /play core action sig 2, / chapters sig 1.
2026-11-25 Phase 5: components/ui/button.tsx gains size icon; scene slots 4 to 6 added on /play and the 404 page.
