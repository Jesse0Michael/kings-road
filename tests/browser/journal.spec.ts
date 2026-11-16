import { expect, test } from "@playwright/test";
import { createGame } from "../../src/game/engine";
import { readGame, resumeGame, tapNode, waitForBoard } from "./fixtures";

test("board-only Army actions record combat and consolidated deployments, then survive reload", async ({
  page,
}, testInfo) => {
  const game = createGame("Army", 17);
  game.round = 2;
  game.turn = "Army";
  game.phase = "move";
  game.units = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, node: 1 }));
  game.nextId = 6;
  game.walls[6] = 2;
  game.log = [{ kind: "build", round: 2, count: 3 }];
  await resumeGame(page, game);
  const entries = page
    .getByRole("list", { name: "Game events" })
    .locator("li p");
  await expect(page.locator("aside button")).toHaveCount(0);
  await tapNode(page, 1);
  await tapNode(page, 5);
  await expect(entries.first()).toHaveText(
    "Army advanced II → Castle; destroyed 2 walls, sacrificed 2 soldiers, 3 soldiers reached the castle.",
  );
  expect((await readGame(page)).scores).toEqual({
    Builder: 2,
    Army: 3,
    Runner: 0,
  });
  await page.getByRole("button", { name: "Roll", exact: true }).click();
  await expect.poll(async () => (await readGame(page)).phase).toBe("deploy");
  await tapNode(page, 1);
  await tapNode(page, 2);
  await expect(entries).toHaveText([
    "Army deployed 2 soldiers.",
    "Army advanced II → Castle; destroyed 2 walls, sacrificed 2 soldiers, 3 soldiers reached the castle.",
    "Builder raised 3 walls.",
  ]);
  const saved = await readGame(page);
  await page.reload();
  await page
    .getByRole("button", { name: "Return to table", exact: true })
    .click();
  await waitForBoard(page);
  expect(await readGame(page)).toEqual(saved);
  await expect(entries).toHaveCount(3);
  await expect(entries.first()).toHaveText("Army deployed 2 soldiers.");
  await expect(page.locator("aside button")).toHaveCount(0);
  await page.screenshot({
    path: testInfo.outputPath("board-event-log.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath("board-event-log-mobile.png"),
    fullPage: true,
  });
});
