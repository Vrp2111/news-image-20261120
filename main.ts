// THE WORLD BEACON — news-image-20261120
//
// Delivery program for the front-page image of Friday 20 November 2026.
// The image itself (entry.png, shipped in this repository) was rendered in
// the build session from the day's verified news: Cyclone Akvan's landfall
// in Odisha, COP31's final day without a deal in Antalya, the overnight
// missile strikes on Kyiv, Asia's market plunge, and 35 more stories from
// six continents. This program does not draw anything and needs no network:
// it checks the shipped image against the competition gate and copies it,
// byte for byte, to the grader's output directory.
//
// Every run must produce the identical file: same bytes in, same bytes out.
// Anything unexpected fails loudly instead of shipping a wrong image.
import { copyFileSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// Competition gate: one image, at most 1 MiB, exactly 1024 by 1024 pixels.
const BYTE_LIMIT = 1024 * 1024;
const SIDE = 1024;

// SHA-256 of the approved image (v01, 381,745 bytes, rendered in the build
// session and verified against the coordinator's pick). Pinning it here means
// a corrupted or swapped entry.png can never slip through silently.
const APPROVED_SHA256 =
  "7f7ccd58bdbf016aa6b47d0d8ecb7c327fe877bc017f8c43f634492286d2435f";

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// Resolve paths from this file's own directory, never from the working
// directory: the grader runs the program from a read-only checkout.
const here: string = dirname(fileURLToPath(import.meta.url));
const imagePath: string = join(here, "entry.png");

// The grader provides a writable /output. A local run can point the same
// variable at any empty directory instead.
const outDir: string = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const outPath: string = join(outDir, "entry.png");

function loadAndCheck(path: string): Buffer {
  const bytes: Buffer = readFileSync(path);

  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("entry.png is not a PNG image");
  }
  const width: number = bytes.readUInt32BE(16);
  const height: number = bytes.readUInt32BE(20);
  if (width !== SIDE || height !== SIDE) {
    throw new Error(`entry.png is ${width}x${height}, expected ${SIDE}x${SIDE}`);
  }
  if (bytes.length > BYTE_LIMIT) {
    throw new Error(`entry.png is ${bytes.length} bytes, over the 1 MiB limit`);
  }
  return bytes;
}

const image: Buffer = loadAndCheck(imagePath);

if (sha256(image) !== APPROVED_SHA256) {
  throw new Error("entry.png does not match the approved image hash");
}

mkdirSync(outDir, { recursive: true });
copyFileSync(imagePath, outPath);

const writtenSize: number = statSync(outPath).size;
if (writtenSize !== image.length) {
  throw new Error(`wrote ${writtenSize} bytes but entry.png is ${image.length} bytes`);
}

// Prove the copy is exact, not just the right size: re-read the output and
// compare it byte for byte with the source. The grader runs this program
// twice and compares the two runs, so any silent corruption here must fail
// loudly instead of shipping a wrong image.
const writtenBytes: Buffer = readFileSync(outPath);
if (!writtenBytes.equals(image) || sha256(writtenBytes) !== APPROVED_SHA256) {
  throw new Error("output bytes differ from the approved entry.png");
}

console.log(`wrote ${outPath}: ${SIDE}x${SIDE} PNG ${writtenSize} bytes`);
