import { test, expect } from "@playwright/test";

test("role previews and the visual rules teach without modifying a saved game", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (
      response.url().includes("/assets/examples/") &&
      response.status() >= 400
    )
      failed.push(response.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Builder 3/ }).click();
  await expect(page.getByRole("button", { name: /Builder 3/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const builder = page.getByLabel("Builder gameplay example");
  await expect
    .poll(() => builder.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  expect(
    await builder.evaluate(
      (v: HTMLVideoElement) => v.muted && v.loop && v.playsInline,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Pause Builder example" }).click();
  await expect
    .poll(() => builder.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("welcome-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Army 2/ }).click();
  await expect(page.getByLabel("Army gameplay example")).toBeVisible();
  await page.getByRole("button", { name: "How to play", exact: true }).click();
  await expect(page.locator("video")).toHaveCount(3);
  await expect(page.locator("canvas")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Coins mean points." }),
  ).toBeVisible();
  await expect(page.locator(".learn-details")).toContainText(
    "I → II → I → II earns just 1 point.",
  );
  await expect
    .poll(() => builder.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath("rules-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const runner = page.getByLabel("Runner gameplay example");
  await runner.scrollIntoViewIfNeeded();
  await expect
    .poll(() => builder.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await expect
    .poll(() => runner.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath("rules-mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem("kings-road.game.v1")),
  ).toBeNull();
  await page
    .getByRole("button", { name: "Return to the tavern", exact: false })
    .click();
  await page.screenshot({
    path: testInfo.outputPath("welcome-mobile.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("reduced motion uses still examples and lets the player opt into playback", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const runner = page.getByLabel("Runner gameplay example");
  await expect(
    page.getByRole("button", { name: "Play Runner example" }),
  ).toBeVisible();
  expect(
    await runner.evaluate(
      (v: HTMLVideoElement) => v.paused && v.currentTime === 0,
    ),
  ).toBe(true);
  await expect(runner).toHaveAttribute("poster", /runner\.jpg$/);
  await page.getByRole("button", { name: "Play Runner example" }).click();
  await expect
    .poll(() => runner.evaluate((v: HTMLVideoElement) => v.currentTime))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause Runner example" }).click();
  await expect
    .poll(() => runner.evaluate((v: HTMLVideoElement) => v.paused))
    .toBe(true);
  await page.getByRole("button", { name: "How to play", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Play .* example$/ }),
  ).toHaveCount(3);
});
