import { aiAction } from "./ai";
import { describe, it, expect } from "vitest";
import {
  act,
  createGame,
  roads,
  runCost,
  runnerCanScore,
  neighbors,
} from "./engine";
describe("King’s Road", () => {
  it("has five perimeter roads and five spokes", () =>
    expect(roads).toHaveLength(10));
  it("rolls repeatably and converts builder points into walls", () => {
    const a = act(createGame("Builder", 42), { type: "roll" });
    const b = act(createGame("Builder", 42), { type: "roll" });
    expect(a.dice).toEqual(b.dice);
    expect(a.budget).toBe(Math.floor(a.dice.reduce((x, y) => x + y, 0) / 2));
  });
  it("awards the Builder for a sacrifice and removes exactly one wall", () => {
    const g = createGame("Army");
    g.turn = "Army";
    g.phase = "move";
    g.units = [{ id: 1, node: 0 }];
    g.walls[5] = 3;
    const n = act(g, { type: "march", unit: 1, node: 5 });
    expect(n.walls[5]).toBe(2);
    expect(n.units).toHaveLength(0);
    expect(n.scores.Builder).toBe(1);
    expect(g.walls[5]).toBe(3);
  });
  it("scores castle arrival and declares immediate victory", () => {
    const g = createGame("Army");
    g.turn = "Army";
    g.phase = "move";
    g.units = [{ id: 1, node: 0 }];
    g.scores.Army = 14;
    expect(act(g, { type: "march", unit: 1, node: 5 }).winner).toBe("Army");
  });
  it("prevents deployment on the Runner", () => {
    const g = createGame("Army");
    g.turn = "Army";
    g.phase = "deploy";
    g.budget = 4;
    expect(act(g, { type: "deploy", node: 0 })).toBe(g);
  });
  it("adds the soldier cost to stacked walls and removes only one soldier without Builder points", () => {
    const g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 4;
    g.walls[0] = 2;
    g.units = [
      { id: 1, node: 1 },
      { id: 2, node: 1 },
    ];
    // Crossing two walls and fighting a soldier costs five. No partial action is allowed.
    expect(act(g, { type: "run", node: 1 })).toBe(g);
    g.budget = 6;
    const n = act(g, { type: "run", node: 1 });
    expect(n.budget).toBe(1);
    expect(n.units).toHaveLength(1);
    expect(n.walls[0]).toBe(0);
    expect(n.scores).toEqual({ Builder: 0, Army: 0, Runner: 1 });
  });
  it("requires two movement points to enter an occupied node, regardless of group size", () => {
    const g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 1;
    g.units = Array.from({ length: 5 }, (_, id) => ({ id, node: 1 }));
    expect(runCost(g, 1)).toBe(2);
    expect(act(g, { type: "run", node: 1 })).toBe(g);
    g.budget = 2;
    const n = act(g, { type: "run", node: 1 });
    expect(n.runner).toBe(1);
    expect(n.units).toHaveLength(4);
    expect(n.scores).toEqual({ Builder: 0, Army: 0, Runner: 1 });
    expect(n.budget).toBe(0);
    expect(n.turn).toBe("Builder");
  });
  it("charges the occupied-node cost again only if a soldier remains on return", () => {
    let g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 8;
    g.units = [{ id: 1, node: 1 }];
    g = act(g, { type: "run", node: 1 });
    expect(g.budget).toBe(6);
    g = act(g, { type: "run", node: 0 });
    expect(runCost(g, 1)).toBe(1);
    g = act(g, { type: "run", node: 1 });
    expect(g.budget).toBe(4);
    expect(g.scores.Runner).toBe(1);
  });
  it("computer Runners choose affordable routes and stop when soldiers block the last point", () => {
    const g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 1;
    g.units = [{ id: 1, node: 1 }];
    g.walls[5] = 1;
    expect(aiAction(g)).toEqual({ type: "run", node: 4 });
    g.units.push({ id: 2, node: 4 });
    expect(aiAction(g)).toEqual({ type: "end" });
  });
  it("computer Runners prefer new points but can cross the excluded start to reach them", () => {
    let g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 4;
    g.runner = 0;
    g.visited = [1, 0];
    g.scored = [0];
    g.scores.Runner = 1;
    expect(aiAction(g)).toEqual({ type: "run", node: 4 });
    // Block the other exits: the start is still a legal route to a fresh location.
    g.walls[4] = g.walls[5] = 3;
    expect(aiAction(g)).toEqual({ type: "run", node: 1 });
    g = act(g, aiAction(g));
    expect(g.scores.Runner).toBe(1);
    expect(aiAction(g)).toEqual({ type: "run", node: 2 });
    expect(act(g, aiAction(g)).scores.Runner).toBe(2);
  });
  it("never scores the starting location or repeated backtracking", () => {
    let g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 8;
    for (const node of [1, 0, 1, 0]) g = act(g, { type: "run", node });
    expect(g.scores.Runner).toBe(1);
    expect(g.scored).toEqual([1]);
  });
  it("never resets visited nodes mid-turn, including a full circuit", () => {
    let g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 8;
    for (const node of [1, 2, 3, 4, 5, 0, 1]) g = act(g, { type: "run", node });
    expect(g.scores.Runner).toBe(5);
    expect(g.visited).toHaveLength(6);
    expect(g.scored).toHaveLength(5);
  });
  it("allows nodes to score again next turn and preserves total scores", () => {
    let g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 4;
    g = act(g, { type: "run", node: 1 });
    g = act(g, { type: "end" });
    g.turn = "Army";
    g.phase = "deploy";
    g.budget = 1;
    g = act(g, { type: "deploy", node: 2 });
    expect(g.turn).toBe("Runner");
    expect(g.scored).toEqual([]);
    g = act(g, { type: "roll" });
    g = act(g, { type: "run", node: 0 });
    expect(g.scores.Runner).toBe(2);
  });
  it("keeps turn exploration after saving and resuming", () => {
    let g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 8;
    g = act(g, { type: "run", node: 1 });
    g = JSON.parse(JSON.stringify(g));
    g = act(g, { type: "run", node: 0 });
    g = act(g, { type: "run", node: 1 });
    expect(g.scores.Runner).toBe(1);
  });
  it.each([0, 1, 2, 3, 4, 5])(
    "excludes starting location %i from coins and scoring",
    (start) => {
      let g = createGame("Runner");
      g.turn = "Runner";
      g.runner = start;
      g = act(g, { type: "roll" });
      g.budget = 8;
      const destination = neighbors(start)[0];
      expect(runnerCanScore(g, start)).toBe(false);
      expect(
        [0, 1, 2, 3, 4, 5].filter((n) => runnerCanScore(g, n)),
      ).toHaveLength(5);
      g = act(g, { type: "run", node: destination });
      expect(runnerCanScore(g, destination)).toBe(false);
      expect(
        [0, 1, 2, 3, 4, 5].filter((n) => runnerCanScore(g, n)),
      ).toHaveLength(4);
      g = act(g, { type: "run", node: start });
      expect(g.scores.Runner).toBe(1);
      expect(runnerCanScore(g, start)).toBe(false);
    },
  );
  it("lets soldiers hold and Runner end early", () => {
    let g = createGame("Army");
    g.turn = "Army";
    g.phase = "move";
    g.units = [{ id: 1, node: 0 }];
    g = act(g, { type: "end" });
    expect(g.phase).toBe("roll");
    expect(g.units[0].node).toBe(0);
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 5;
    expect(act(g, { type: "end" }).turn).toBe("Builder");
  });
  it("completes computer games without illegal-action stalls", () => {
    for (let seed = 1; seed <= 20; seed++) {
      let g = createGame("Builder", seed);
      let steps = 0;
      while (!g.winner && steps++ < 15000) {
        const n = act(g, aiAction(g));
        expect(n).not.toBe(g);
        g = n;
      }
      expect(g.winner).not.toBeNull();
    }
  });
});

describe("capacity and group movement", () => {
  it("limits every road to five walls", () => {
    const g = createGame("Builder");
    g.phase = "build";
    g.budget = 2;
    g.walls[0] = 5;
    expect(act(g, { type: "wall", road: 0 })).toBe(g);
  });
  it("moves a group only into free spaces and leaves excess ready to take another road", () => {
    const g = createGame("Army");
    g.turn = "Army";
    g.phase = "move";
    g.units = [
      ...Array.from({ length: 5 }, (_, i) => ({ id: i + 1, node: 0 })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: i + 6, node: 1 })),
    ];
    const n = act(g, { type: "march", unit: 1, node: 1 });
    expect(n.units.filter((u) => u.node === 1)).toHaveLength(5);
    expect(n.units.filter((u) => u.node === 0)).toHaveLength(3);
    expect(n.moved).toEqual([1, 2]);
    const next = act(n, { type: "march", unit: 3, node: 4 });
    expect(next.units.filter((u) => u.node === 4)).toHaveLength(3);
    expect(next.moved).toEqual([1, 2, 3, 4, 5]);
  });
  it("does not move a soldier twice as part of a second group", () => {
    const g = createGame("Army");
    g.turn = "Army";
    g.phase = "move";
    g.units = [
      { id: 1, node: 0 },
      { id: 2, node: 1 },
    ];
    const n = act(g, { type: "march", unit: 1, node: 1 });
    const next = act(n, { type: "march", unit: 2, node: 2 });
    expect(next.units.find((u) => u.id === 1)?.node).toBe(1);
    expect(next.units.find((u) => u.id === 2)?.node).toBe(2);
  });
  it("clears walls with sacrifices before surviving group members enter the castle", () => {
    const g = createGame("Army");
    g.turn = "Army";
    g.phase = "move";
    g.units = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, node: 0 }));
    g.walls[5] = 2;
    const n = act(g, { type: "march", unit: 1, node: 5 });
    expect(n.scores.Builder).toBe(2);
    expect(n.scores.Army).toBe(3);
    expect(n.units).toHaveLength(0);
    expect(n.walls[5]).toBe(0);
  });
  it("prevents deployment above five and ends recruitment if all eligible nodes are full", () => {
    const g = createGame("Army");
    g.turn = "Army";
    g.phase = "deploy";
    g.budget = 3;
    g.units = [1, 2, 3, 4].flatMap((node) =>
      Array.from({ length: 5 }, (_, i) => ({ id: node * 10 + i, node })),
    );
    expect(act(g, { type: "deploy", node: 1 })).toBe(g);
    g.units.pop();
    g.nextId = 99;
    const n = act(g, { type: "deploy", node: 4 });
    expect(n.turn).toBe("Runner");
    expect(n.units.filter((u) => u.node === 4)).toHaveLength(5);
  });
  it("discards construction when all roads have reached capacity", () => {
    const g = createGame("Builder");
    g.walls.fill(5);
    expect(act(g, { type: "roll" }).turn).toBe("Army");
  });
});
