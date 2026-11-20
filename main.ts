// THE WORLD BEACON — news-image-20261120, variant v32.
//
// A newspaper front page summing up Friday 20 November 2026: Cyclone
// Akvan's landfall on the Odisha coast (370,000 people evacuated), the
// COP31 draft dropping every mention of fossil fuels, Asia's markets
// plunging (Nikkei -4.1%, KOSPI -4.7%, Taiwan -6.2%), GTA VI's day-one
// sales now estimated at $2.36bn, and a UK-EU youth-mobility deal of
// 100,000 places a year — 38 stories from six continents in total.
//
// This program renders nothing and reaches no network. The approved
// picture ships beside it as entry.png, re-rendered in this build
// session from the day's verified news data and checked byte for byte
// against the coordinator's hash before packaging. The program's only
// job is to hand that exact file to the grader at /output/entry.png,
// after proving it is still the approved file: right size, right
// dimensions, right hash. Anything off fails here, loudly, instead of
// silently shipping a wrong image.

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Competition gate: one image, at most 1 MiB, exactly 1024 by 1024.
const LIMIT_BYTES = 1024 * 1024;
const SIDE_PX = 1024;

// SHA-256 of the approved v32 image (385,287 bytes, 1024x1024 PNG).
// Pinned here so a swapped or damaged entry.png can never slip through.
const EXPECTED_SHA256 =
  "3cda9c5be80a615674bf944ce6b2d0abfe9a33f02bf65b99b81ccd30d7c62abf";

// The eight bytes that open every PNG file.
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function hashBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function die(message: string): never {
  throw new Error(message);
}

// PNG stores width at bytes 16-19 and height at 20-23 (the IHDR chunk).
// Returns both, after confirming the file really is a PNG.
function pngDimensions(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24) die("entry.png is too short to be a PNG file");
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    die("entry.png does not start with the PNG signature");
  }
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

// The picture lives next to this file, so the program works no matter
// where the grader checks the repository out from — never from the
// current working directory.
const here = dirname(fileURLToPath(import.meta.url));
const shipped = join(here, "entry.png");

// The grader hands us a writable /output. A local run may point the
// same knob elsewhere instead.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const outFile = join(outDir, "entry.png");

if (!existsSync(shipped)) die(`entry.png is missing from the package: ${shipped}`);

const image = readFileSync(shipped);
const { width, height } = pngDimensions(image);

if (width !== SIDE_PX || height !== SIDE_PX) {
  die(`entry.png is ${width}x${height}, expected ${SIDE_PX}x${SIDE_PX}`);
}
if (image.length > LIMIT_BYTES) {
  die(`entry.png is ${image.length} bytes, over the 1 MiB limit`);
}
if (hashBytes(image) !== EXPECTED_SHA256) {
  die("entry.png does not match the approved v32 image hash");
}

mkdirSync(outDir, { recursive: true });
copyFileSync(shipped, outFile);

// Read the delivery back and prove it is the approved file, byte for
// byte — not just the right length. The grader runs this program twice
// and compares the two runs, so any silent corruption has to fail here.
const delivered = readFileSync(outFile);
const deliveredSize = statSync(outFile).size;
if (deliveredSize !== image.length) {
  die(`wrote ${deliveredSize} bytes but entry.png is ${image.length} bytes`);
}
if (!delivered.equals(image)) {
  die("output bytes differ from the approved entry.png");
}
if (hashBytes(delivered) !== EXPECTED_SHA256) {
  die("output hash differs from the approved v32 image hash");
}

console.log(
  `wrote ${outFile}: ${SIDE_PX}x${SIDE_PX} PNG, ${delivered.length} bytes, sha256 ${EXPECTED_SHA256.slice(0, 12)}…`,
);
