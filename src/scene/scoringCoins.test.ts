import { expect, it } from "vitest";
import { act, createGame } from "../game/engine";
import {
  COIN_COLLECT_MS,
  endTime,
  landingTime,
  MOTION_MS,
  reconcilePieces,
  samplePiece,
  type Piece,
} from "./motion";

function runnerGame(budget = 8) {
  const game = createGame("Runner", 17);
  game.turn = "Runner";
  game.phase = "run";
  game.budget = budget;
  return game;
}
const coins = (pieces: Piece[]) => pieces.filter((p) => p.kind === "coin");
const coinAt = (pieces: Piece[], node: number) =>
  coins(pieces).find((p) => p.node === node)!;

it("collects each coin at its own queued arrival, even after a rapidly queued turn has ended", () => {
  let g = runnerGame(3);
  let pieces = reconcilePieces([], g);
  for (const [node, at] of [
    [1, 100],
    [2, 200],
    [3, 300],
  ]) {
    const next = act(g, { type: "run", node });
    pieces = reconcilePieces(pieces, next, g, at);
    g = next;
  }
  expect(g.turn).toBe("Builder");
  const runner = pieces.find((p) => p.kind === "runner")!;
  expect(coins(pieces)).toHaveLength(5);
  for (const [i, node] of [1, 2, 3].entries()) {
    const coin = coinAt(pieces, node);
    const arrival = landingTime(runner.steps[i]);
    expect(coin.steps[0].start).toBe(arrival);
    expect(samplePiece(coin, arrival - 1).opacity).toBe(1);
    expect(
      samplePiece(coin, arrival + COIN_COLLECT_MS / 2).opacity,
    ).toBeCloseTo(0.5);
    expect(samplePiece(coin, arrival + COIN_COLLECT_MS).opacity).toBe(0);
    const pose = samplePiece(runner, arrival);
    expect(pose.position[0]).toBeCloseTo(coin.at[0]);
    expect(pose.position[2]).toBeCloseTo(coin.at[2] - 0.03);
    expect(pose.position[1]).toBeCloseTo(0.175);
  }
  // Still-unvisited locations clear only after the last queued move has settled.
  for (const node of [4, 5]) {
    const coin = coinAt(pieces, node);
    expect(coin.steps[0].start).toBe(endTime(runner));
    expect(samplePiece(coin, endTime(runner) - 1).opacity).toBe(1);
  }
});

it("keeps unvisited coins for the whole Runner turn and clears them on an early stop", () => {
  const g = runnerGame();
  const moved = act(g, { type: "run", node: 1 });
  const pieces = reconcilePieces(reconcilePieces([], g), moved, g, 100);
  expect(coinAt(pieces, 2).gone).toBeUndefined();
  expect(samplePiece(coinAt(pieces, 2), 10000).opacity).toBe(1);
  const ended = act(moved, { type: "end" });
  const queuedEnd = reconcilePieces(pieces, ended, moved, 200);
  expect(coinAt(queuedEnd, 1).steps[0].start).toBe(100 + MOTION_MS * 0.9);
  expect(coinAt(queuedEnd, 2).steps[0].start).toBe(100 + MOTION_MS);
  const laterEnd = reconcilePieces(pieces, ended, moved, 10000);
  expect(coinAt(laterEnd, 2).steps[0].start).toBe(10000);
});

it("keeps the winning coin until the Runner lands", () => {
  const g = runnerGame();
  g.scores.Runner = 14;
  const won = act(g, { type: "run", node: 1 });
  const pieces = reconcilePieces(reconcilePieces([], g), won, g, 100);
  expect(won.winner).toBe("Runner");
  expect(samplePiece(coinAt(pieces, 1), 500).opacity).toBe(1);
  expect(coinAt(pieces, 1).steps[0].start).toBe(100 + MOTION_MS * 0.9);
});

it("never recreates collected coins or a coin for the starting location on backtracking", () => {
  let g = runnerGame();
  let pieces = reconcilePieces([], g);
  for (const [node, at] of [
    [1, 100],
    [0, 200],
    [1, 300],
  ]) {
    const next = act(g, { type: "run", node });
    pieces = reconcilePieces(pieces, next, g, at);
    g = next;
  }
  expect(coins(pieces).filter((p) => p.node === 0)).toHaveLength(0);
  expect(coins(pieces).filter((p) => p.node === 1)).toHaveLength(1);
  expect(coinAt(pieces, 1).steps[0].start).toBe(100 + MOTION_MS * 0.9);
  expect(samplePiece(coinAt(pieces, 1), 2000).opacity).toBe(0);
});

it("starts a new set after the previous turn's remaining visual coins clear", () => {
  const g = runnerGame(1);
  const ended = act(g, { type: "run", node: 1 });
  const pieces = reconcilePieces(reconcilePieces([], g), ended, g, 100);
  const nextTurn = {
    ...ended,
    turn: "Runner" as const,
    phase: "roll" as const,
    visited: [1],
    scored: [],
  };
  const overlap = reconcilePieces(pieces, nextTurn, ended, 200);
  const fresh = coins(overlap).filter((p) => !p.gone);
  expect(fresh.map((p) => p.node)).toEqual([0, 2, 3, 4, 5]);
  const clearAt = 100 + MOTION_MS + COIN_COLLECT_MS;
  expect(fresh.every((p) => samplePiece(p, clearAt - 1).opacity === 0)).toBe(
    true,
  );
  expect(fresh.every((p) => samplePiece(p, clearAt).opacity === 1)).toBe(true);
  expect(
    coins(overlap)
      .filter((p) => p.gone)
      .every((p) => samplePiece(p, clearAt).opacity === 0),
  ).toBe(true);
});

it("reloads and replacement games restore current coins without replaying old collections", () => {
  const g = runnerGame();
  const moved = act(g, { type: "run", node: 1 });
  const pending = reconcilePieces(reconcilePieces([], g), moved, g, 100);
  const restored = reconcilePieces([], JSON.parse(JSON.stringify(moved)));
  expect(coins(restored).map((p) => p.node)).toEqual([2, 3, 4, 5]);
  expect(coins(restored).every((p) => !p.steps.length && !p.gone)).toBe(true);
  const fresh = runnerGame();
  expect(
    coins(reconcilePieces(pending, fresh, moved, 200)).map((p) => p.node),
  ).toEqual([1, 2, 3, 4, 5]);
  const ended = act(moved, { type: "end" });
  expect(coins(reconcilePieces([], ended))).toHaveLength(0);
});

it("reduced motion settles the Runner and removes collected coins immediately", () => {
  const g = runnerGame();
  const moved = act(g, { type: "run", node: 1 });
  const pieces = reconcilePieces(reconcilePieces([], g), moved, g, 100);
  expect(samplePiece(coinAt(pieces, 1), Infinity).opacity).toBe(0);
  expect(samplePiece(coinAt(pieces, 2), Infinity).opacity).toBe(1);
  const runner = pieces.find((p) => p.kind === "runner")!;
  expect(samplePiece(runner, Infinity).position).toEqual(runner.at);
});
