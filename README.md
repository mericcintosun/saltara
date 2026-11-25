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

Jumps with fewer than 6 airborne frames, an R² under 0.9, or hidden feet are rejected with a plain reason ("step back", "add light").

The teacher flow: open the page on the classroom laptop, point it at an empty wall, pick a student, let them jump three times. Each result appears about a second after landing. At the end of the lesson the class table downloads as a CSV.

## How it uses the required tech

PhysTech 2027 has no sponsor SDK requirement. The core tech is MediaPipe Pose Landmarker (lite, VIDEO mode) from `@mediapipe/tasks-vision`, loaded in the browser in `lib/pose-tracker.ts` and driven frame by frame from `components/jump-lab.tsx`. The solver in `lib/jump-solver.ts` is plain TypeScript and runs both on live frames and on the seeded demo lesson.

## Tech stack

- Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, shadcn-style primitives
- `@mediapipe/tasks-vision` 0.10.21 (WASM runtime from jsDelivr, model from Google's public bucket, no key)
- `requestVideoFrameCallback`, `getUserMedia`, Screen Wake Lock API, `localStorage`
- `@react-spring/web` and `@use-gesture/react` for the throwable deck of recorded jumps
- Charts are hand-drawn SVG, so they render on the server and follow the design tokens
- Deployed on Vercel, no server code, no database

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

No environment variables are needed (see `.env.example`). The camera needs HTTPS or `localhost`.

Routes:

- `/` the story: five chapters that walk one recorded jump through the method
- `/play` the jump lab: live camera, the twelve demo jumps, class list and CSV export
- `/notes` method, formulas, quality gates, the wall-mark pilot and its Bland-Altman plot

## Demo

> Live demo: https://saltara.vercel.app

## Honest status

The twelve demo jumps of class 9B are synthetic traces: physically correct flights with webcam-like landmark jitter, so the solver can be shown without a camera. The pilot rows on `/notes` are placeholders shaped like the planned study and are labelled as such on screen. They get replaced by our own session: 2 jumpers, at least 20 jumps, chalk jump-and-reach and tape measure against the three Saltara estimates.

## What we would build next

- Run the pilot and publish the Bland-Altman results, including the R² cut-off that keeps limits of agreement under 3 cm.
- Flag jumps where the shoulder width in pixels changes by more than 5 percent (the jumper drifted towards or away from the camera).
- A file mode that runs the solver on a recorded video, as a fallback when a video call holds the camera.
- Repeated-lesson tracking, so a teacher can see a class improve across a term.

## AI use

<!-- Adjust this section to each hackathon's disclosure rules. -->
We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.
