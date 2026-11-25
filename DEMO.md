# DEMO: Saltara

**Problem:** force plates cost hundreds to thousands of dollars, so most PE lessons measure the jump with chalk or not at all.

**Trigger:** a teacher opens the page on a classroom laptop.

**Wow moment:** the presenter jumps once on Zoom, the airborne hip points drop onto the plot, a parabola settles over them, and "34 cm" appears with "scale from gravity: 412 px/m" underneath, with no ruler entered.

**Closing line:** "Gravity is already a free ruler."

**Demo start route:** `/`

## Steps

1. `/` (`app/page.tsx`, `components/hero-arc.tsx`): the first screen shows the seeded j-02 arc; move the pointer (or the arrow keys) over it and the sun dot slides along the fitted parabola while the sentence below reads the hip height in cm. Then the five chapters walk the same jump through the method. Throw the deck once.
2. `/play` (`app/play/page.tsx`): Start camera shows the mirrored video, plum skeleton, sun-yellow hip dot and fps badge.
3. `/play` (`app/play/page.tsx`): replay j-02, jump live, or load a recorded clip. A line under the result says which source produced it. The trajectory plot shows the fitted arc, the cm result, "scale from gravity" in px/m, and the three estimates side by side.
4. `/play` (`components/arc-reveal.tsx`, `components/height-figure.tsx`): After a live jump, a clip, or a seeded jump picked from the deck, the airborne hip points drop onto the plot one by one, the parabola wipes in over them, and the cm figure springs past its value and settles, with scale from gravity in px/m underneath. With reduced motion the result appears in place.
5. `/play` (`app/play/page.tsx`): class list with three names and three attempts each, best marked, CSV download.
6. `/notes` (`app/notes/page.tsx`): the Bland-Altman plot, with the placeholder label shown until the real pilot replaces it.
7. Back on `/play` (`app/play/page.tsx`): the last arc on screen and the closing line.

## Seeded vs live

The twelve jumps of class 9B are seeded: they live in `fixtures/lesson-9b.json` and reach the pages through `lib/data/seed.ts` and `lib/adapter.ts` (`ADAPTER_MODE=fake`). `traceFor()` rebuilds each one frame by frame with a fixed PRNG, and the real solver runs on it. The pilot rows in `fixtures/pilot-placeholder.json` are placeholders and are labelled as such on `/notes`. Live camera jumps (step 2 and the live paths of steps 3 and 4) run in the browser and are never seeded. Saved attempts carry a source tag (seeded, camera or clip) in the class list and the CSV, and `/play?reset=demo` restores the start state.
