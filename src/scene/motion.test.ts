import { expect, it } from "vitest";
import { act, createGame } from "../game/engine";
import {
  reconcilePieces,
  samplePiece,
  MOTION_MS,
  wallLocation,
  endTime,
} from "./motion";
it("drops new placements independently while restored pieces remain at rest", () => {
  const g = createGame("Builder");
  g.phase = "build";
  g.budget = 3;
  const old = reconcilePieces([], g);
  expect(old.every((p) => !p.steps.length)).toBe(true);
  const a = act(g, { type: "wall", road: 0 }),
    b = act(a, { type: "wall", road: 1 });
  const first = reconcilePieces(old, a, g, 100),
    both = reconcilePieces(first, b, a, 250);
  const w1 = both.find((p) => p.id === "wall-0-0")!,
    w2 = both.find((p) => p.id === "wall-1-0")!;
  expect(w1.steps[0].start).toBe(100);
  expect(w2.steps[0].start).toBe(250);
  expect(samplePiece(w1, 300).position[1]).toBeGreaterThan(w1.at[1]);
  expect(samplePiece(w2, 300).position[1]).toBeGreaterThan(w2.at[1]);
});
it("queues rapid Runner paths without teleporting and delays capture to actual arrival", () => {
  const g = createGame("Runner");
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 8;
  g.units = [{ id: 1, node: 2 }];
  const old = reconcilePieces([], g),
    a = act(g, { type: "run", node: 1 }),
    b = act(a, { type: "run", node: 2 });
  const ps = reconcilePieces(reconcilePieces(old, a, g, 100), b, a, 220),
    r = ps.find((p) => p.id === "runner")!,
    victim = ps.find((p) => p.id === "army-1")!;
  expect(r.steps).toHaveLength(2);
  expect(r.steps[1].start).toBe(100 + MOTION_MS);
  expect(samplePiece(r, 250).position[0]).not.toBe(r.at[0]);
  expect(samplePiece(victim, 100 + MOTION_MS).opacity).toBe(1);
  expect(victim.steps.at(-1)!.start).toBeCloseTo(100 + MOTION_MS * 1.84);
  expect(samplePiece(victim, endTime(victim)).opacity).toBe(0);
});
it("keeps stable identities in group movement and reserves stationary slots", () => {
  const g = createGame("Army");
  g.turn = "Army";
  g.phase = "move";
  g.units = [
    { id: 1, node: 0 },
    { id: 2, node: 0 },
    { id: 3, node: 1 },
  ];
  const old = reconcilePieces([], g),
    ps = reconcilePieces(
      old,
      act(g, { type: "march", unit: 1, node: 1 }),
      g,
      100,
    );
  for (const id of ["army-1", "army-2"]) {
    const p = ps.find((p) => p.id === id)!;
    expect(p.steps[0].from).toEqual(old.find((v) => v.id === id)!.at);
    expect(samplePiece(p, 100 + MOTION_MS * 0.5).position[1]).toBeGreaterThan(
      p.at[1],
    );
  }
  expect(ps.find((p) => p.id === "army-3")!.at).toEqual(
    old.find((p) => p.id === "army-3")!.at,
  );
});
it("distinguishes wall sacrifices from scoring survivors in the same group", () => {
  const g = createGame("Army");
  g.turn = "Army";
  g.phase = "move";
  g.units = [
    { id: 1, node: 0 },
    { id: 2, node: 0 },
  ];
  g.walls[5] = 1;
  const ps = reconcilePieces(
    reconcilePieces([], g),
    act(g, { type: "march", unit: 1, node: 5 }),
    g,
    100,
  );
  expect(ps.find((p) => p.id === "army-1")!.at).toEqual(wallLocation(5, 0));
  expect(ps.find((p) => p.id === "army-2")!.at).toEqual([0, 0.175, 0]);
  expect(
    samplePiece(
      ps.find((p) => p.kind === "wall")!,
      100,
    ).breaking,
  ).toBe(0);
});
it("a rebuilt wall can coexist with the old wall debris without sharing its identity", () => {
  const g = createGame("Runner");
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 8;
  g.walls[0] = 1;
  const a = act(g, { type: "run", node: 1 }),
    old = reconcilePieces(reconcilePieces([], g), a, g, 100);
  const b = structuredClone(a);
  b.walls[0] = 1;
  const ps = reconcilePieces(old, b, a, 200);
  const walls = ps.filter((p) => p.id === "wall-0-0");
  expect(walls).toHaveLength(2);
  expect(walls[0].uid).not.toBe(walls[1].uid);
});
it("new games restore without replaying movement from the old game", () => {
  const g = createGame("Army"),
    fresh = createGame("Runner");
  g.units = [{ id: 1, node: 0 }];
  const ps = reconcilePieces(reconcilePieces([], g), fresh, g, 500);
  expect(ps).toHaveLength(1);
  expect(ps[0].steps).toHaveLength(0);
});
