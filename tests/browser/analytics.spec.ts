import { expect, test, type Page } from "@playwright/test";
import { createGame } from "../../src/game/engine";
import { resumeGame, tapNode, waitForBoard } from "./fixtures";

async function events(page: Page, name: string) {
  return page.evaluate(
    (name) =>
      (window.dataLayer ?? [])
        .map((entry) => Array.from(entry as ArrayLike<unknown>))
        .filter((entry) => entry[0] === "event" && entry[1] === name)
        .map((entry) => entry[2] as Record<string, unknown>),
    name,
  );
}

test("queues gameplay for GA4 without Google requests in development; reloads do not repeat wins", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (/google-analytics|googletagmanager/.test(request.url()))
      requests.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Builder 3/ }).click();
  await page.getByRole("button", { name: "Take your seat as Builder" }).click();
  await expect.poll(() => events(page, "game_started")).toHaveLength(1);
  expect((await events(page, "role_selected"))[0]).toMatchObject({
    human_role: "Builder",
    send_to: "G-TEST000001",
  });
  expect(await events(page, "game_resumed")).toHaveLength(0);
  await page.getByRole("button", { name: /KING’S ROAD/ }).click();
  await page.getByRole("button", { name: /Army 2/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Take your seat as Army" }).click();
  await expect.poll(() => events(page, "game_replaced")).toHaveLength(1);

  const g = createGame("Runner", 17);
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 3;
  g.scores.Runner = 14;
  await resumeGame(page, g);
  expect(await events(page, "game_resumed")).toHaveLength(1);
  await tapNode(page, 1);
  await expect.poll(() => events(page, "game_completed")).toHaveLength(1);
  expect((await events(page, "game_completed"))[0]).toMatchObject({
    human_role: "Runner",
    winner_role: "Runner",
    runner_score: 15,
    human_won: 1,
    total_rounds: 1,
  });
  expect((await events(page, "turn_completed"))[0]).toMatchObject({
    coins_collected: 1,
    actor_role: "Runner",
    controller: "human",
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Return to table", exact: true })
    .click();
  await waitForBoard(page);
  expect(await events(page, "game_completed")).toHaveLength(0);
  expect(requests).toEqual([]);
});
