import { beforeEach, expect, it, vi } from "vitest";
import { act, createGame, runnerCanScore } from "../game/engine";
import { history, loadGame, save, validGame } from "./index";
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
});
it("round trips the whole game including deterministic random state", () => {
  const g = createGame("Runner", 99);
  save(g);
  expect(loadGame()).toEqual(g);
});
it("does not duplicate completed results on repeated saves", () => {
  const g = createGame("Army");
  g.winner = "Army";
  g.scores.Army = 15;
  save(g);
  save(g);
  expect(history()).toHaveLength(1);
  expect(history()[0].scores.Army).toBe(15);
});
it("recovers from corrupt or incompatible storage", () => {
  localStorage.setItem("kings-road.game.v1", "broken");
  expect(loadGame()).toBeNull();
  expect(validGame({ version: 2 })).toBe(false);
  const g = createGame("Runner");
  g.walls[0] = -1;
  expect(validGame(g)).toBe(false);
});
it("resuming preserves the excluded Runner start and collected coins", () => {
  let g = createGame("Runner", 99);
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 8;
  g = act(g, { type: "run", node: 1 });
  save(g);
  const restored = loadGame()!;
  expect(runnerCanScore(restored, 0)).toBe(false);
  expect(runnerCanScore(restored, 1)).toBe(false);
  expect(runnerCanScore(restored, 2)).toBe(true);
  expect(act(restored, { type: "run", node: 0 }).scores.Runner).toBe(1);
});
