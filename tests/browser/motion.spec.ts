import { test, expect, type Page } from "@playwright/test";
import { createGame } from "../../src/game/engine";
import { resumeGame } from "./fixtures";

// Inspect the actual Three scene through the already-loaded development renderer.
// This requires no test API or extra data in the production application.
async function visibleCoins(page: Page, rendererURL: string) {
  return page.evaluate(async (url) => {
    const fiber = await import(url);
    const root: any = [...fiber._roots.values()][0];
    const scene = root?.store.getState().scene;
    const coins: { node: number; opacity: number }[] = [];
    scene?.traverse((object: any) => {
      if (object.name.startsWith("scoring-coin-") && object.visible)
        coins.push({
          node: Number(object.name.slice("scoring-coin-".length)),
          opacity: object.children[0].material.opacity,
        });
    });
    return coins.sort((a, b) => a.node - b.node);
  }, rendererURL);
}

test("queued Runner collections follow the rendered piece after the next turn begins", async ({
  page,
}, testInfo) => {
  const g = createGame("Runner", 17);
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 3;
  await resumeGame(page, g);
  // Capture the module URL before the test clock replaces performance APIs.
  const rendererURL = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((name) => name.includes("@react-three_fiber.js")),
  );
  expect(rendererURL).toBeTruthy();
  const coins = () => visibleCoins(page, rendererURL!);
  await expect
    .poll(coins)
    .toEqual([1, 2, 3, 4, 5].map((node) => ({ node, opacity: 1 })));
  await page.clock.install();
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  for (const node of [1, 2, 3]) {
    await page.locator(".locations button").nth(node).click();
    await page.clock.runFor(100);
  }
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("kings-road.game.v1")!).turn,
    ),
  ).toBe("Builder");
  expect(await coins()).toEqual(
    [1, 2, 3, 4, 5].map((node) => ({ node, opacity: 1 })),
  );
  await page.screenshot({
    path: testInfo.outputPath("coins-before-arrival.png"),
  });
  await page.clock.runFor(700); // 1 second from the first command: only the first coin is gone.
  expect((await coins()).map((coin) => coin.node)).toEqual([2, 3, 4, 5]);
  await page.clock.runFor(700);
  expect((await coins()).map((coin) => coin.node)).toEqual([3, 4, 5]);
  await page.screenshot({
    path: testInfo.outputPath("coins-before-last-arrival.png"),
  });
  await page.clock.runFor(800);
  expect(await coins()).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("coins-turn-finished.png"),
  });
});

test("Army can hold remaining soldiers from the tabletop on mobile", async ({
  page,
}, testInfo) => {
  const g = createGame("Army", 17);
  g.turn = "Army";
  g.phase = "move";
  g.units = [
    { id: 1, node: 1 },
    { id: 2, node: 1 },
    { id: 3, node: 3 },
  ];
  g.nextId = 4;
  await resumeGame(page, g);
  const ready = page.getByRole("status", { name: "Army remaining actions" });
  const hold = page.getByRole("button", { name: "Hold remaining soldiers" });
  await expect(ready.locator("b")).toHaveText("3");
  await expect(ready).toContainText("Soldiers ready");
  expect(await hold.evaluate((el) => !!el.closest(".table-controls"))).toBe(
    true,
  );
  await page.locator(".locations button").nth(1).click();
  await page.locator(".locations button").nth(2).click();
  await expect(ready.locator("b")).toHaveText("1");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(hold).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath("army-hold-mobile.png"),
    fullPage: true,
  });
  await hold.click();
  await expect(hold).toHaveCount(0);
  await expect(page.locator(".table-area .board-roll")).toBeVisible();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("kings-road.game.v1")!),
  );
  expect(state.phase).toBe("roll");
  expect(state.units).toEqual([
    { id: 1, node: 2 },
    { id: 2, node: 2 },
    { id: 3, node: 3 },
  ]);
});
