import { aiAction } from "./ai";
import { describe, it, expect } from "vitest";
import { act, createGame, roads } from "./engine";
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
  it("charges two points per wall and kills only one soldier without Builder points", () => {
    const g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 5;
    g.walls[0] = 2;
    g.units = [
      { id: 1, node: 1 },
      { id: 2, node: 1 },
    ];
    const n = act(g, { type: "run", node: 1 });
    expect(n.budget).toBe(1);
    expect(n.units).toHaveLength(1);
    expect(n.walls[0]).toBe(0);
    expect(n.scores).toEqual({ Builder: 0, Army: 0, Runner: 1 });
  });
  it("scores a return to the initial space only once per circuit", () => {
    let g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 8;
    for (const node of [1, 0, 1, 0]) g = act(g, { type: "run", node });
    expect(g.scores.Runner).toBe(2);
  });
  it("resets exploration after all six locations while retaining current location", () => {
    let g = createGame("Runner");
    g.turn = "Runner";
    g.phase = "run";
    g.budget = 8;
    for (const node of [1, 2, 3, 4, 5]) g = act(g, { type: "run", node });
    expect(g.visited).toEqual([5]);
    expect(g.scored).toEqual([5]);
    g = act(g, { type: "run", node: 0 });
    expect(g.scores.Runner).toBe(6);
  });
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
