// The only mirror of the IDENTITY.md tokens in app/globals.css, for contexts that
// cannot read CSS variables (ImageResponse in app/opengraph-image.tsx). Keep it in
// step with globals.css; components use the CSS tokens, never these values.
export const brandHex = {
  ground: "#f7f9f1",
  surface: "#edf2e2",
  deep: "#e1ead1",
  line: "#cfdbbb",
  ink: "#22301c",
  plum: "#7c3aa3",
  onPlum: "#f7f9f1",
  sun: "#e8b73a",
  ok: "#2e7d4f",
  warn: "#a8641c",
  bad: "#b3382c",
} as const;
