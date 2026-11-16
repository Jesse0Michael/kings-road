import { expect, type Page } from "@playwright/test";
import { roads } from "../../src/game/engine";
import type { Game } from "../../src/game/engine";
import { positions } from "../../src/scene/boardLayout";
const rendererURLs = new WeakMap<Page, string>();

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
  await waitForBoard(page);
}

export async function readGame(page: Page): Promise<Game> {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("kings-road.game.v1")!),
  );
}

export async function waitForBoard(page: Page) {
  await expect(page.locator("canvas")).toBeVisible();
  const url = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .map((r) => r.name)
      .find((name) => name.includes("@react-three_fiber.js")),
  );
  expect(url).toBeTruthy();
  rendererURLs.set(page, url!);
  await page.waitForFunction(async (url) => {
    const fiber = await import(url!);
    const root = fiber._roots.get(document.querySelector("canvas"));
    if (!root) return false;
    const state = root.store.getState();
    if (
      !state.internal.active ||
      !state.events.connected ||
      state.gl.info.render.calls === 0
    )
      return false;
    const nodes = state.internal.interaction.filter(
      (object: any) =>
        object.geometry?.type === "CircleGeometry" &&
        object.geometry.parameters.radius === 0.66,
    );
    // Wait for the rendered board to be pickable, including its node matrices.
    // Loading textures and compiling the scene can span several browser frames.
    return (
      nodes.length === 6 &&
      nodes.every((object: any) => {
        const point = object.parent.position.clone().project(state.camera);
        const ray = new state.raycaster.constructor();
        ray.setFromCamera(point, state.camera);
        return ray.intersectObject(object).length > 0;
      })
    );
  }, url);
  // Let Chromium present the first WebGL frame before testing pointer input.
  await page.locator("canvas").screenshot();
}

// Project real board coordinates and send real pointer clicks. No DOM action
// buttons or direct dispatch shortcuts are used by the gameplay tests.
export async function tapBoard(page: Page, x: number, y: number, z: number) {
  const point = await page.evaluate(
    async ({ url, x, y, z }) => {
      const fiber = await import(url!);
      const root = fiber._roots.get(document.querySelector("canvas"));
      const camera = root.store.getState().camera;
      const p = camera.position.clone().set(x, y, z).project(camera);
      const box = document.querySelector("canvas")!.getBoundingClientRect();
      return {
        x: box.x + ((p.x + 1) * box.width) / 2,
        y: box.y + ((1 - p.y) * box.height) / 2,
      };
    },
    { url: rendererURLs.get(page), x, y, z },
  );
  await page.mouse.click(point.x, point.y);
}

export async function tapNode(page: Page, node: number) {
  const [x, z] = positions[node];
  await tapBoard(page, x, 0.185, z);
}

export async function tapRoad(page: Page, road: number) {
  const [a, b] = roads[road];
  const [ax, az] = positions[a],
    [bx, bz] = positions[b];
  const length = Math.hypot(bx - ax, bz - az);
  await tapBoard(
    page,
    (ax + bx) / 2 - ((bz - az) / length) * 0.3,
    0.181,
    (az + bz) / 2 + ((bx - ax) / length) * 0.3,
  );
}
