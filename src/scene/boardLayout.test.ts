import { it, expect } from "vitest";
import { canBuild, nodeSelectable, pickRoad, positions } from "./boardLayout";
import { createGame, roads } from "../game/engine";
it("wide road taps select only the nearest edge and avoid junctions", () => {
  roads.forEach(([a, b], i) => {
    const [ax, az] = positions[a],
      [bx, bz] = positions[b],
      len = Math.hypot(bx - ax, bz - az);
    const x = (ax + bx) / 2,
      z = (az + bz) / 2;
    expect(pickRoad(x, z)).toBe(i);
    expect(
      pickRoad(x - ((bz - az) / len) * 0.3, z + ((bx - ax) / len) * 0.3),
    ).toBe(i);
  });
  positions.forEach(([x, z]) => expect(pickRoad(x, z)).toBeNull());
});
it("only available roads illuminate for the human Builder", () => {
  const g = createGame("Builder");
  g.phase = "build";
  g.budget = 2;
  expect(canBuild(g, 0)).toBe(true);
  g.walls[0] = 5;
  expect(canBuild(g, 0)).toBe(false);
  g.human = "Army";
  expect(canBuild(g, 1)).toBe(false);
});
it("Army node indicators distinguish deployment, ready origins, and reachable destinations", () => {
  const g = createGame("Army");
  g.turn = "Army";
  g.phase = "move";
  g.units = [{ id: 1, node: 1 }];
  expect(nodeSelectable(g, 1, null)).toBe(true);
  expect(nodeSelectable(g, 2, null)).toBe(false);
  expect(nodeSelectable(g, 2, 1)).toBe(true);
  expect(nodeSelectable(g, 4, 1)).toBe(false);
  g.phase = "deploy";
  expect(nodeSelectable(g, g.runner, null)).toBe(false);
  expect(nodeSelectable(g, 5, null)).toBe(false);
  expect(nodeSelectable(g, 2, null)).toBe(true);
});
it("Runner targets include the movement point needed to capture a soldier", () => {
  const g = createGame("Runner");
  g.turn = "Runner";
  g.phase = "run";
  g.budget = 1;
  g.units = [{ id: 1, node: 1 }];
  expect(nodeSelectable(g, 1, null)).toBe(false);
  expect(nodeSelectable(g, 4, null)).toBe(true);
  g.budget = 2;
  expect(nodeSelectable(g, 1, null)).toBe(true);
  g.walls[0] = 1;
  expect(nodeSelectable(g, 1, null)).toBe(false);
  g.budget = 3;
  expect(nodeSelectable(g, 1, null)).toBe(true);
});
