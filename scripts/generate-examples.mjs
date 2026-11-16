// Capture the actual game renderer with deterministic frame timing, then encode silent MP4s.
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "public/assets/examples");
await mkdir(out, { recursive: true });
const server = await createServer({
  root,
  server: { port: 5175, host: "127.0.0.1", strictPort: true },
});
await server.listen();
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
    (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  for (const role of ["Builder", "Army", "Runner"]) {
    const page = await browser.newPage({
      viewport: { width: 720, height: 540 },
      deviceScaleFactor: 1,
    });
    page.on("pageerror", (e) => {
      throw e;
    });
    await page.clock.install();
    await page.goto("http://127.0.0.1:5175/scripts/examples.html");
    await page.waitForFunction(() => window.__example);
    await page.evaluate((role) => window.__example.reset(role), role);
    await page.waitForTimeout(2000);
    await page.clock.pauseAt(
      new Date(await page.evaluate(() => Date.now() + 1000)),
    );
    const encoder = spawn(
      "ffmpeg",
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "image2pipe",
        "-framerate",
        "20",
        "-vcodec",
        "mjpeg",
        "-i",
        "pipe:0",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "24",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        resolve(out, `${role.toLowerCase()}.mp4`),
      ],
      { stdio: ["pipe", "ignore", "inherit"] },
    );
    const finished = once(encoder, "close");
    const timing =
      role === "Builder"
        ? [20, 38, 56, 80]
        : role === "Army"
          ? [28, 52]
          : [24, 52, 80, 108];
    for (let frame = 0; frame < 160; frame++) {
      const action = timing.indexOf(frame);
      if (action >= 0)
        await page.evaluate((n) => window.__example.step(n), action + 1);
      await page.clock.runFor(50);
      const jpg = await page.screenshot({ type: "jpeg", quality: 90 });
      if (!encoder.stdin.write(jpg)) await once(encoder.stdin, "drain");
      if (frame === 140)
        await writeFile(resolve(out, `${role.toLowerCase()}.jpg`), jpg);
      if (frame % 40 === 0) console.log(`${role}: frame ${frame}/160`);
    }
    encoder.stdin.end();
    const [code] = await finished;
    if (code !== 0) throw new Error(`FFmpeg failed: ${code}`);
    await page.close();
    console.log(`Saved ${role} example.`);
  }
} finally {
  await browser.close();
  await server.close();
}
