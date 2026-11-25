# SUBMISSION: Saltara

Paste-ready fields, in form order. Deadline for both forms: 26 June 2027, 12:00 EDT.

## Devpost

### Project name

Saltara

### Elevator pitch (184 of 200 characters)

Saltara measures a vertical jump in centimetres from a laptop webcam, using gravity as the ruler: no mat, no force plate, no calibration. Built for PE classes with no equipment budget.

### About the project

#### What it does

A PE teacher opens Saltara on the classroom laptop and points the camera at an empty wall. A student stands still for half a second and jumps; about a second after landing the height appears in centimetres, with the arc the hip drew in the air and the scale gravity gave (for example "scale from gravity: 416 px/m"). Three estimates sit side by side: frame counting, parabola flight time (the reported number) and standing hip to apex. The class list keeps three attempts per student, marks the best one and downloads as a CSV. The home page walks one seeded jump (j-02 from class 9B) through the method in five chapters, and the first screen lets you pull a sun dot along that jump's fitted parabola while a sentence reads the hip height at that instant.

#### How we built it

Next.js 15 and React 19 on Vercel. MediaPipe Pose Landmarker (lite, `@mediapipe/tasks-vision` 0.10.21) tracks hips and ankles in the browser, and the browser's per-frame callback (rVFC) timestamps every frame. A plain TypeScript solver fits y = at² + bt + c to the airborne hip heights by least squares; because a = (g/2) × s, the curvature gives the pixels-per-metre scale s with nothing in the frame to calibrate against. The class list lives in the browser's localStorage. Interactions use `@react-spring/web` and `@use-gesture/react`: a throwable deck of the seeded jumps, a cm figure that springs past its value and settles, and the pointer pull on the hero arc. The 12 demo jumps of class 9B are seeded synthetic traces with webcam-like jitter, and the same solver runs on them.

#### Challenges

A 30 fps webcam only knows take-off and landing to within 33 ms, which moves a frame-counted height by several centimetres. Fitting the parabola and taking its roots between frames removes most of that wobble. Landmark jitter can bend the curvature, so every jump is gated on airborne frame count, fit R² and visible feet, and rejected with a plain reason when it fails.

#### Accomplishments that we're proud of

On the 12 seeded jumps the solver recovers the true rise with a mean absolute error of 0.48 cm, and it solves a jump in well under a millisecond. Everything runs in the browser: no account, no server receiving camera frames, no API key.

#### What we learned

Gravity is a free, always-present calibration object. The hard part is not the physics but deciding which frames are truly airborne on a cheap camera.

#### What's next

Run the wall-mark pilot (2 jumpers, at least 20 jumps, chalk jump-and-reach and tape against the three estimates) and replace the 22 placeholder rows on `/notes` with the measured Bland-Altman results. Then tune the gates on real gym footage and add term-long tracking for a class.

### Built with

next, react, react-dom, typescript, tailwindcss, @mediapipe/tasks-vision, @react-spring/web, @use-gesture/react, zod, vitest, tsx, lucide-react, @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge

### Try it out links

- https://saltara.vercel.app
- https://github.com/mericcintosun/saltara

### Categories

- `Grand Prix (1st Place)`: automatic, nothing to tick.
- `Excellence in Social Impact Award`: if the Devpost form shows a category checkbox or tag for this award, tick it.
- `Excellence in Research Award`: if the Devpost form shows a category checkbox or tag for this award, tick it.
- `Excellence in Innovation Award`: if the Devpost form shows a category checkbox or tag for this award, tick it.

## Discord Google Form

### Project title

Saltara

### One-paragraph summary

Saltara measures a vertical jump in centimetres from an ordinary laptop webcam, using gravity as the ruler. While a jumper is in the air the hip follows a parabola whose curvature must equal half of g, so fitting that curve gives the pixels-per-metre scale with no mat, force plate, tape measure or calibration. A PE teacher points the laptop at an empty wall, each student jumps three times, the height appears about a second after landing, and the class list downloads as a CSV. Everything runs in the browser. The demo lesson (12 jumps from class 9B) is seeded and labelled as such, and the wall-mark validation pilot on the notes page is labelled placeholder; our own session will replace it.

### Public project link

https://saltara.vercel.app
