# Security: Saltara

Saltara is a static Next.js site that runs the whole measurement in the browser. There is no account, no wallet, no database and no server that receives video.

## Contract addresses and chain id

None. Saltara has no smart contract and uses no chain.

## Wallet permissions requested

None. Saltara never asks for a wallet connection or a signature.

The only browser permission is the camera, requested when the user clicks "Start camera" on `/play`. While the live camera runs during class mode, Saltara also asks for a Screen Wake Lock so the laptop does not sleep; if the browser refuses, the lesson continues without it.

## Approvals and spenders

None. There are no tokens, approvals or spenders.

## Source

https://github.com/mericcintosun/saltara

## Data handling

- **Video:** camera frames and loaded clips are processed in the browser by MediaPipe Pose Landmarker. No frame and no file is uploaded; no server receives video.
- **Class list:** student names and attempts are stored only in this browser's localStorage under the key `saltara.class.v2:<seed version>`, where the seed version is a hash of the seeded lesson fixture. "Restore demo class" or `/play?reset=demo` removes every `saltara.class.*` key.
- **Third-party hosts:** the pose engine downloads its WASM runtime from `cdn.jsdelivr.net` and the pose model from `storage.googleapis.com`. Those hosts see an ordinary file request from the browser, nothing else.
- **Server routes:** `/api/lesson` and `/api/pilot` are read-only `GET` handlers that return the seeded fixtures and take no user input.
- **Secrets:** none. The only public build variable is `NEXT_PUBLIC_BRAND_FILES`, a list of image file names.

## Reporting a problem

Open an issue on the source repository above.
