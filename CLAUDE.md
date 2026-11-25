# CLAUDE.md: Saltara

Read `IDENTITY.md` first (it overrides taste), then `HANDOFF.md` and `DEMO.md`.

## Commands

- `npm install`
- `npm run dev` (http://localhost:3000, camera needs HTTPS or localhost)
- `npm run build`
- `npm run seed` (validates and normalises `fixtures/*.json`, idempotent)

## Data path

`fixtures/*.json` → `lib/data/seed.ts` → `lib/adapter.ts` (`ADAPTER_MODE`, default `fake`) → page → client component. `/api/lesson` and `/api/pilot` mirror the same payloads. Pages call the adapter directly; never fetch your own `/api` from a server component.

## Stack pitfalls

- The MediaPipe WASM URL version in `lib/pose-tracker.ts` must equal `@mediapipe/tasks-vision` `0.10.21` in package.json.
- Import MediaPipe only via `loadPoseLandmarker()`.
- Kit imports (`@react-spring/web`, `@use-gesture/react`) go only in `"use client"` files.
- `traceFor()` in `lib/data/trace.ts` must stay byte-identical (same PRNG, same fixture values).

## Never touch

`components/ui/*`, `public/`, `app/icon.svg`, `lib/pose-tracker.ts`, `node_modules/`, `.next/`, `.farm-*` files (except `.farm-commits.json`).

## Vercel guardrails

- No runtime filesystem writes in app code.
- `useSearchParams` only under `Suspense`.
- No Node-only APIs in edge paths; route handlers stay on the default Node runtime.
- No custom server and no `output: export`.
- Every `process.env.X` is mirrored in `.env.example`.

## Copy rules

- English. No em dash, no en dash, no double hyphen used as a dash: use a comma, period, colon or parentheses.
- Banned words: seamless, seamlessly, leverage, empower, revolutionize, streamline, game-changer, cutting-edge, delve, robust, unlock, elevate, harness, effortless, "in today's world", "it's not just X, it's Y".
- Seeded data is always labelled as seeded.
- Stack claims match package.json: Next.js 15, `@mediapipe/tasks-vision` 0.10.21, react-spring 10, use-gesture 10, Tailwind v4.

## Compaction

when compacting preserve the list of modified files and test commands
