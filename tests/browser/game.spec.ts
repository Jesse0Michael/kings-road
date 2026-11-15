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
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Fast computer turns").check();
  await page.getByRole("button", { name: /^Return to the table/ }).click();
  await expect(
    page.getByRole("button", { name: "Roll", exact: true }),
  ).toBeVisible({ timeout: 45000 });
  await page.getByRole("button", { name: "Roll", exact: true }).click();
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
  const rail = page.getByLabel("Game scores");
  await expect(rail).toBeVisible();
  await expect(rail.locator(".score")).toHaveCount(3);
  const scoreBox = await rail.boundingBox(),
    boardBox = await page.locator("canvas").boundingBox();
  expect(scoreBox!.y + scoreBox!.height).toBeLessThanOrEqual(boardBox!.y);
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
  const mobileScore = await page.getByLabel("Game scores").boundingBox(),
    mobileBoard = await page.locator("canvas").boundingBox();
  expect(mobileScore!.y + mobileScore!.height).toBeLessThanOrEqual(
    mobileBoard!.y,
  );
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
  await page.getByRole("button", { name: "Roll", exact: true }).click();
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
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Fast computer turns").check();
  await page.getByRole("button", { name: /^Return to the table/ }).click();
  await expect(
    page.getByRole("button", { name: "Roll", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Roll", exact: true }).click();
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
  await page.locator("input[type=file]").setInputFiles({
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
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":999}'),
  });
  await expect(page.getByRole("alert")).toContainText("not a valid");
});

test("Runner scores a destination once per turn through the actual controls", async ({
  page,
}) => {
  const g = createGame("Runner", 123);
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 8;
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "runner.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(g)),
  });
  for (const n of [1, 0, 1, 0, 1])
    await page.locator(".locations button").nth(n).click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kings-road.game.v1")!),
  );
  expect(state.scores.Runner).toBe(2);
  expect(state.scored).toEqual([1, 0]);
  await expect(
    page.getByLabel("Game scores").locator(".score").nth(2),
  ).toContainText("2");
});

test("rapid placements remain enabled while pieces animate and Roll is on the board", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const g = createGame("Builder", 42);
  g.phase = "build";
  g.budget = 5;
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "builder.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(g)),
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.locator(".roads button").first().click();
  await expect(page.locator(".roads button").first()).toBeEnabled();
  await page.locator(".roads button").first().click();
  await page.locator(".roads button").nth(1).click();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kings-road.game.v1")!),
  );
  expect(state.walls.slice(0, 2)).toEqual([2, 1]);
  expect(state.budget).toBe(2);
  await page.clock.runFor(230);
  await page.screenshot({
    path: testInfo.outputPath("overlapping-placements.png"),
  });
  const rollGame = createGame("Runner", 19);
  rollGame.turn = "Runner";
  rollGame.phase = "roll";
  await page.locator("input[type=file]").setInputFiles({
    name: "roll.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(rollGame)),
  });
  const roll = page.getByRole("button", { name: "Roll", exact: true });
  expect(await roll.evaluate((e) => e.closest(".table-area") !== null)).toBe(
    true,
  );
  await roll.click();
  await expect(roll).toBeDisabled();
  // Keep this animation test on virtual time, including the roll's commit timer.
  await page.clock.fastForward(2100);
  await expect(page.getByLabel("Dice results")).toBeVisible();
  expect(errors).toEqual([]);
});

test("large road tap targets pick the intended edge; Army selections and mobile Roll work", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const g = createGame("Builder", 42);
  g.phase = "build";
  g.budget = 5;
  await page.locator("input[type=file]").setInputFiles({
    name: "builder.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(g)),
  });
  // Project a point 0.30 board-units beside the engraved road into canvas coordinates.
  const { PerspectiveCamera, Vector3 } = await import("three");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1200);
  const box = (await canvas.boundingBox())!;
  const cam = new PerspectiveCamera(42, box.width / box.height, 0.1, 1000);
  cam.position.set(0, 8.8, 9.1);
  cam.lookAt(0, 0, 0.15);
  cam.updateMatrixWorld();
  const ax = 0,
    az = -3.05,
    bx = Math.sin((Math.PI * 2) / 5) * 3.05,
    bz = -Math.cos((Math.PI * 2) / 5) * 3.05,
    len = Math.hypot(bx - ax, bz - az);
  const projected = new Vector3(
    (ax + bx) / 2 - ((bz - az) / len) * 0.3,
    0.181,
    (az + bz) / 2 + ((bx - ax) / len) * 0.3,
  ).project(cam);
  await page.mouse.click(
    box.x + ((projected.x + 1) * box.width) / 2,
    box.y + ((1 - projected.y) * box.height) / 2,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("kings-road.game.v1")!).walls[0],
      ),
    )
    .toBe(1);
  const army = createGame("Army", 7);
  army.turn = "Army";
  army.phase = "move";
  army.units = [
    { id: 1, node: 1 },
    { id: 2, node: 1 },
  ];
  await page.locator("input[type=file]").setInputFiles({
    name: "army.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(army)),
  });
  await expect(page.locator(".locations button").nth(1)).toBeEnabled();
  await expect(page.locator(".locations button").nth(2)).toBeDisabled();
  await page.locator(".locations button").nth(1).click();
  await expect(page.locator(".locations button").nth(2)).toBeEnabled();
  await page.screenshot({
    path: testInfo.outputPath("mobile-army-targets.png"),
    fullPage: true,
  });
  await page.locator(".locations button").nth(2).click();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("kings-road.game.v1")!).units.every(
        (u: { node: number }) => u.node === 2,
      ),
    ),
  ).toBe(true);
  await expect(page.locator(".table-area .roll-button")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
