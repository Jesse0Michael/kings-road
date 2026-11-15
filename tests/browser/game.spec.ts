import { createGame } from "../../src/game/engine";
import { test, expect } from "@playwright/test";
test("new game, 3D scene, movement, reload, rules, and mobile", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Every road/ })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("home.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Take your seat as Runner" }).click();
  await page.getByLabel("Fast computer turns").check();
  await expect(page.getByRole("button", { name: "Roll the dice" })).toBeVisible(
    { timeout: 20000 },
  );
  await page.getByRole("button", { name: "Roll the dice" }).click();
  await expect(
    page.getByRole("button", { name: "End movement" }),
  ).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kings-road.game.v1")!),
  );
  expect(state.turn).toBe("Runner");
  expect(
    state.walls.reduce((a: number, b: number) => a + b, 0),
  ).toBeGreaterThan(0);
  expect(state.units.length).toBeGreaterThan(0);
  await page.screenshot({
    path: testInfo.outputPath("game.png"),
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: /Continue Runner game/ }).click();
  await expect(
    page.getByRole("button", { name: "End movement" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(
    page.getByRole("heading", { name: "The rules of the road." }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Return to the table" }).click();
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("human Builder can build and human Army can deploy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Builder 3/ }).click();
  await page.getByRole("button", { name: "Take your seat as Builder" }).click();
  await page.getByRole("button", { name: "Roll the dice" }).click();
  await expect(page.locator(".roads")).toBeVisible();
  const budget = await page.evaluate(
    () => JSON.parse(localStorage.getItem("kings-road.game.v1")!).budget,
  );
  for (let i = 0; i < budget; i++)
    await page.locator(".roads button").first().click();
  await page.getByRole("button", { name: /KING’S ROAD/ }).click();
  await page.getByRole("button", { name: /Army 2/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Take your seat as Army" }).click();
  await page.getByLabel("Fast computer turns").check();
  await expect(page.getByRole("button", { name: "Roll the dice" })).toBeVisible(
    { timeout: 15000 },
  );
  await page.getByRole("button", { name: "Roll the dice" }).click();
  await expect(page.locator(".locations")).toBeVisible();
  await page.locator(".locations button").nth(1).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("kings-road.game.v1")!).units.length,
    ),
  ).toBe(1);
});

test("imports a game, wins, records history once, and exports", async ({
  page,
}) => {
  const g = createGame("Runner", 123);
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 2;
  g.scores.Runner = 14;
  await page.goto("/");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "save.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(g)),
    });
  await page.locator(".locations button").nth(1).click();
  await expect(
    page.getByRole("heading", { name: "Runner prevails" }),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export save/ }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(
    "kings-road-save.json",
  );
  await page.getByRole("button", { name: "Chronicle" }).click();
  await expect(
    page.getByRole("heading", { name: "Runner prevailed" }),
  ).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Chronicle" }).click();
  await expect(
    page.getByRole("heading", { name: "Runner prevailed" }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /KING’S ROAD/ }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":999}'),
    });
  await expect(page.getByRole("alert")).toContainText("not a valid");
});
