// Export the approved Carved Seal artwork. Requires ImageMagick 7 for development only.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "assets/brand/carved-seal-master.png");
const out = resolve(root, "public/icons");
mkdirSync(out, { recursive: true });
function magick(args) {
  const result = spawnSync("magick", args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("Icon export failed");
}

const exports = [
  [16, "favicon-16x16.png"],
  [32, "favicon-32x32.png"],
  [48, "favicon-48x48.png"],
  [96, "favicon-96x96.png"],
  [180, "apple-touch-icon.png"],
  [192, "icon-192.png"],
  [512, "icon-512.png"],
];
for (const [size, name] of exports) {
  magick([
    source,
    "-colorspace",
    "sRGB",
    "-filter",
    "Lanczos",
    "-resize",
    `${size}x${size}`,
    "-alpha",
    "off",
    "-strip",
    "-define",
    "png:compression-level=9",
    resolve(out, name),
  ]);
}
// Extra export padding keeps the five nodes inside Android's 80% circular safe area.
magick([
  source,
  "-colorspace",
  "sRGB",
  "-filter",
  "Lanczos",
  "-resize",
  "460x460",
  "-background",
  "#211713",
  "-gravity",
  "center",
  "-extent",
  "512x512",
  "-alpha",
  "off",
  "-strip",
  "-define",
  "png:compression-level=9",
  resolve(out, "icon-maskable-512.png"),
]);
magick([
  ...[16, 32, 48].map((size) => resolve(out, `favicon-${size}x${size}.png`)),
  resolve(root, "public/favicon.ico"),
]);
console.log(
  "Exported Carved Seal: ICO, 16/32/48/96px PNGs, Apple 180px, app 192/512px, maskable 512px.",
);
