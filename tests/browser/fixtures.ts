import type { Page } from "@playwright/test";
import type { Game } from "../../src/game/engine";

/** Seed browser storage, then use the header's Return to table action. */
export async function resumeGame(page: Page, game: Game) {
  await page.goto("/");
  await page.getByRole("heading", { name: /Every road/ }).waitFor();
  await page.evaluate(
    (game) => localStorage.setItem("kings-road.game.v1", JSON.stringify(game)),
    game,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Return to table", exact: true })
    .click();
}
