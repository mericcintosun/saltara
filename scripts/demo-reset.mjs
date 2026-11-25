// Prints the demo start state: the seed version the browser keys its class list by,
// the fixture counts, and the browser step that restores the demo class.
// Reads fixtures only and writes nothing besides stdout. No clock, no randomness.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(name) {
  const file = join(root, "fixtures", name);
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`demo-reset: cannot read ${file}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

/** FNV-1a 32-bit over UTF-16 code units, the same as fnv1a32 in lib/data/seed.ts. */
function fnv1a32(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

const lesson = read("lesson-9b.json");
const placeholder = read("pilot-placeholder.json");
const realPilot = read("pilot.json");

const seedVersion = fnv1a32(JSON.stringify(lesson));
const realRows = Array.isArray(realPilot.rows) ? realPilot.rows.length : 0;
const pilotSource = realRows >= 20 ? "real pilot (ADAPTER_MODE=real)" : "placeholder";

console.log(`demo-reset: seed version ${seedVersion}`);
console.log(`demo-reset: class key saltara.class.v2:${seedVersion}`);
console.log(
  `demo-reset: ${lesson.students.length} students, ${lesson.seedJumps.length} seeded jumps, ${placeholder.rows.length} placeholder pilot rows, ${realRows} real pilot rows (notes shows the ${pilotSource})`
);
console.log("demo-reset: no database and no contracts, so there is nothing to migrate or redeploy");
console.log("demo-reset: browser step: open /play?reset=demo");
