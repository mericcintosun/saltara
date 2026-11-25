// npm run proof: measures what the README claims and rewrites three blocks in
// README.md (solver, tests, engine). It writes nothing else, never throws, and
// prints one summary line per proof. Each missing tool writes a
// "Not run in this build:" line instead of a number.

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PROOF_FETCH_TIMEOUT_MS } from "../lib/config";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const README = join(ROOT, "README.md");
const VITEST_TIMEOUT_MS = 90_000;

type Block = { name: "solver" | "tests" | "engine"; body: string; summary: string };

function notRun(reason: string): string {
  return `Not run in this build: ${reason}.`;
}

function errText(e: unknown): string {
  if (e instanceof Error) return e.message.split("\n")[0].slice(0, 160);
  return String(e).slice(0, 160);
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 1. Solver on the 12 seeded jumps.
async function proveSolver(): Promise<Block> {
  try {
    const { traceFor } = await import("../lib/data/trace");
    const { analyzeJump } = await import("../lib/jump-solver");
    const fixture = JSON.parse(readFileSync(join(ROOT, "fixtures", "lesson-9b.json"), "utf8")) as {
      lesson: { className: string };
      seedJumps: Parameters<typeof traceFor>[0][];
    };
    const jumps = fixture.seedJumps;
    if (!Array.isArray(jumps) || jumps.length === 0) {
      const body = notRun("fixtures/lesson-9b.json has no seed jumps");
      return { name: "solver", body, summary: body };
    }

    const rows: string[] = [];
    const errors: number[] = [];
    const latencies: number[] = [];
    const info = console.info;
    console.info = () => undefined; // keep the [core] trace out of the proof output
    try {
      for (const j of jumps) {
        const samples = traceFor(j);
        const t0 = performance.now();
        const r = analyzeJump(samples);
        const ms = performance.now() - t0;
        latencies.push(ms);
        const trueCm = j.riseM * 100;
        const head = r.estimates?.flightTimeCm ?? null;
        if (r.ok && head !== null) errors.push(Math.abs(head - trueCm));
        rows.push(
          `| ${j.id} | ${trueCm.toFixed(1)} | ${head === null ? `rejected (${r.code ?? "unknown"})` : head.toFixed(1)} | ${
            head === null ? "n/a" : (head - trueCm).toFixed(1)
          } | ${j.pxPerMetre} | ${r.pxPerMetre === null ? "n/a" : Math.round(r.pxPerMetre)} | ${ms.toFixed(2)} |`
        );
      }
    } finally {
      console.info = info;
    }

    const mae = errors.length ? errors.reduce((s, x) => s + x, 0) / errors.length : Number.NaN;
    const med = median(latencies);
    const body = [
      `Sample data: the ${jumps.length} seeded jumps of ${fixture.lesson.className} (synthetic traces rebuilt by \`traceFor\`), solved by \`analyzeJump\` in Node.`,
      "",
      "| id | true rise cm | headline cm | error cm | true px/m | gravity px/m | ms |",
      "| --- | --- | --- | --- | --- | --- | --- |",
      ...rows,
      "",
      errors.length
        ? `Mean absolute error: ${mae.toFixed(2)} cm over ${errors.length} solved jumps (${jumps.length - errors.length} rejected). Median solver latency: ${med.toFixed(2)} ms.`
        : `No seeded jump was solved. Median solver latency: ${med.toFixed(2)} ms.`,
    ].join("\n");
    const summary = errors.length
      ? `solver: ${errors.length}/${jumps.length} solved, MAE ${mae.toFixed(2)} cm, median ${med.toFixed(2)} ms`
      : `solver: 0/${jumps.length} solved`;
    return { name: "solver", body, summary };
  } catch (e) {
    const body = notRun(`the solver could not be loaded (${errText(e)})`);
    return { name: "solver", body, summary: `solver: ${body}` };
  }
}

// 2. Vitest.
function proveTests(): Block {
  try {
    const run = spawnSync("npx", ["vitest", "run", "--reporter=json", "--silent"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: VITEST_TIMEOUT_MS,
      shell: process.platform === "win32",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (run.error) {
      const body = notRun(`vitest could not start (${errText(run.error)})`);
      return { name: "tests", body, summary: `tests: ${body}` };
    }
    const out = run.stdout ?? "";
    const start = out.indexOf("{");
    const end = out.lastIndexOf("}");
    let parsed: { numPassedTests?: number; numFailedTests?: number; numTotalTests?: number } | null = null;
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(out.slice(start, end + 1));
      } catch {
        parsed = null;
      }
    }
    if (!parsed || typeof parsed.numPassedTests !== "number") {
      const reason = run.signal ? `stopped by ${run.signal}` : `no JSON report, exit code ${run.status ?? "none"}`;
      const body = notRun(`vitest could not start (${reason})`);
      return { name: "tests", body, summary: `tests: ${body}` };
    }
    const passed = parsed.numPassedTests;
    const failed = parsed.numFailedTests ?? 0;
    const total = parsed.numTotalTests ?? passed + failed;
    const body = `\`npx vitest run\` on \`tests/\`: ${passed} passed, ${failed} failed, ${total} total.`;
    return { name: "tests", body, summary: `tests: ${passed} passed, ${failed} failed` };
  } catch (e) {
    const body = notRun(`vitest could not start (${errText(e)})`);
    return { name: "tests", body, summary: `tests: ${body}` };
  }
}

// 3. Engine URLs (WASM runtime and pose model) answer a HEAD request.
type Probe = { url: string; status: number | null; ms: number; error: string | null };

async function head(url: string): Promise<Probe> {
  let last: Probe = { url, status: null, ms: 0, error: "not tried" };
  for (let attempt = 0; attempt < 2; attempt++) {
    const t0 = performance.now();
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(PROOF_FETCH_TIMEOUT_MS) });
      last = { url, status: res.status, ms: performance.now() - t0, error: null };
      if (res.status < 500) return last;
    } catch (e) {
      last = { url, status: null, ms: performance.now() - t0, error: errText(e) };
    }
  }
  return last;
}

async function proveEngine(): Promise<Block> {
  try {
    const src = readFileSync(join(ROOT, "lib", "pose-tracker.ts"), "utf8");
    const urls = [...new Set(src.match(/https:\/\/[^\s"'`]+/g) ?? [])];
    if (urls.length === 0) {
      const body = notRun("no https URL found in lib/pose-tracker.ts");
      return { name: "engine", body, summary: `engine: ${body}` };
    }
    const probes = await Promise.all(urls.map(head));
    if (probes.every((p) => p.status === null)) {
      const body = notRun("no network access");
      return { name: "engine", body, summary: `engine: ${body} (${probes[0]?.error ?? "unknown"})` };
    }
    const body = [
      "HEAD requests from the proof run to the URLs in `lib/pose-tracker.ts`:",
      "",
      "| url | status | ms |",
      "| --- | --- | --- |",
      ...probes.map((p) => `| ${p.url} | ${p.status ?? `failed (${p.error ?? "unknown"})`} | ${Math.round(p.ms)} |`),
    ].join("\n");
    const summary = `engine: ${probes.map((p) => `${p.status ?? "failed"} in ${Math.round(p.ms)} ms`).join(", ")}`;
    return { name: "engine", body, summary };
  } catch (e) {
    const body = notRun(`the engine check could not run (${errText(e)})`);
    return { name: "engine", body, summary: `engine: ${body}` };
  }
}

function replaceBlock(text: string, name: string, body: string): { text: string; found: boolean } {
  const begin = `<!-- PROOF:BEGIN ${name} -->`;
  const end = `<!-- PROOF:END ${name} -->`;
  const i = text.indexOf(begin);
  const k = text.indexOf(end);
  if (i < 0 || k < i) return { text, found: false };
  return { text: `${text.slice(0, i + begin.length)}\n${body}\n${text.slice(k)}`, found: true };
}

async function main(): Promise<void> {
  const solver = await proveSolver();
  console.log(solver.summary);
  const engine = await proveEngine();
  const tests = proveTests();
  console.log(tests.summary);
  console.log(engine.summary);

  try {
    let text = readFileSync(README, "utf8");
    for (const b of [solver, tests, engine]) {
      const r = replaceBlock(text, b.name, b.body);
      if (!r.found) console.log(`readme: markers for ${b.name} not found, block left as is`);
      text = r.text;
    }
    writeFileSync(README, text);
    console.log("readme: proof blocks rewritten");
  } catch (e) {
    console.log(`readme: not written (${errText(e)})`);
  }
}

main().catch((e) => {
  console.log(`proof: stopped early (${errText(e)})`);
});
