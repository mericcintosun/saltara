// Validates and normalises the seed fixtures. Idempotent: it sorts records by id and
// writes each file as JSON.stringify(x, null, 2) + "\n", so a second run is a no-op.
// No clock, no randomness, no network.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const LESSON = join(root, "fixtures", "lesson-9b.json");
const PILOT = join(root, "fixtures", "pilot-placeholder.json");
const REAL_PILOT = join(root, "fixtures", "pilot.json");

const errors = [];
const fail = (msg) => errors.push(msg);

function read(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`seed: cannot read ${file}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const inRange = (v, lo, hi) => isNum(v) && v >= lo && v <= hi;

function checkUnique(list, pattern, label) {
  const seen = new Set();
  for (const x of list) {
    if (typeof x.id !== "string" || !pattern.test(x.id)) fail(`${label}: bad id ${JSON.stringify(x.id)}`);
    if (seen.has(x.id)) fail(`${label}: duplicate id ${x.id}`);
    seen.add(x.id);
  }
  return seen;
}

// Lesson 9B
const lesson = read(LESSON);
if (!lesson.lesson || typeof lesson.lesson.className !== "string") fail("lesson-9b: missing lesson.className");
if (!Array.isArray(lesson.students) || !Array.isArray(lesson.seedJumps)) {
  fail("lesson-9b: students and seedJumps must be arrays");
} else {
  const studentIds = checkUnique(lesson.students, /^s-[a-z]+$/, "lesson-9b students");
  checkUnique(lesson.seedJumps, /^j-\d{2}$/, "lesson-9b seedJumps");
  for (const j of lesson.seedJumps) {
    if (!studentIds.has(j.studentId)) fail(`${j.id}: unknown studentId ${j.studentId}`);
    if (![1, 2, 3].includes(j.attempt)) fail(`${j.id}: attempt must be 1, 2 or 3`);
    if (![25, 30].includes(j.fps)) fail(`${j.id}: fps must be 25 or 30`);
    if (!inRange(j.pxPerMetre, 100, 2000)) fail(`${j.id}: pxPerMetre out of range`);
    if (!inRange(j.standingHipY, 0, 720)) fail(`${j.id}: standingHipY out of range`);
    if (!inRange(j.riseM, 0.05, 1.2)) fail(`${j.id}: riseM out of range`);
    if (!inRange(j.noisePx, 0, 10)) fail(`${j.id}: noisePx out of range`);
  }
  lesson.seedJumps.sort(byId);
}

// Pilot rows: the same checks for the placeholder and for the real slot.
function checkPilotRows(file, rows) {
  if (!Array.isArray(rows)) {
    fail(`${file}: rows must be an array`);
    return;
  }
  checkUnique(rows, /^p-\d{2}$/, `${file} rows`);
  for (const r of rows) {
    if (r.jumper !== "P1" && r.jumper !== "P2") fail(`${file} ${r.id}: jumper must be P1 or P2`);
    for (const k of ["wallCm", "frameCountCm", "flightTimeCm", "displacementCm"]) {
      if (!inRange(r[k], 0, 150)) fail(`${file} ${r.id}: ${k} out of range`);
    }
  }
  rows.sort(byId);
}

const pilot = read(PILOT);
if (typeof pilot.placeholder !== "boolean") fail("pilot: placeholder must be a boolean");
checkPilotRows("pilot-placeholder", pilot.rows);

// Real pilot slot (filled by the human wall-mark session).
const realPilot = read(REAL_PILOT);
checkPilotRows("pilot", realPilot.rows);

if (errors.length) {
  console.error(`seed: ${errors.length} problem(s) in fixtures/`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}

writeFileSync(LESSON, JSON.stringify(lesson, null, 2) + "\n");
writeFileSync(PILOT, JSON.stringify(pilot, null, 2) + "\n");
writeFileSync(REAL_PILOT, JSON.stringify(realPilot, null, 2) + "\n");
console.log(
  `seed: ok, ${lesson.students.length} students, ${lesson.seedJumps.length} jumps, ${pilot.rows.length} pilot rows (placeholder: ${pilot.placeholder}), ${realPilot.rows.length} real pilot rows`
);
