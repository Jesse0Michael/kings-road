import { expect, it } from "vitest";
import { act, createGame } from "../game/engine";
import { reconcilePieces, sampleMotion, wallLocation } from "./motion";
it("restores existing pieces at rest and drops only newly placed pieces", () => {
  const g = createGame("Builder");
  g.phase = "build";
  g.budget = 2;
  const old = reconcilePieces([], g);
  expect(old.every((p) => p.motion === "idle")).toBe(true);
  const next = act(g, { type: "wall", road: 0 });
  const pieces = reconcilePieces(old, next, g);
  const wall = pieces.find((p) => p.kind === "wall")!;
  expect(wall.motion).toBe("place");
  expect(sampleMotion(wall, 0).position[1]).toBeGreaterThan(wall.at[1]);
  expect(sampleMotion(wall, 0.7).rotation[0]).not.toBe(0);
  expect(sampleMotion(wall, 1).position).toEqual(wall.at);
});
it("keeps group identities and moves from their original slots with lift and rocking", () => {
  const g = createGame("Army");
  g.turn = "Army";
  g.phase = "move";
  g.units = [
    { id: 1, node: 0 },
    { id: 2, node: 0 },
  ];
  const old = reconcilePieces([], g),
    next = act(g, { type: "march", unit: 1, node: 1 });
  const pieces = reconcilePieces(old, next, g);
  for (const id of ["army-1", "army-2"]) {
    const p = pieces.find((p) => p.id === id)!;
    expect(p.motion).toBe("move");
    expect(p.from).toEqual(old.find((p) => p.id === id)!.at);
    expect(sampleMotion(p, 0.5).position[1]).toBeGreaterThan(p.at[1]);
    expect(sampleMotion(p, 0.1).rotation[0]).not.toBe(0);
    expect(sampleMotion(p, 1).position).toEqual(p.at);
  }
});
it("retains destroyed walls and casualties until presentation completes", () => {
  const g = createGame("Army");
  g.turn = "Army";
  g.phase = "move";
  g.units = [
    { id: 1, node: 0 },
    { id: 2, node: 0 },
  ];
  g.walls[5] = 1;
  const pieces = reconcilePieces(
    reconcilePieces([], g),
    act(g, { type: "march", unit: 1, node: 5 }),
    g,
  );
  expect(pieces.find((p) => p.id === "wall-5-0")?.gone).toBe(true);
  expect(pieces.find((p) => p.id === "army-1")?.at).toEqual(wallLocation(5, 2));
  expect(pieces.find((p) => p.id === "army-2")?.at).toEqual([0, 0.19, 0]);
  expect(
    sampleMotion(
      pieces.find((p) => p.id === "army-1")!,
      1,
    ).opacity,
  ).toBe(0);
});
it("does not shuffle surviving soldiers when their neighbor is removed", () => {
  const g = createGame("Runner");
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 8;
  g.units = [
    { id: 1, node: 1 },
    { id: 2, node: 1 },
  ];
  const old = reconcilePieces([], g);
  const next = reconcilePieces(old, act(g, { type: "run", node: 1 }), g);
  expect(next.find((p) => p.id === "army-2")!.at).toEqual(
    old.find((p) => p.id === "army-2")!.at,
  );
  expect(next.find((p) => p.id === "runner")!.motion).toBe("move");
});
it("does not animate an old game into a newly imported game", () => {
  const g = createGame("Army");
  g.units = [{ id: 1, node: 0 }];
  const fresh = createGame("Runner");
  const pieces = reconcilePieces(reconcilePieces([], g), fresh, g);
  expect(pieces).toHaveLength(1);
  expect(pieces[0].motion).toBe("idle");
});
it("Runner kills remove soldiers at their node, even when a wall on the approach is destroyed", () => {
  const g = createGame("Runner");
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 8;
  g.walls[0] = 1;
  g.units = [{ id: 1, node: 1 }];
  const old = reconcilePieces([], g);
  const pieces = reconcilePieces(old, act(g, { type: "run", node: 1 }), g);
  expect(pieces.find((p) => p.id === "army-1")?.at).toEqual(
    old.find((p) => p.id === "army-1")?.at,
  );
});
