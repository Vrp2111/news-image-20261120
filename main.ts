// THE WORLD BEACON — news-image-20261120, variant v12.
//
// Delivery program for the front page of Friday 20 November 2026. The
// picture itself (entry.png, shipped next to this file) was rendered in the
// build session from the day's verified news: Cyclone Akvan's landfall in
// Odisha, the COP31 draft dropping fossil fuels, Asia's market plunge, GTA
// VI's day-one sales now put at $2.36bn, and 40 more stories from six
// continents. This program draws nothing and touches no network. It checks
// the shipped image against the competition's gate, then hands it to the
// grader byte for byte, so every run writes exactly the same file.
//
// Anything that does not look like the approved image fails loudly here,
// before the grader ever sees it.
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// Gate from the competition kit: one image, at most 1 MiB, 1024 by 1024.
const MAX_IMAGE_BYTES = 1024 * 1024;
const IMAGE_SIDE = 1024;

// SHA-256 of the approved v12 image: 387,402 bytes, 1024x1024 PNG,
// re-rendered in this build session from data.json and matched against the
// coordinator's approved hash before packaging. Pinning it here means a
// swapped or corrupted entry.png can never reach the grader silently.
const APPROVED_IMAGE_SHA256 =
  "d830dcda32719ced78a7063d9d7d7890ace18f472a0903d0487812d932599218";

// The first eight bytes of every PNG file.
const PNG_MAGIC = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function fingerprint(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// PNG keeps its width and height in the IHDR chunk, bytes 16-23.
function pngSide(bytes: Buffer): { width: number; height: number } {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    throw new Error("entry.png is not a PNG file");
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

// Paths come from this file's own folder, never from the working directory:
// the grader runs the program from a read-only checkout of the repository.
const packageDir: string = dirname(fileURLToPath(import.meta.url));
const shippedImage: string = join(packageDir, "entry.png");

// The grader provides a writable /output. A local run can aim the same
// variable at any directory instead.
const destinationDir: string = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const destinationFile: string = join(destinationDir, "entry.png");

// Fail early with a named error if the image is missing from the package
// entirely, instead of a bare filesystem error from the read below.
if (!existsSync(shippedImage)) {
  throw new Error(`entry.png is missing from the package (${shippedImage})`);
}

const imageBytes: Buffer = readFileSync(shippedImage);
const { width, height } = pngSide(imageBytes);

if (width !== IMAGE_SIDE || height !== IMAGE_SIDE) {
  throw new Error(
    `entry.png is ${width}x${height}, expected ${IMAGE_SIDE}x${IMAGE_SIDE}`,
  );
}
if (imageBytes.length > MAX_IMAGE_BYTES) {
  throw new Error(
    `entry.png is ${imageBytes.length} bytes, over the 1 MiB limit`,
  );
}
if (fingerprint(imageBytes) !== APPROVED_IMAGE_SHA256) {
  throw new Error("entry.png does not match the approved v12 image hash");
}

mkdirSync(destinationDir, { recursive: true });
copyFileSync(shippedImage, destinationFile);

const deliveredBytes: number = statSync(destinationFile).size;
if (deliveredBytes !== imageBytes.length) {
  throw new Error(
    `wrote ${deliveredBytes} bytes but entry.png is ${imageBytes.length} bytes`,
  );
}

// Prove the delivery is exact, not just the right size: read the output
// back and compare it byte for byte, then hash it again. The grader runs
// this program twice and compares the two runs, so any silent corruption
// must fail here instead of shipping a wrong image.
const delivered: Buffer = readFileSync(destinationFile);
if (!delivered.equals(imageBytes)) {
  throw new Error("output bytes differ from the approved entry.png");
}
if (fingerprint(delivered) !== APPROVED_IMAGE_SHA256) {
  throw new Error("output hash differs from the approved v12 image hash");
}

console.log(
  `wrote ${destinationFile}: ${IMAGE_SIDE}x${IMAGE_SIDE} PNG ${deliveredBytes} bytes`,
);
