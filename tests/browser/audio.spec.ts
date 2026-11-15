import { test, expect } from "@playwright/test";
import { createGame } from "../../src/game/engine";
import { resumeGame } from "./fixtures";

declare global {
  interface Window {
    __krAudio: {
      music: HTMLMediaElement | null;
      starts: {
        when: number;
        duration: number;
        offset: number;
        now: number;
        wallWhen: number;
      }[];
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__krAudio = { music: null, starts: [] };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes("tavern-dance.mp3")) window.__krAudio.music = this;
      return play.call(this);
    };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (
      when = 0,
      offset = 0,
      duration?: number,
    ) {
      window.__krAudio.starts.push({
        when,
        offset,
        duration: this.buffer?.duration ?? 0,
        now: this.context.currentTime,
        wallWhen: performance.now() / 1000 + when - this.context.currentTime,
      });
      return start.call(this, when, offset, duration);
    };
  });
});

test("music loops after interaction; volumes, mute, hidden tabs and saved settings work", async ({
  page,
}, testInfo) => {
  const failed: string[] = [],
    errors: string[] = [],
    requests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("/assets/audio/") && r.status() >= 400)
      failed.push(r.url());
  });
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("/");
  expect(requests.some((u) => u.includes("/assets/audio/"))).toBe(false);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const music = page.getByRole("slider", { name: "Music volume", exact: true });
  const effects = page.getByRole("slider", {
    name: "Sound effects volume",
    exact: true,
  });
  await expect(music).toHaveValue("20");
  await expect(effects).toHaveValue("40");
  await expect
    .poll(() => page.evaluate(() => window.__krAudio.music?.paused))
    .toBe(false);
  await expect
    .poll(() => page.evaluate(() => window.__krAudio.music?.duration ?? 0))
    .toBeGreaterThan(180);
  expect(await page.evaluate(() => window.__krAudio.music!.loop)).toBe(true);
  await page.evaluate(() => {
    const m = window.__krAudio.music!;
    m.currentTime = m.duration - 0.08;
  });
  await expect
    .poll(() => page.evaluate(() => window.__krAudio.music!.currentTime))
    .toBeLessThan(2);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => window.__krAudio.music!.paused))
    .toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(() => page.evaluate(() => window.__krAudio.music!.paused))
    .toBe(false);
  await music.focus();
  await music.press("Home");
  await effects.focus();
  await effects.press("Home");
  await expect(music).toHaveValue("0");
  await expect(effects).toHaveValue("0");
  await expect(page.getByRole("button", { name: "Test sound" })).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => window.__krAudio.music!.paused))
    .toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(music).toHaveValue("0");
  await expect(effects).toHaveValue("0");
  await effects.focus();
  await effects.press("ArrowRight");
  await page.getByRole("button", { name: "Test sound" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__krAudio.starts.length))
    .toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("audio-settings-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});

test("real decoded effects follow queued Runner movement and capture", async ({
  page,
}) => {
  const g = createGame("Runner", 17);
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 8;
  g.units = [{ id: 1, node: 2 }];
  g.nextId = 2;
  await resumeGame(page, g);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Test sound" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__krAudio.starts.length))
    .toBe(2);
  await page.getByRole("button", { name: /^Return to the table/ }).click();
  await expect(page.locator(".locations")).toBeVisible();
  await page.evaluate(() => {
    window.__krAudio.starts = [];
  });
  await page.locator(".locations button").nth(1).click();
  await page.locator(".locations button").nth(2).click();
  const starts = await page.evaluate(() => window.__krAudio.starts);
  const moves = starts.filter((s) => Math.abs(s.duration - 0.88) < 0.005);
  const capture = starts.find((s) => Math.abs(s.duration - 0.42) < 0.005)!;
  expect(moves).toHaveLength(2);
  // Compare presentation deadlines across dispatches; a headless audio clock can lag wall time.
  expect(moves[1].wallWhen - moves[0].wallWhen).toBeGreaterThan(0.65);
  expect(capture.when - moves[1].when).toBeGreaterThan(0.55);
  expect(starts.filter((s) => Math.abs(s.duration - 0.5) < 0.005)).toHaveLength(
    2,
  );
});
