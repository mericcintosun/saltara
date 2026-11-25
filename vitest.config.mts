import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// "@/x" resolves to the repo root, like the tsconfig path. The regex keeps scoped
// packages such as "@mediapipe/tasks-vision" untouched.
const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: root.endsWith("/") ? root : `${root}/` }],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
