# HANDOFF: Saltara

You are picking up a working Next.js scaffold. Read this file, then `IDENTITY.md`, then start on the Mission list. Keep `npm run build` green after every change.

## 1. Context

**Product:** Saltara. Jump in front of a laptop camera and the app measures vertical jump height in centimetres, using gravity as the ruler: no mat, no force plate, no tape measure, no calibration.

**Pitch:** A PE teacher opens the page on the classroom laptop and points the camera at an empty wall. A student types their name and jumps in place three times. About a second after each landing the height appears in centimetres, with the arc the hip drew in the air. At the end of the lesson the whole class's best jumps sit in one table that downloads with one click. No measuring equipment to buy.

**Hackathon:** PhysTech 2027: Physical Activity and Technology Hack Day (Devpost, organised by Binnovative), https://phystech2027.devpost.com/

**Deadline:** 26 June 2027, 12:00 EDT. No extensions.

**Target:** Grand Prix (1st Place), which also covers 2nd, 3rd and Honorable Mention from the same ranking. Category awards we aim at with the same build: Excellence in Social Impact, Excellence in Research, Excellence in Innovation. Prizes are certificates plus an invitation to write a book chapter; no cash.

**Judging criteria (no published weights):** Impact, Creativity and innovation, Execution, Presentation.

**Submission requirements (all three are mandatory to be considered):**
1. Submit the project on Devpost by 26 June 2027, 12:00 EDT.
2. Register the presentation through the Google Form shared on the event Discord by the same time (presenter name and contact, country and time zone, project title, one-paragraph summary, public project link).
3. Present live on Zoom on 27 June 2027: 10 minutes total, about 3 of them Q&A.

The public link must show the real working output (GitHub, live app), not a description. If it is not reachable, no presentation slot is scheduled. Eligibility is contradictory on the page ("Students only" in the sidebar, "open to all ages" in the text): confirm on Discord if the builder is not a student. Submit at least a week early.

## 2. Current state

Identity: see IDENTITY.md (direction D12, structure S6, archetype L3, kit K4)

### Routes

| Route | File | What it shows |
| --- | --- | --- |
| `/` | `app/page.tsx` + `components/story-stage.tsx` | L3 editorial column, five scroll chapters (Stand, Leave, Ruler, Three, Class) driving one pinned live figure; mid-article CTA to `/play`; last chapter hands off to `/play` |
| `/play` | `app/play/page.tsx` + `components/jump-lab.tsx` | Jump lab: live camera with MediaPipe, the 12 demo jumps, result panel with three estimates, class list with CSV |
| `/notes` | `app/notes/page.tsx` | Method, formulas, quality gates, wall-mark pilot with Bland-Altman plot, tech and comparison folds |

All three are linked from the sticky header (`components/site-header.tsx`).

### File map

- `lib/jump-solver.ts`: REAL. Least squares parabola (3x3 normal equations), gravity scale `s = 2a/g`, three estimates, quality gates, `createJumpWatcher` for live take-off and landing detection, `blandAltman`.
- `lib/pose-tracker.ts`: REAL. `loadPoseLandmarker()` dynamically imports `@mediapipe/tasks-vision` 0.10.21, WASM from jsDelivr, lite model from Google's bucket, GPU then CPU. `readPose()` turns a frame into a `PoseSample`. The WASM URL version must match package.json exactly.
- Data path (Phase 1): `fixtures/*.json` → `lib/data/seed.ts` → `lib/adapter.ts` → page (async server component) → client component. `/api/lesson` and `/api/pilot` mirror it.
- `fixtures/lesson-9b.json`: seed. Class 9B (6 students `s-elif`.., 12 jumps `j-01`..`j-12`). `fixtures/pilot-placeholder.json`: 22 PLACEHOLDER pilot rows `p-01`..`p-22` (`placeholder: true`, labelled on screen).
- `lib/types.ts`: `Student`, `SeedJump`, `PilotRow`, `Lesson`, `LessonPayload`, `PilotPayload`, `AdapterMode`, `ApiResponse<T>`, `SaltaraAdapter`, re-export of `PoseSample`.
- `lib/data/seed.ts`: the only reader of the fixtures; narrows `attempt`, `fps` and `jumper` with guards that throw on bad values. Exports `lesson`, `students`, `seedJumps`, `pilotRows`, `pilotIsPlaceholder`, `studentName`, `traceFor`.
- `lib/data/trace.ts`: `traceFor()` (moved unchanged: mulberry32 seeded by `hashId(j.id)`) rebuilds each jump frame by frame (stand, dip, flight, landing, jitter) so the real solver runs on it. Client components import it from here.
- `lib/data.ts`: one-line shim (`export * from "./data/seed"`). Nothing imports it any more; new code uses `@/lib/data/seed` or the adapter.
- `lib/adapter.ts`: `adapterMode()` reads `ADAPTER_MODE` (`real` only for the exact string, else `fake`), `fakeAdapter`, `realAdapter` (Phase 2 stub serving the same seed), `getAdapter()`.
- `app/api/lesson/route.ts`, `app/api/pilot/route.ts`: `GET` returns `ApiResponse<LessonPayload>` / `ApiResponse<PilotPayload>`, Node runtime.
- `lib/tokens.ts`: `brandHex`, the only mirror of the globals.css hexes, used by `app/opengraph-image.tsx`.
- `scripts/seed.mjs` (`npm run seed`): validates ids and ranges in both fixtures, sorts by id, rewrites them as `JSON.stringify(x, null, 2) + "\n"`. Idempotent, no clock or randomness.
- `app/loading.tsx`, `app/play/loading.tsx`, `app/notes/loading.tsx`: sun-dot panel in the prose column.
- `components/trajectory-plot.tsx`: SVG hip trajectory with layers 0 to 3 (trace, airborne points, fitted arc + scale, height bracket).
- `components/jump-deck.tsx`: kit signature 1, throwable deck (react-spring + use-gesture).
- `components/story-stage.tsx`: the pinned figure, chapter indicator (IntersectionObserver picks the active chapter, buttons jump to one), chapter copy with live numbers.
- `components/jump-lab.tsx`: camera start/stop, `requestVideoFrameCallback` loop with rAF fallback, skeleton overlay, fps readout, Wake Lock, replay mode, saving attempts, localStorage persistence (`saltara.class.v1`).
- `components/class-roster.tsx`: class mode, add student, 3 attempts, best highlighted, CSV export, restore demo class.
- `components/bland-altman-plot.tsx`: server-rendered SVG agreement plot.
- `components/ui/*`: shadcn primitives restyled for D12 orchard (rounded-full buttons, rounded-3xl tinted cards, sun-dot badge).
- `app/globals.css`: tokens from IDENTITY.md only, `saltara-wipe` keyframes (M4), reduced-motion block.
- `public/logo.svg`, `app/icon.svg`, `public/illustrations/scene-1..3.svg`, `app/opengraph-image.tsx`: brand pack.

### Real vs mocked

- Real: pose tracking, frame timestamps, solver, three estimates, gates, class list, CSV, Wake Lock.
- Seeded: the 12 demo jumps (`fixtures/lesson-9b.json`, traced by `lib/data/trace.ts`) and the pilot rows (`fixtures/pilot-placeholder.json`). The pilot rows MUST be replaced by real measurements before submission (set `placeholder` to false). `realAdapter` is a stub that serves the same seed.
- Untested on real footage: `createJumpWatcher` thresholds (4 percent of leg length, 0.35 s settle) and the rigid-body take-off level in `analyzeJump` (see the TODO about toe landmarks 31 and 32).

### Interaction kit (K4 spring)

- Shipped: signature 1, the throwable deck of recorded jumps on `/`. Drag velocity decides how many cards a throw skips, a spring settles it, and the chosen jump redraws the trajectory figure and every number in the chapter text. Arrow keys and prev/next buttons are the alternative. `touch-action: pan-y` is set.
- Frontend phase: signature 2, a spring-driven height figure on `/play` that overshoots and settles each time a new jump result lands (the big "34 cm").
- Frontend phase: signature 3, a pointer-following tilt or magnetic pull on the "Start camera" control or the trajectory figure.

### One-mark proof (`components/site-header.tsx`)

```tsx
<Link href="/" className="flex items-center gap-2 font-display text-xl font-bold">
  <BrandMark />
  Saltara
</Link>
```

## 3. Mission (in order)

1. **Hip tracking and frame timestamps on real footage (about 3 h).** Done when: on `/play`, Start camera shows the mirrored video, the plum skeleton and the sun-yellow hip dot, and the badge shows the measured fps. Test in daylight and under gym lights, 2 to 3 m back. Tune the watcher thresholds in `lib/jump-solver.ts` until 10 jumps in a row produce a result.
2. **Gravity solver on real jumps (about 3.5 h).** Done when: each landing produces the cm result, scale in px/m and three estimates within about 1 s; frame counting and parabola flight time agree within 3 cm on clean jumps. Consider averaging hip with shoulder midpoint to cut jitter (risk noted in the idea). Add the shoulder-width drift flag (more than 5 percent change marks the jump).
3. **Wow moment (about 1.5 h), schedule it right after step 2.** Done when: after a live jump the airborne hip points drop onto the plot one by one, the parabola wipes in over them, and the result reads like "34 cm" with "scale from gravity: 412 px/m" underneath. Build kit signature 2 here (spring overshoot on the number). Rehearse it on Zoom with screen share.
4. **Class mode polish (about 2 h).** Done when: three names, three attempts each (two pre-recorded, one live), best marked, CSV opens cleanly in a spreadsheet, Wake Lock holds for 40 minutes.
5. **Validation pilot (about 2 h, includes 30 min of jumping).** Done when: `fixtures/pilot-placeholder.json` (or a real pilot fixture read by `realAdapter`) holds your own 20 or more jumps (2 people if possible: chalk jump-and-reach with tape, plus the three estimates), `pilotIsPlaceholder` is false, and `/notes` states the bias and limits of agreement in one sentence. This carries the Research award and the book chapter.
6. **Fallback file mode (about 1 h).** A video file input on `/play` that runs the same pipeline on a recorded jump, in case Zoom locks the camera during the live presentation.
7. **Kit signature 3, low-light and low-fps tests, README numbers (about 2 h).** Fill README with real pilot results. Record the demo video and add its link to the submission form (not to the README).
8. **Submit (30 min) at least a week before 26 June 2027:** Devpost entry plus the Discord Google Form. Then rehearse the 10 minute talk: 7 minutes of story and a live jump, 3 minutes of questions.

## 4. Constraints

- Next.js 15 App Router, TypeScript strict, Tailwind v4 (no tailwind.config), shadcn primitives in `components/ui/`. Deploys to Vercel: no custom server, no runtime file writes.
- IDENTITY.md is law for every color, font, route, layout and animation. Colors only through the tokens in `app/globals.css`. Syne for every h1 and h2, Atkinson Hyperlegible for body. Home stays one column (L3), no stat tiles, no two-column grid at lg. Radius stays round (0.75rem and up). Motion is the `saltara-wipe` clip-path reveal only, disabled under reduced motion.
- Every kit import (`@react-spring/web`, `@use-gesture/react`) lives in a `"use client"` component; server HTML stays readable with JavaScript off.
- Only import `@mediapipe/tasks-vision` at runtime through `loadPoseLandmarker()`; never at module top level in a server file.
- Copy rules: English, no em or en dashes, no double hyphens as dashes, none of: seamless, leverage, empower, revolutionize, streamline, game-changer, cutting-edge, delve, robust, unlock, elevate, harness, effortless. Write like a builder. Keep numbers honest: seeded data is always labelled as seeded.
- Scope discipline: if something threatens the deadline, cut scope (file mode, signature 3) rather than polish.
- Run `npm run build` after every change and keep it passing.

## 5. Definition of done

- Deployed at https://saltara.vercel.app and reachable without login.
- README demo link filled and the pilot results written in with real numbers.
- The 90 second demo works end to end: open the story, live jump with skeleton and fps, the arc and cm result with the gravity scale, three estimates side by side, class mode with three students and CSV, `/notes` with the real Bland-Altman plot.
- The wow moment rehearsed on Zoom with screen share, with the file-mode fallback ready.
- Devpost submission and the Discord Google Form both done before 26 June 2027, 12:00 EDT.

## Phase 1 log

### Goal

Walking skeleton through the adapter seam: every `DEMO.md` step maps to an existing route, and seed data flows `fixtures/*.json` → `lib/data/seed.ts` → `lib/adapter.ts` → page → client component, mirrored by typed `/api` stubs.

### Status

All five slices written. Build, seed idempotence and deploy are unverified (the agent cannot run commands; the runner does).

### Decisions

- Fixtures are stored in exactly the bytes `scripts/seed.mjs` writes (2-space JSON, trailing newline, `38.0` written as `38`), so the first `npm run seed` is already a no-op. The numbers parse to the same doubles as the old literals, so `traceFor` output is unchanged.
- The seed script sorts jumps and pilot rows by id but keeps the student order (the roster and the CSV follow it).
- `StoryStage` and `JumpLab` take `lesson: LessonPayload`. The class chapter now derives the student count and the lesson length in minutes from the payload (about 13 minutes for the seed, same as the old copy).
- Chart overflow wrappers live inside `TrajectoryPlot` and `BlandAltmanPlot`, with a `min-w-[20rem]` on the SVG so labels stay legible at 375px and scroll instead of shrinking. The class roster list sits in its own `overflow-x-auto` wrapper.
- `/api/pilot` returns `source: "seed"` while `placeholder` is true and `"pilot"` once it is false.
- The deck card keeps `w-[168px]` (it feeds `CARD = 168` in the drag math); its track sits inside the `overflow-hidden` viewport in `components/jump-deck.tsx:94`.

### Failed attempts

None.

### Files changed

DEMO.md (new), CLAUDE.md (new), README.md, .env.example, lib/types.ts (new), fixtures/lesson-9b.json (new), fixtures/pilot-placeholder.json (new), lib/data/trace.ts (new), lib/data/seed.ts (new), lib/data.ts, scripts/seed.mjs (new), package.json, lib/adapter.ts (new), app/api/lesson/route.ts (new), app/api/pilot/route.ts (new), app/page.tsx, app/play/page.tsx, app/notes/page.tsx, components/story-stage.tsx, components/jump-lab.tsx, app/loading.tsx (new), app/play/loading.tsx (new), app/notes/loading.tsx (new), app/layout.tsx, app/error.tsx, app/not-found.tsx, lib/tokens.ts (new), app/opengraph-image.tsx, components/trajectory-plot.tsx, components/bland-altman-plot.tsx, components/class-roster.tsx, HANDOFF.md, .farm-commits.json.

### Commands run

None, the agent cannot run commands.

### Open questions

- Sameness tripwire false positives in never-touch files: `components/ui/button.tsx:15` has `hover:bg-sun/85` (a button hover, not the header) and `lib/pose-tracker.ts:12` has `float16` in the model URL (not a keyframe). Left alone per the Never list.
- `/play` still uses `max-w-3xl` for the tool column (scaffold choice; L3 applies to `/`). Confirm or narrow to `max-w-prose` in the frontend phase.
- `components/class-roster.tsx` was touched (overflow wrapper only) although it was not in the Slice 5 file list; the spec allowed it "if it renders rows wider than 375px".

### Next best step

Mission 1 and 2 on real footage: hip tracking and the gravity solver on live jumps, with live jumps flowing into the same `/play` result path that now renders adapter-served seed jumps. The Phase 2 agent records the verified live URL here.
