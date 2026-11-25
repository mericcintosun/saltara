# Saltara

Jump in front of a laptop camera and Saltara measures your vertical jump in centimetres. Gravity is the ruler: no mat, no force plate, no tape measure, no calibration.

## The problem

The vertical jump is the most common lower-body power test in school fitness testing and athlete monitoring. The tools that measure it well, force plates and contact mats, cost hundreds to thousands of dollars. The cheap alternative, the My Jump 2 phone app, needs slow-motion video and a person who picks the take-off and landing frames by hand, and published work still finds noticeable flight-time error at 120 Hz.

So a PE teacher with no equipment budget and a class of 30 either puts chalk marks on the wall or skips the test.

## The solution

While the body is in the air, its centre of mass follows a parabola with a known acceleration: g = 9.81 m/s². Saltara uses that fact twice.

1. **Tracking.** MediaPipe Pose Landmarker follows the hips and ankles on every webcam frame, and `requestVideoFrameCallback` gives each frame its real timestamp, so a dropped frame does not bend the curve.
2. **The gravity ruler.** Saltara fits `y = at² + bt + c` to the hip height across the 10 to 18 airborne frames. In image pixels, `a = (g/2) × s`, so the curvature gives the scale `s` in pixels per metre with nothing in the frame to calibrate against.
3. **Three heights, side by side.**
   - Frame counting: airborne frames times the frame period, `h = gT²/8`.
   - Parabola flight time (the reported number): the two roots of the fitted curve land between frames, so `T` is no longer stuck to the 33 ms grid of a 30 fps camera.
   - Standing hip to apex: the rise converted with the gravity scale. It includes the heel raise, like a wall-reach test, and catches the bent-knee landing error that inflates flight time.

Jumps with fewer than 6 airborne frames, an R² under 0.9, or hidden feet are rejected with a typed code and a plain reason ("step back", "add light"). If the shoulder width in pixels changes by more than 5 percent, the jumper moved toward or away from the camera: the height is kept and marked for care. Every gate lives in `lib/config.ts`.

The same pipeline runs from three inputs on `/play`: the live camera, a recorded clip loaded from disk (the fallback when a video call holds the camera), or the seeded replay. A line under each result says which one produced it.

The teacher flow: open the page on the classroom laptop, point it at an empty wall, pick a student, let them jump three times. Each result appears about a second after landing. At the end of the lesson the class table downloads as a CSV.

## How it uses the required tech

PhysTech 2027 has no sponsor SDK requirement. The core tech is MediaPipe Pose Landmarker (lite, VIDEO mode) from `@mediapipe/tasks-vision`, loaded in the browser in `lib/pose-tracker.ts` and driven frame by frame from `components/jump-lab.tsx`. The solver in `lib/jump-solver.ts` is plain TypeScript and runs both on live frames and on the seeded demo lesson.

## Tech stack

- Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, shadcn-style primitives
- `@mediapipe/tasks-vision` 0.10.21 (WASM runtime from jsDelivr, model from Google's public bucket, no key)
- `requestVideoFrameCallback`, `getUserMedia`, Screen Wake Lock API, `localStorage`
- `@react-spring/web` 10 and `@use-gesture/react` 10 for the throwable deck of recorded jumps
- zod 3 validates the picked clip and the collected samples before the solver sees them
- Vitest 3 for the solver tests, `tsx` for the proof script
- Charts are hand-drawn SVG, so they render on the server and follow the design tokens
- Deployed on Vercel, no server code, no database

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

```bash
npm test         # Vitest: solver cases (synthetic parabola, seeded j-02, too few frames, jitter, drift) and schemas
npm run proof    # solves the 12 seeded jumps, runs the tests, checks the engine URLs, rewrites the Proof section below
```

No secrets are needed (see `.env.example`). `ADAPTER_MODE` is read only in `lib/config.ts` and defaults to `fake`, which opens `/play` on the seeded class 9B replay; `real` opens it on the live camera. In both modes the camera and the recorded clip run the real pipeline, and the lesson and pilot rows come from the fixtures. `npm run seed` validates `fixtures/*.json` and rewrites them in a stable order; running it twice changes nothing. The camera needs HTTPS or `localhost`.

Routes:

- `/` the story: five chapters that walk one recorded jump through the method
- `/play` the jump lab: live camera, recorded clip, the twelve demo jumps, class list and CSV export
- `/notes` method, formulas, quality gates, the wall-mark pilot and its Bland-Altman plot

## Demo

> Live demo: https://saltara.vercel.app

## Proof

`npm run proof` rewrites the three blocks below with measured numbers. A block that could not run says so.

### Solver on the seeded jumps

<!-- PROOF:BEGIN solver -->
Sample data: the 12 seeded jumps of Year 9 PE, class 9B (synthetic traces rebuilt by `traceFor`), solved by `analyzeJump` in Node.

| id | true rise cm | headline cm | error cm | true px/m | gravity px/m | ms |
| --- | --- | --- | --- | --- | --- | --- |
| j-01 | 31.8 | 32.0 | 0.2 | 410 | 407 | 1.73 |
| j-02 | 33.9 | 33.6 | -0.3 | 412 | 416 | 0.62 |
| j-03 | 27.6 | 27.5 | -0.1 | 388 | 391 | 0.17 |
| j-04 | 29.1 | 28.9 | -0.2 | 391 | 396 | 0.13 |
| j-05 | 39.2 | 38.8 | -0.4 | 436 | 440 | 0.55 |
| j-06 | 37.1 | 37.1 | -0.0 | 433 | 433 | 0.13 |
| j-07 | 24.4 | 25.6 | 1.2 | 402 | 378 | 0.11 |
| j-08 | 26.2 | 27.2 | 1.0 | 405 | 389 | 0.10 |
| j-09 | 30.1 | 30.7 | 0.6 | 421 | 413 | 0.15 |
| j-10 | 28.9 | 29.6 | 0.7 | 418 | 409 | 0.13 |
| j-11 | 35.2 | 34.9 | -0.3 | 377 | 382 | 0.13 |
| j-12 | 36.8 | 36.1 | -0.7 | 380 | 386 | 0.56 |

Mean absolute error: 0.48 cm over 12 solved jumps (0 rejected). Median solver latency: 0.14 ms.
<!-- PROOF:END solver -->

### Tests

<!-- PROOF:BEGIN tests -->
`npx vitest run` on `tests/`: 8 passed, 0 failed, 8 total.
<!-- PROOF:END tests -->

### Engine files

<!-- PROOF:BEGIN engine -->
HEAD requests from the proof run to the URLs in `lib/pose-tracker.ts`:

| url | status | ms |
| --- | --- | --- |
| https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm | 404 | 180 |
| https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task | 200 | 171 |
<!-- PROOF:END engine -->

## Honest status

The twelve demo jumps of class 9B are synthetic traces: physically correct flights with webcam-like landmark jitter, so the solver can be shown without a camera. The pilot rows on `/notes` are placeholders shaped like the planned study and are labelled as such on screen. They get replaced by our own session: 2 jumpers, at least 20 jumps, chalk jump-and-reach and tape measure against the three Saltara estimates.

## What we would build next

- Run the pilot and publish the Bland-Altman results, including the R² cut-off that keeps limits of agreement under 3 cm.
- Tune the gates in `lib/config.ts` on real gym footage (lighting, distance, 25 and 30 fps webcams).
- Repeated-lesson tracking, so a teacher can see a class improve across a term.

## AI use

<!-- Adjust this section to each hackathon's disclosure rules. -->
We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.
